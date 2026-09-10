# visa-logger

A small PyVISA-based tool for controlling test-bench instruments —
oscilloscopes, DC power supplies, and function/arbitrary waveform
generators — over GPIB/USB/LAN/serial, and auto-logging their measurements
to CSV on a timer.

## Layout

```
visa_logger/
  instruments/
    base.py             VisaInstrument: connect/write/query/*IDN?/error-check
    oscilloscope.py      Oscilloscope: MEASure:<type>? wrapper, run/stop/single
    power_supply.py      PowerSupply: set/measure V, I, P; channel select; output on/off
    signal_generator.py  SignalGenerator: waveform/frequency/amplitude/output
  config.py              YAML session config -> SessionConfig/InstrumentSpec dataclasses
  logger.py              LoggingSession: connects instruments, polls, writes CSV
  cli.py                 `visa-logger scan|idn|run`
examples/
  config.example.yaml    Config template for real hardware
  config.simulate.yaml   Same, wired to the pyvisa-sim demo below
  sim.yaml                pyvisa-sim device definitions (no hardware needed)
tests/                    pytest suite using mocked VISA resources
```

## Install

```bash
pip install -e .
# or just: pip install -r requirements.txt
```

`pyvisa-py` is used as the default backend (works with USB/TCPIP/serial
instruments without needing vendor VISA drivers installed). If you have
NI-VISA or Keysight IO Libraries installed, PyVISA will use that instead
when you omit `--backend`/`backend:`.

## Quick start

```bash
# 1. See what's connected
visa-logger scan

# 2. Sanity-check one instrument
visa-logger idn USB0::0x1AB1::0x0517::DS1ZA000000000::INSTR

# 3. Copy and edit a config, then log
cp examples/config.example.yaml my_session.yaml
visa-logger run my_session.yaml
```

Press Ctrl+C to stop a run early — the current sample finishes, the CSV is
flushed, and the process exits cleanly.

### Try it without hardware

The repo ships a [pyvisa-sim](https://pyvisa-sim.readthedocs.io/) device
file so you can exercise the whole pipeline with no instrument attached:

```bash
pip install -e ".[sim]"
visa-logger run examples/config.simulate.yaml --samples 5
```

## Config file format

```yaml
output: measurements.csv   # CSV path; appended to on each run, header written once
interval: 1.0               # seconds between samples
duration: 300                # optional: stop after N seconds (omit to run until Ctrl+C or --samples)
backend: "@py"                # optional: PyVISA backend string

instruments:
  - name: scope1               # arbitrary id, used only in logs
    type: oscilloscope          # oscilloscope | power_supply | signal_generator
    resource: USB0::...::INSTR  # VISA resource string (see `visa-logger scan`)
    reset: false                 # optional: send *RST after connecting
    measurements:
      - {label: ch1_vpp, type: vpp, channel: 1}
      - {label: ch1_freq, type: freq, channel: 1}

  - name: psu1
    type: power_supply
    resource: TCPIP0::192.168.1.10::INSTR
    channel: 1                   # default channel for measurements below
    measurements:
      - {label: rail_voltage, type: voltage}
      - {label: rail_current, type: current}
      - {label: rail_power, type: power}     # computed as V * I
```

Each row in the CSV is `timestamp` (UTC ISO-8601) followed by one column
per `measurement.label`, in the order instruments/measurements are listed.
A measurement whose query fails is logged as an empty string rather than
aborting the run.

Supported `oscilloscope` measurement `type`s: `vpp`, `vmax`, `vmin`, `vavg`,
`vrms`, `vamp`, `freq`, `period`, `rise_time`, `fall_time`, `pos_width`,
`neg_width`, `duty`.

Supported `power_supply` measurement `type`s: `voltage`, `current`, `power`.

## Programmatic use

The instrument classes work standalone too, e.g. to sweep a supply and
capture a scope reading at each step:

```python
from visa_logger.instruments import Oscilloscope, PowerSupply

with PowerSupply("TCPIP0::192.168.1.10::INSTR") as psu, \
     Oscilloscope("USB0::0x1AB1::0x0517::DS1ZA000000000::INSTR") as scope:
    psu.set_current(0.5)
    for v in (1.0, 2.0, 3.0, 4.0, 5.0):
        psu.set_voltage(v)
        psu.output(True)
        print(v, scope.measure(1, "vpp"))
```

## SCPI dialect note

`Oscilloscope`/`PowerSupply`/`SignalGenerator` target the common SCPI
command forms shared by most modern Keysight/Rigol/Siglent-style
instruments (`MEASure:<TYPE>? CHANnel<n>`, `VOLTage`/`CURRent`/`OUTPut`,
`SOURce<n>:FUNCtion`/`FREQuency`/`VOLTage`). Some vendors deviate — e.g.
Tektronix scopes use `MEASUrement:MEAS<n>:TYPE`/`:VALue?` instead of
`MEASure:VPP?`. Subclass and override the relevant method (e.g.
`_measure_command` on `Oscilloscope`) for instruments that use a different
dialect; `VisaInstrument.write`/`.query` are always available as an escape
hatch for one-off vendor-specific commands.

## Tests

```bash
pip install -e ".[test]"
pytest
```

Tests mock the underlying VISA resource, so no instrument or `pyvisa-sim`
install is required to run them (`pyvisa-sim` is only needed for the
`examples/config.simulate.yaml` demo above).
