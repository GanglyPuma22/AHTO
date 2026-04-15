# AHTO

> Test-matrix-driven integration testing across hardware, software, and services.

AHTO is a public v0.1 skill repo for running structured integration tests from a test-matrix.
It is designed to preserve the testing model and durable artifact contracts without bundling private workspace structure, browser-profile setup, device deployment logic, or operator-specific environment details.

## Start here

If you are reviewing the repo for the first time, use this path:

1. [`docs/architecture.md`](docs/architecture.md) — what AHTO is, what belongs in core, and where adapters fit
2. [`docs/packaged-workflow.md`](docs/packaged-workflow.md) — how a public AHTO run flows from a test-matrix source to summary output
3. [`examples/iot-dashboard/README.md`](examples/iot-dashboard/README.md) — one sanitized end-to-end example
4. [`core/emit_defect_record.mjs`](core/emit_defect_record.mjs) and [`core/emit_run_summary.mjs`](core/emit_run_summary.mjs) — the durable core artifact contracts

## Public v0.1 surface

The intended public repo surface is:

| Path | Purpose |
| --- | --- |
| [`SKILL.md`](SKILL.md) | skill entrypoint for tool/agent integration |
| [`docs/`](docs/) | architecture, workflow, and hardware-sync contract docs |
| [`core/`](core/) | stable artifact emitters for defects and run summaries |
| [`adapters/notion/`](adapters/notion/) | test-matrix-source adapter surface |
| [`adapters/cdp/`](adapters/cdp/) | browser/runtime adapter surface |
| [`adapters/hardware-sync/`](adapters/hardware-sync/) | hardware-sync gate interface |
| [`examples/iot-dashboard/`](examples/iot-dashboard/) | sanitized reference profile, test-matrix rows, and expected outputs |

Helpful entry points inside that surface:
- [`docs/hardware-sync-gate.md`](docs/hardware-sync-gate.md)
- [`examples/iot-dashboard/profile.json`](examples/iot-dashboard/profile.json)
- [`examples/iot-dashboard/test-matrix.json`](examples/iot-dashboard/test-matrix.json)
- [`examples/iot-dashboard/expected-artifacts/`](examples/iot-dashboard/expected-artifacts/)

## What AHTO is trying to preserve

AHTO is centered on a workflow, not a single integration:
- preserve the test-matrix-driven orchestration model
- preserve structured defect and run-summary artifacts
- expose adapters instead of hardcoded private integrations
- ship one sanitized reference example
- keep OpenClaw optional rather than making it the repo identity

## Public boundary

For the current v0.1 repo, treat these paths as the canonical review surface:
- `SKILL.md`
- `docs/`
- `core/`
- `adapters/`
- `examples/`

Raw imported source-material directories such as `references/` or `scripts/` are not part of the intended public interface.

## Quick local review flow

A reviewer can inspect the repo without live credentials, browser state, or hardware access:

1. read the architecture and workflow docs
2. inspect the sanitized example profile and test-matrix rows
3. review the adapter READMEs to see what configuration each adapter expects
4. inspect the expected artifacts under `examples/iot-dashboard/expected-artifacts/`
5. inspect the core emitters that define the durable output contracts

## Local no-network verification

Install dependencies once:

```bash
npm install
```

Then run the repo checks:

```bash
npm run check
```

Or run the focused checks individually:

```bash
npm run check:notion-adapter
npm run check:cdp-adapter
npm run check:example-json
npm run check:surface
```

These checks are designed to stay offline.
They verify adapter syntax, example JSON validity, and the intended public package surface without requiring live Notion credentials, a running browser session, or hardware access.

## Publishing note

`package.json` currently keeps `"private": true` on purpose.
That prevents accidental npm publication while the repo surface and skill contract are still being refined.
