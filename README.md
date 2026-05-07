# AHTO

> Test-matrix-driven integration testing across hardware, software, and services.

AHTO is a public-safe, review-first repo for running structured integration tests from a **test-matrix**.

The repo is now closer to a review-ready **v0.2** shape:
- still public-safe and intentionally not published
- stronger on contracts and orchestration than the earlier v0.1 shell
- still honest about the remaining gap between package quality and live ecosystem maturity

## Start here

If you are reviewing the repo for the first time, use this path:

1. [`docs/architecture.md`](docs/architecture.md) — what AHTO is, what belongs in core, and where adapters fit
2. [`docs/matrix-lifecycle.md`](docs/matrix-lifecycle.md) — working matrices vs promoted checkpoints
3. [`docs/modes-and-classification.md`](docs/modes-and-classification.md) — execution modes and richer row outcomes
4. [`docs/setup-profile.md`](docs/setup-profile.md) — profile/setup posture and missing-input inspection
5. [`docs/review-runner.md`](docs/review-runner.md) — the new offline orchestration lane
6. [`examples/iot-dashboard/README.md`](examples/iot-dashboard/README.md) — sanitized end-to-end example pack

## Public review surface

The intended review surface is:

| Path | Purpose |
| --- | --- |
| [`SKILL.md`](SKILL.md) | skill entrypoint for tool/agent integration |
| [`docs/`](docs/) | architecture, lifecycle, classification, setup, and workflow docs |
| [`core/`](core/) | contracts, emitters, setup assistant, and review runner |
| [`adapters/`](adapters/) | replaceable integration surfaces |
| [`examples/`](examples/) | sanitized reference profiles, matrices, fixtures, and expected artifacts |

Helpful v0.2 entry points inside that surface:
- [`core/contracts.mjs`](core/contracts.mjs)
- [`core/review_runner.mjs`](core/review_runner.mjs)
- [`core/setup_assistant.mjs`](core/setup_assistant.mjs)
- [`core/emit_defect_record.mjs`](core/emit_defect_record.mjs)
- [`core/emit_run_summary.mjs`](core/emit_run_summary.mjs)
- [`examples/iot-dashboard/matrices/checkpoints/smoke-checkpoint-v2026-04-24.json`](examples/iot-dashboard/matrices/checkpoints/smoke-checkpoint-v2026-04-24.json)
- [`examples/iot-dashboard/fixture-results/checkpoint-review.json`](examples/iot-dashboard/fixture-results/checkpoint-review.json)

## What AHTO is trying to preserve

AHTO is centered on a workflow, not a single integration:
- preserve matrix-driven orchestration
- preserve structured defect and run-summary artifacts
- separate working-matrix evolution from checkpoint promotion
- distinguish product defects from matrix/framework/rig/UI-contract issues
- expose adapters instead of hardcoded private integrations
- ship one sanitized reference example without turning it into the only worldview

## What changed in the v0.2 repo shape

Compared to the earlier packaging shell, this repo now includes:
- a reusable contracts module for profile, matrix, lifecycle, mode, and outcome validation
- a setup assistant for lightweight missing-input inspection/prompting
- an offline review runner that validates contracts, executes the hardware gate, consumes fixture outcomes, and emits artifacts
- lifecycle-aware example matrices for both working and checkpoint states
- richer sample outputs that preserve matrix family / revision / checkpoint metadata and row-outcome taxonomy

## Quick local review flow

A reviewer can inspect the repo without live credentials, browser state, or hardware access:

1. read the architecture/lifecycle/classification/setup docs
2. inspect the IoT dashboard profile, working matrix, and checkpoint matrix
3. inspect the fixture results and expected artifacts
4. inspect the core runner/setup/contract surfaces
5. optionally run the offline checks below

## Local no-network verification

Install dependencies once:

```bash
npm install
```

Then run the repo checks:

```bash
npm run check
```

Or run focused checks individually:

```bash
npm run check:notion-adapter
npm run check:cdp-adapter
npm run check:example-json
npm run check:setup-assistant
npm run check:review-runner
npm run check:surface
```

These checks stay offline.
They validate:
- adapter syntax
- example JSON validity
- setup inspection
- the offline review runner
- the intended package surface

## Publishing note

`package.json` keeps `"private": true` on purpose.
That prevents accidental npm publication while the repo shape and contracts are still being refined.

## Current truthfulness note

This repo is materially stronger than the v0.1 scaffold, but it should still be reviewed as:
- **architecture-aligned and review-ready**
- not yet proof of full live multi-adapter runtime maturity
