"""Polls a set of connected instruments on an interval and logs samples to CSV."""

from __future__ import annotations

import csv
import logging
import signal
import time
from datetime import datetime, timezone
from pathlib import Path

import pyvisa

from .config import SessionConfig
from .instruments.base import VisaInstrument
from .instruments.oscilloscope import Oscilloscope
from .instruments.power_supply import PowerSupply
from .instruments.signal_generator import SignalGenerator

logger = logging.getLogger(__name__)

_INSTRUMENT_CLASSES = {
    "oscilloscope": Oscilloscope,
    "power_supply": PowerSupply,
    "signal_generator": SignalGenerator,
}


class _StopFlag:
    """SIGINT handler target; lets a Ctrl+C finish the in-flight sample and flush the file."""

    def __init__(self) -> None:
        self.stop = False

    def request_stop(self, *_args) -> None:
        self.stop = True


def _read_measurement(instrument: VisaInstrument, kind: str, channel: int | None):
    kind = kind.lower()
    if isinstance(instrument, Oscilloscope):
        return instrument.measure(channel or 1, kind)
    if isinstance(instrument, PowerSupply):
        if kind == "voltage":
            return instrument.measure_voltage(channel)
        if kind == "current":
            return instrument.measure_current(channel)
        if kind == "power":
            return instrument.measure_power(channel)
        raise ValueError(f"Unsupported power_supply measurement {kind!r}")
    raise ValueError(f"{type(instrument).__name__} has no readable measurements for logging")


class LoggingSession:
    """Connects every instrument in a SessionConfig and periodically logs measurements to CSV."""

    def __init__(self, config: SessionConfig, resource_manager: pyvisa.ResourceManager | None = None):
        self.config = config
        if resource_manager is not None:
            self._rm = resource_manager
        elif config.backend:
            self._rm = pyvisa.ResourceManager(config.backend)
        else:
            self._rm = pyvisa.ResourceManager()
        self.instruments: dict[str, VisaInstrument] = {}

    def connect_all(self) -> "LoggingSession":
        for spec in self.config.instruments:
            cls = _INSTRUMENT_CLASSES.get(spec.type)
            if cls is None:
                raise ValueError(f"Unknown instrument type {spec.type!r} for {spec.name!r}")
            instrument = cls(spec.resource, resource_manager=self._rm)
            instrument.connect()
            if spec.reset:
                instrument.reset()
            self.instruments[spec.name] = instrument
        return self

    def close_all(self) -> None:
        for instrument in self.instruments.values():
            try:
                instrument.close()
            except Exception:
                logger.exception("Error closing %s", instrument.resource_name)

    def __enter__(self) -> "LoggingSession":
        return self.connect_all()

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close_all()

    def _fieldnames(self) -> list[str]:
        fields = ["timestamp"]
        for spec in self.config.instruments:
            for m in spec.measurements:
                fields.append(m.label)
        return fields

    def sample(self) -> dict:
        """Read one row of measurements from every configured instrument."""
        row: dict = {"timestamp": datetime.now(timezone.utc).isoformat()}
        for spec in self.config.instruments:
            instrument = self.instruments[spec.name]
            for m in spec.measurements:
                channel = m.channel if m.channel is not None else spec.channel
                try:
                    row[m.label] = _read_measurement(instrument, m.type, channel)
                except Exception:
                    logger.exception("Failed to read %s from %s", m.label, spec.name)
                    row[m.label] = ""
        return row

    def run(self, max_samples: int | None = None) -> int:
        """Poll on config.interval, appending one CSV row per sample until stopped.

        Stops after max_samples (if given), after config.duration seconds (if
        given), or on Ctrl+C -- whichever comes first. Returns the number of
        samples logged.
        """
        output_path = Path(self.config.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        is_new = not output_path.exists() or output_path.stat().st_size == 0

        stop_flag = _StopFlag()
        previous_handler = signal.signal(signal.SIGINT, stop_flag.request_stop)

        deadline = time.monotonic() + self.config.duration if self.config.duration else None
        sample_count = 0
        try:
            with output_path.open("a", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=self._fieldnames())
                if is_new:
                    writer.writeheader()
                    f.flush()

                while not stop_flag.stop:
                    start = time.monotonic()
                    row = self.sample()
                    writer.writerow(row)
                    f.flush()
                    sample_count += 1
                    logger.info("Logged sample %d: %s", sample_count, row)

                    if max_samples is not None and sample_count >= max_samples:
                        break
                    if deadline is not None and time.monotonic() >= deadline:
                        break

                    elapsed = time.monotonic() - start
                    remaining = self.config.interval - elapsed
                    if remaining > 0 and not stop_flag.stop:
                        time.sleep(remaining)
        finally:
            signal.signal(signal.SIGINT, previous_handler)

        return sample_count
