from __future__ import annotations

from pathlib import Path

from visa_logger.config import load_config


def test_load_config_parses_instruments_and_measurements(tmp_path: Path):
    config_path = tmp_path / "config.yaml"
    config_path.write_text(
        """
        output: out.csv
        interval: 2.5
        duration: 60
        instruments:
          - name: scope1
            type: oscilloscope
            resource: FAKE::SCOPE::INSTR
            measurements:
              - {label: ch1_vpp, type: vpp, channel: 1}
          - name: psu1
            type: power_supply
            resource: FAKE::PSU::INSTR
            channel: 1
            reset: true
            measurements:
              - {label: rail_v, type: voltage}
              - {label: rail_i, type: current}
        """
    )

    config = load_config(config_path)

    assert config.output == "out.csv"
    assert config.interval == 2.5
    assert config.duration == 60
    assert len(config.instruments) == 2

    scope_spec = config.instruments[0]
    assert scope_spec.name == "scope1"
    assert scope_spec.type == "oscilloscope"
    assert scope_spec.reset is False
    assert scope_spec.measurements[0].label == "ch1_vpp"
    assert scope_spec.measurements[0].channel == 1

    psu_spec = config.instruments[1]
    assert psu_spec.channel == 1
    assert psu_spec.reset is True
    assert [m.label for m in psu_spec.measurements] == ["rail_v", "rail_i"]


def test_load_config_defaults_output_and_interval(tmp_path: Path):
    config_path = tmp_path / "config.yaml"
    config_path.write_text(
        """
        instruments:
          - name: psu1
            type: power_supply
            resource: FAKE::PSU::INSTR
            measurements:
              - {label: v, type: voltage}
        """
    )

    config = load_config(config_path)

    assert config.output == "measurements.csv"
    assert config.interval == 1.0
    assert config.duration is None
