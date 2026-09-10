"""Thin, testable wrapper around a PyVISA resource."""

from __future__ import annotations

import logging

import pyvisa

logger = logging.getLogger(__name__)


class InstrumentError(RuntimeError):
    """Raised when an instrument reports a SCPI error via SYST:ERR?."""


class VisaInstrument:
    """Base class for a single SCPI instrument reachable over VISA.

    Subclasses add instrument-specific convenience methods; this class only
    owns the connection lifecycle and raw write/query plumbing so it can be
    exercised in tests without a real VISA resource manager (pass one in).
    """

    def __init__(
        self,
        resource_name: str,
        resource_manager: pyvisa.ResourceManager | None = None,
        timeout_ms: int = 5000,
        read_termination: str = "\n",
        write_termination: str = "\n",
    ):
        self.resource_name = resource_name
        self._rm = resource_manager or pyvisa.ResourceManager()
        self._inst = None
        self.timeout_ms = timeout_ms
        self.read_termination = read_termination
        self.write_termination = write_termination

    def connect(self) -> "VisaInstrument":
        self._inst = self._rm.open_resource(self.resource_name)
        self._inst.timeout = self.timeout_ms
        self._inst.read_termination = self.read_termination
        self._inst.write_termination = self.write_termination
        logger.info("Connected to %s (%s)", self.resource_name, self.idn())
        return self

    def close(self) -> None:
        if self._inst is not None:
            self._inst.close()
            self._inst = None

    def __enter__(self) -> "VisaInstrument":
        return self.connect()

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    @property
    def resource(self):
        if self._inst is None:
            raise RuntimeError(f"{self.resource_name} is not connected; call connect() first")
        return self._inst

    def write(self, command: str) -> None:
        logger.debug("%s -> %s", self.resource_name, command)
        self.resource.write(command)

    def query(self, command: str) -> str:
        logger.debug("%s -> %s", self.resource_name, command)
        response = self.resource.query(command).strip()
        logger.debug("%s <- %s", self.resource_name, response)
        return response

    def query_float(self, command: str) -> float:
        return float(self.query(command))

    def idn(self) -> str:
        return self.query("*IDN?")

    def reset(self) -> None:
        self.write("*RST")

    def clear_status(self) -> None:
        self.write("*CLS")

    def check_errors(self) -> list[str]:
        """Drain the SCPI error queue, raising InstrumentError if non-empty."""
        errors: list[str] = []
        for _ in range(50):  # bounded in case a faulty instrument never returns 0
            response = self.query("SYST:ERR?")
            code, _, _message = response.partition(",")
            if code.strip() in ("0", "+0"):
                break
            errors.append(response)
        if errors:
            raise InstrumentError(f"{self.resource_name} reported errors: {errors}")
        return errors
