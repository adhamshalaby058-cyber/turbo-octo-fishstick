"""Generic SCPI programmable DC power supply control."""

from __future__ import annotations

from .base import VisaInstrument


class PowerSupply(VisaInstrument):
    """Generic single- or multi-channel SCPI power supply.

    Targets the common ``INSTrument:NSELect``/``VOLTage``/``CURRent``/
    ``OUTPut`` command set shared by many bench supplies (Keysight E36xx,
    Rigol DP800, Siglent SPD3303, etc). ``channel`` is optional for
    single-channel supplies.
    """

    def select_channel(self, channel: int) -> None:
        self.write(f"INSTrument:NSELect {channel}")

    def set_voltage(self, volts: float, channel: int | None = None) -> None:
        if channel is not None:
            self.select_channel(channel)
        self.write(f"VOLTage {volts}")

    def set_current(self, amps: float, channel: int | None = None) -> None:
        if channel is not None:
            self.select_channel(channel)
        self.write(f"CURRent {amps}")

    def output(self, enabled: bool, channel: int | None = None) -> None:
        if channel is not None:
            self.select_channel(channel)
        self.write(f"OUTPut {'ON' if enabled else 'OFF'}")

    def measure_voltage(self, channel: int | None = None) -> float:
        if channel is not None:
            self.select_channel(channel)
        return self.query_float("MEASure:VOLTage?")

    def measure_current(self, channel: int | None = None) -> float:
        if channel is not None:
            self.select_channel(channel)
        return self.query_float("MEASure:CURRent?")

    def measure_power(self, channel: int | None = None) -> float:
        # Not all supplies expose MEASure:POWer?, so compute it from V and I.
        return self.measure_voltage(channel) * self.measure_current(channel)
