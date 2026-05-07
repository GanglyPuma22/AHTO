# AHTO

> Test-matrix-driven integration testing across hardware, software, and services.

AHTO is a matrix-driven testing framework for systems that span more than one layer at a time: UI, backend/services, and hardware or runtime state. Instead of treating each test like an isolated script, AHTO organizes a test pass around structured matrix rows, project profiles, hardware-sync gates, and durable run artifacts.

The repo includes:
- core contracts for profiles, matrices, outcomes, and artifacts
- a setup assistant for inspecting required runtime inputs
- an offline review runner for exercising the orchestration flow locally
- packaged adapters for Notion, CDP, and hardware-sync gates
- a sanitized IoT dashboard example pack

## Why AHTO exists

A lot of testing tools work well when the problem is narrow: one browser, one app, one layer of state. Things get messier when a workflow depends on several layers at once.

AHTO is built for that messier case.

The project is centered on a few simple ideas:
- tests should be defined as rows in a matrix, not buried in ad hoc scripts
- working matrices and regression checkpoints should be treated differently
- run outcomes should be more honest than pass/fail
- setup should be profile-driven instead of hardcoded into one environment
- runs should leave behind durable artifacts that make the next step clearer

## Core concepts

### 1. Matrix-driven execution
AHTO uses a test matrix as the source of truth for what a run is trying to validate. Each row can describe:
- route or entry context
- action intent
- evidence expectations
- timing expectations
- supported outcome kinds

### 2. Working matrices vs checkpoints
AHTO distinguishes between:
- **working matrices** for active iteration and discovery
- **checkpoints** for promoted regression snapshots

That separation matters when a product is still changing. A moving test list and a regression baseline are not the same thing.

### 3. Richer result classification
AHTO supports outcomes like:
- `pass`
- `product-defect`
- `rig-blocked`
- `environment-blocked`
- `matrix-defect`
- `framework-defect`
- `ui-contract-defect`
- `flaky`
- `not-run`

The goal is to preserve what actually happened instead of flattening everything into generic failure.

### 4. Profile-driven setup
AHTO does not assume one fixed environment. Profiles define the project-specific truth the runner needs, such as:
- required environment inputs
- execution modes
- hardware-sync expectations
- adapter wiring
- artifact locations

### 5. Durable artifacts
Runs should produce useful outputs, not just terminal text. AHTO includes artifact emitters for:
- defect records
- run summaries
- validation and planning outputs

## What’s in this repo

| Path | Purpose |
| --- | --- |
| `core/` | contracts, setup assistant, review runner, and artifact emitters |
| `adapters/` | packaged integration surfaces for Notion, CDP, and hardware-sync |
| `docs/` | architecture, lifecycle, setup, classification, and workflow docs |
| `examples/` | sanitized example profile, matrices, fixtures, and expected artifacts |
| `SKILL.md` | skill-oriented entrypoint for agent/tool usage |

## Quick start

Install dependencies:

```bash
npm install
```

Run the full local verification pass:

```bash
npm run check
```

That validates:
- packaged adapter syntax
- core module syntax
- example JSON validity
- setup inspection behavior
- offline review runner behavior
- packaged repo surface

## Try the example flow

### Inspect setup requirements

```bash
node core/setup_assistant.mjs inspect \
  --profile ./examples/iot-dashboard/profile.json
```

JSON output:

```bash
node core/setup_assistant.mjs inspect \
  --profile ./examples/iot-dashboard/profile.json \
  --json
```

### Plan a run

```bash
node core/review_runner.mjs plan \
  --profile ./examples/iot-dashboard/profile.json \
  --matrix ./examples/iot-dashboard/matrices/checkpoints/smoke-checkpoint-v2026-04-24.json
```

### Execute the offline review run

```bash
AHTO_SYNC_OK=1 \
node core/review_runner.mjs run \
  --profile ./examples/iot-dashboard/profile.json \
  --matrix ./examples/iot-dashboard/matrices/checkpoints/smoke-checkpoint-v2026-04-24.json \
  --fixture ./examples/iot-dashboard/fixture-results/checkpoint-review.json \
  --outDir ./.ahto-review-run
```

## Where to read next

If you want the conceptual model first:
1. [`docs/architecture.md`](docs/architecture.md)
2. [`docs/matrix-lifecycle.md`](docs/matrix-lifecycle.md)
3. [`docs/modes-and-classification.md`](docs/modes-and-classification.md)
4. [`docs/setup-profile.md`](docs/setup-profile.md)
5. [`docs/review-runner.md`](docs/review-runner.md)

If you want the concrete example first:
1. [`examples/iot-dashboard/README.md`](examples/iot-dashboard/README.md)
2. [`examples/iot-dashboard/profile.json`](examples/iot-dashboard/profile.json)
3. [`examples/iot-dashboard/matrices/working/smoke-working.json`](examples/iot-dashboard/matrices/working/smoke-working.json)
4. [`examples/iot-dashboard/matrices/checkpoints/smoke-checkpoint-v2026-04-24.json`](examples/iot-dashboard/matrices/checkpoints/smoke-checkpoint-v2026-04-24.json)
5. [`examples/iot-dashboard/fixture-results/checkpoint-review.json`](examples/iot-dashboard/fixture-results/checkpoint-review.json)

## Adapters included here

### Notion
The Notion adapter supports using Notion as a matrix source and lightweight run-status surface.

See:
- [`adapters/notion/README.md`](adapters/notion/README.md)
- [`adapters/notion/notion_run.mjs`](adapters/notion/notion_run.mjs)

### CDP
The CDP adapter provides a small helper for connecting to an already-running Chromium-based browser with remote debugging enabled.

See:
- [`adapters/cdp/README.md`](adapters/cdp/README.md)
- [`adapters/cdp/cdp_ui.mjs`](adapters/cdp/cdp_ui.mjs)

### Hardware sync
The hardware-sync surface defines the contract for a project-specific preflight/sync gate.

See:
- [`docs/hardware-sync-gate.md`](docs/hardware-sync-gate.md)
- [`adapters/hardware-sync/README.md`](adapters/hardware-sync/README.md)
- [`adapters/hardware-sync/example_gate.sh`](adapters/hardware-sync/example_gate.sh)

## Current status

AHTO currently ships a real local example flow built around:
- contracts
- setup inspection
- an offline review runner
- packaged adapters
- a sanitized example pack

What it is good for today:
- understanding the testing model
- reviewing the orchestration surface
- trying the offline example locally
- adapting the structure to a real project

What still depends on project-specific work:
- live environment wiring
- real hardware/runtime deployment flows
- production-strength adapter coverage for arbitrary stacks

## License

MIT
