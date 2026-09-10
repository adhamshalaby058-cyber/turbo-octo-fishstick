"""Command-line entry point: `visa-logger scan|idn|run`."""

from __future__ import annotations

import argparse
import logging
import sys

import pyvisa

from .config import load_config
from .logger import LoggingSession


def _cmd_scan(args: argparse.Namespace) -> int:
    rm = pyvisa.ResourceManager(args.backend) if args.backend else pyvisa.ResourceManager()
    resources = rm.list_resources()
    if not resources:
        print("No VISA resources found.")
        return 0
    for resource in resources:
        try:
            inst = rm.open_resource(resource)
            inst.timeout = 2000
            idn = inst.query("*IDN?").strip()
            inst.close()
        except Exception as exc:
            idn = f"(could not query *IDN?: {exc})"
        print(f"{resource}\t{idn}")
    return 0


def _cmd_idn(args: argparse.Namespace) -> int:
    rm = pyvisa.ResourceManager(args.backend) if args.backend else pyvisa.ResourceManager()
    inst = rm.open_resource(args.resource)
    inst.timeout = args.timeout
    try:
        print(inst.query("*IDN?").strip())
    finally:
        inst.close()
    return 0


def _cmd_run(args: argparse.Namespace) -> int:
    config = load_config(args.config)
    if args.output:
        config.output = args.output
    if args.backend:
        config.backend = args.backend

    with LoggingSession(config) as session:
        count = session.run(max_samples=args.samples)
    print(f"Logged {count} sample(s) to {config.output}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="visa-logger",
        description="PyVISA-based instrument control and auto-logging tool",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="enable debug logging")
    subparsers = parser.add_subparsers(dest="command", required=True)

    scan = subparsers.add_parser("scan", help="list available VISA resources and their *IDN?")
    scan.add_argument("--backend", help="PyVISA backend, e.g. '@py' or 'path/to/sim.yaml@sim'")
    scan.set_defaults(func=_cmd_scan)

    idn = subparsers.add_parser("idn", help="query *IDN? on a single resource")
    idn.add_argument("resource", help="VISA resource string")
    idn.add_argument("--backend")
    idn.add_argument("--timeout", type=int, default=5000, help="timeout in milliseconds")
    idn.set_defaults(func=_cmd_idn)

    run = subparsers.add_parser("run", help="run an auto-logging session from a YAML config")
    run.add_argument("config", help="path to a session config YAML file")
    run.add_argument("--output", help="override the output CSV path from the config")
    run.add_argument("--backend", help="override the PyVISA backend from the config")
    run.add_argument("--samples", type=int, help="stop after N samples instead of running until Ctrl+C/duration")
    run.set_defaults(func=_cmd_run)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
