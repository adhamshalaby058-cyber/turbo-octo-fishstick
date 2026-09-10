"""Generic SCPI function/arbitrary waveform generator control."""

from __future__ import annotations

from .base import VisaInstrument


class SignalGenerator(VisaInstrument):
    """Generic SCPI function/arbitrary waveform generator (SOURce subsystem)."""

    def set_waveform(self, shape: str, channel: int = 1) -> None:
        self.write(f"SOURce{channel}:FUNCtion {shape.upper()}")

    def set_frequency(self, hertz: float, channel: int = 1) -> None:
        self.write(f"SOURce{channel}:FREQuency {hertz}")

    def set_amplitude(self, volts_pp: float, channel: int = 1) -> None:
        self.write(f"SOURce{channel}:VOLTage {volts_pp}")

    def set_offset(self, volts: float, channel: int = 1) -> None:
        self.write(f"SOURce{channel}:VOLTage:OFFSet {volts}")

    def output(self, enabled: bool, channel: int = 1) -> None:
        self.write(f"OUTPut{channel} {'ON' if enabled else 'OFF'}")
