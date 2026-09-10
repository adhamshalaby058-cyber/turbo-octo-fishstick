"""YAML session configuration for an auto-logging run."""

from __future__ import annotations

import dataclasses
from pathlib import Path
from typing import Any

import yaml


@dataclasses.dataclass
class MeasurementSpec:
    label: str
    type: str
    channel: int | None = None


@dataclasses.dataclass
class InstrumentSpec:
    name: str
    type: str
    resource: str
    measurements: list[MeasurementSpec]
    channel: int | None = None
    reset: bool = False


@dataclasses.dataclass
class SessionConfig:
    output: str
    interval: float
    instruments: list[InstrumentSpec]
    duration: float | None = None
    backend: str | None = None


def load_config(path: str | Path) -> SessionConfig:
    data: dict[str, Any] = yaml.safe_load(Path(path).read_text())
    if not data or "instruments" not in data:
        raise ValueError(f"{path}: config must define at least an 'instruments' list")

    instruments = []
    for inst in data["instruments"]:
        measurements = [MeasurementSpec(**m) for m in inst["measurements"]]
        instruments.append(
            InstrumentSpec(
                name=inst["name"],
                type=inst["type"],
                resource=inst["resource"],
                measurements=measurements,
                channel=inst.get("channel"),
                reset=inst.get("reset", False),
            )
        )

    return SessionConfig(
        output=data.get("output", "measurements.csv"),
        interval=float(data.get("interval", 1.0)),
        duration=data.get("duration"),
        backend=data.get("backend"),
        instruments=instruments,
    )
