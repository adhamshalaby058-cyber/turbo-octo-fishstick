"""Integration-style tests for LoggingSession, with a mocked VISA resource manager."""

from __future__ import annotations

import csv
from pathlib import Path
from unittest.mock import MagicMock

from visa_logger.config import InstrumentSpec, MeasurementSpec, SessionConfig
from visa_logger.logger import LoggingSession

_RESPONSES = {
    "*IDN?": "Simulated,PSU,SN,1.0",
    "MEASure:VOLTage?": "5.0",
    "MEASure:CURRent?": "0.5",
}


def _make_resource_manager():
    fake_resource = MagicMock()
    fake_resource.query.side_effect = lambda cmd: _RESPONSES.get(cmd, "0")

    rm = MagicMock()
    rm.open_resource.return_value = fake_resource
    return rm, fake_resource


def _config(tmp_path: Path, **overrides) -> SessionConfig:
    defaults = dict(
        output=str(tmp_path / "out.csv"),
        interval=0.0,
        instruments=[
            InstrumentSpec(
                name="psu1",
                type="power_supply",
                resource="FAKE::PSU::INSTR",
                measurements=[
                    MeasurementSpec(label="rail_v", type="voltage"),
                    MeasurementSpec(label="rail_i", type="current"),
                ],
            )
        ],
    )
    defaults.update(overrides)
    return SessionConfig(**defaults)


def test_run_writes_header_and_expected_number_of_rows(tmp_path: Path):
    rm, fake_resource = _make_resource_manager()
    config = _config(tmp_path)

    with LoggingSession(config, resource_manager=rm) as session:
        count = session.run(max_samples=3)

    assert count == 3

    with open(config.output, newline="") as f:
        rows = list(csv.DictReader(f))

    assert len(rows) == 3
    assert set(rows[0].keys()) == {"timestamp", "rail_v", "rail_i"}
    assert rows[0]["rail_v"] == "5.0"
    assert rows[0]["rail_i"] == "0.5"


def test_run_appends_without_duplicating_header(tmp_path: Path):
    rm, _ = _make_resource_manager()
    config = _config(tmp_path)

    with LoggingSession(config, resource_manager=rm) as session:
        session.run(max_samples=2)

    rm2, _ = _make_resource_manager()
    with LoggingSession(config, resource_manager=rm2) as session:
        session.run(max_samples=2)

    with open(config.output) as f:
        lines = f.readlines()

    header_lines = [line for line in lines if line.startswith("timestamp")]
    assert len(header_lines) == 1
    assert len(lines) == 1 + 4  # one header + 4 data rows total


def test_sample_records_failed_measurement_as_empty_string(tmp_path: Path):
    rm, fake_resource = _make_resource_manager()
    fake_resource.query.side_effect = lambda cmd: (
        (_ for _ in ()).throw(RuntimeError("bus error")) if cmd == "MEASure:VOLTage?" else "0.5"
    )
    config = _config(tmp_path)

    with LoggingSession(config, resource_manager=rm) as session:
        row = session.sample()

    assert row["rail_v"] == ""
    assert row["rail_i"] == 0.5


def test_connect_all_resets_instruments_when_requested(tmp_path: Path):
    rm, fake_resource = _make_resource_manager()
    config = _config(
        tmp_path,
        instruments=[
            InstrumentSpec(
                name="psu1",
                type="power_supply",
                resource="FAKE::PSU::INSTR",
                measurements=[MeasurementSpec(label="rail_v", type="voltage")],
                reset=True,
            )
        ],
    )

    with LoggingSession(config, resource_manager=rm):
        pass

    fake_resource.write.assert_any_call("*RST")
