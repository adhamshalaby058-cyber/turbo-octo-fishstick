"""Unit tests for the instrument wrappers, using a mocked PyVISA resource."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from visa_logger.instruments.base import InstrumentError, VisaInstrument
from visa_logger.instruments.oscilloscope import Oscilloscope
from visa_logger.instruments.power_supply import PowerSupply
from visa_logger.instruments.signal_generator import SignalGenerator


def make_instrument(cls, responses: dict[str, str] | None = None):
    """Build an instrument whose fake resource answers queries from `responses`."""
    fake_resource = MagicMock()
    fake_resource.query.side_effect = lambda cmd: (responses or {}).get(cmd, "0")

    rm = MagicMock()
    rm.open_resource.return_value = fake_resource

    inst = cls("FAKE::INSTR", resource_manager=rm)
    inst.connect()
    return inst, fake_resource


def test_connect_sets_timeout_and_terminations():
    inst, fake_resource = make_instrument(VisaInstrument, {"*IDN?": "Vendor,Model,SN,1.0"})
    assert fake_resource.timeout == 5000
    assert fake_resource.read_termination == "\n"
    assert fake_resource.write_termination == "\n"


def test_idn_and_query_float():
    inst, fake_resource = make_instrument(VisaInstrument, {"*IDN?": "Vendor,Model,SN,1.0"})
    assert inst.idn() == "Vendor,Model,SN,1.0"

    fake_resource.query.side_effect = lambda cmd: "3.140000E+00"
    assert inst.query_float("ANY?") == pytest.approx(3.14)


def test_check_errors_raises_on_nonzero_code():
    inst, fake_resource = make_instrument(VisaInstrument)
    fake_resource.query.side_effect = ['-113,"Undefined header"', "+0,\"No error\""]

    with pytest.raises(InstrumentError):
        inst.check_errors()


def test_check_errors_passes_when_clean():
    inst, fake_resource = make_instrument(VisaInstrument)
    fake_resource.query.return_value = '+0,"No error"'
    assert inst.check_errors() == []


def test_close_clears_resource_and_is_idempotent():
    inst, fake_resource = make_instrument(VisaInstrument)
    inst.close()
    fake_resource.close.assert_called_once()
    inst.close()  # second call must not raise or re-close
    fake_resource.close.assert_called_once()


def test_resource_property_requires_connect():
    inst = VisaInstrument("FAKE::INSTR", resource_manager=MagicMock())
    with pytest.raises(RuntimeError):
        _ = inst.resource


def test_oscilloscope_measure_builds_expected_command():
    inst, fake_resource = make_instrument(Oscilloscope, {"MEASure:VPP? CHANnel1": "3.3"})
    assert inst.measure(1, "vpp") == pytest.approx(3.3)
    fake_resource.query.assert_called_with("MEASure:VPP? CHANnel1")


def test_oscilloscope_measure_rejects_unknown_type():
    inst, _ = make_instrument(Oscilloscope)
    with pytest.raises(ValueError):
        inst.measure(1, "not_a_real_measurement")


def test_oscilloscope_run_stop_single():
    inst, fake_resource = make_instrument(Oscilloscope)
    inst.run()
    inst.stop()
    inst.single()
    fake_resource.write.assert_any_call(":RUN")
    fake_resource.write.assert_any_call(":STOP")
    fake_resource.write.assert_any_call(":SINGle")


def test_power_supply_set_voltage_selects_channel_first():
    inst, fake_resource = make_instrument(PowerSupply)
    inst.set_voltage(5.0, channel=2)
    fake_resource.write.assert_any_call("INSTrument:NSELect 2")
    fake_resource.write.assert_any_call("VOLTage 5.0")


def test_power_supply_measure_power_multiplies_v_and_i():
    inst, fake_resource = make_instrument(
        PowerSupply, {"MEASure:VOLTage?": "5.0", "MEASure:CURRent?": "0.5"}
    )
    assert inst.measure_power() == pytest.approx(2.5)


def test_power_supply_output_on_off():
    inst, fake_resource = make_instrument(PowerSupply)
    inst.output(True)
    inst.output(False)
    fake_resource.write.assert_any_call("OUTPut ON")
    fake_resource.write.assert_any_call("OUTPut OFF")


def test_signal_generator_configures_waveform():
    inst, fake_resource = make_instrument(SignalGenerator)
    inst.set_waveform("sine", channel=1)
    inst.set_frequency(1000, channel=1)
    inst.set_amplitude(2.0, channel=1)
    inst.output(True, channel=1)

    fake_resource.write.assert_any_call("SOURce1:FUNCtion SINE")
    fake_resource.write.assert_any_call("SOURce1:FREQuency 1000")
    fake_resource.write.assert_any_call("SOURce1:VOLTage 2.0")
    fake_resource.write.assert_any_call("OUTPut1 ON")
