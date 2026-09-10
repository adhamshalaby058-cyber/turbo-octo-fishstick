"""Generic SCPI oscilloscope control (Keysight/Rigol/Tektronix-style MEASure subsystem)."""

from __future__ import annotations

from .base import VisaInstrument

# Maps a friendly measurement name to the SCPI keyword used by the common
# ``MEASure:<TYPE>?`` subsystem shared by most modern SCPI scopes.
_MEASUREMENT_TYPES = {
    "vpp": "VPP",
    "vmax": "VMAX",
    "vmin": "VMIN",
    "vavg": "VAVerage",
    "vrms": "VRMS",
    "vamp": "VAMPlitude",
    "freq": "FREQuency",
    "period": "PERiod",
    "rise_time": "RISetime",
    "fall_time": "FALLtime",
    "pos_width": "PWIDth",
    "neg_width": "NWIDth",
    "duty": "PDUTycycle",
}


class Oscilloscope(VisaInstrument):
    """Generic SCPI oscilloscope.

    Command dialect varies between vendors (Keysight, Rigol, Siglent and
    Tektronix all diverge slightly). This class targets the common
    ``MEASure:<TYPE>? CHANnel<n>`` form; override ``_measure_command`` in a
    vendor-specific subclass if your instrument differs.
    """

    def measure(self, channel: int, kind: str) -> float:
        kind = kind.lower()
        if kind not in _MEASUREMENT_TYPES:
            raise ValueError(f"Unknown measurement type {kind!r}; choose from {sorted(_MEASUREMENT_TYPES)}")
        command = self._measure_command(channel, _MEASUREMENT_TYPES[kind])
        return self.query_float(command)

    def _measure_command(self, channel: int, scpi_type: str) -> str:
        return f"MEASure:{scpi_type}? CHANnel{channel}"

    def set_channel_enabled(self, channel: int, enabled: bool) -> None:
        self.write(f"CHANnel{channel}:DISPlay {'ON' if enabled else 'OFF'}")

    def autoscale(self) -> None:
        self.write(":AUToscale")

    def single(self) -> None:
        self.write(":SINGle")

    def run(self) -> None:
        self.write(":RUN")

    def stop(self) -> None:
        self.write(":STOP")
