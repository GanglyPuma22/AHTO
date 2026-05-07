# IoT dashboard example

This directory is a public-safe reference example for AHTO v0.2.

It now demonstrates more than the earlier v0.1 packaging shell:
- profile-driven setup inputs
- an evolving working matrix
- an explicit checkpoint matrix
- richer row-outcome classification
- an offline review runner that emits artifacts from fixture outcomes

It still does **not** require:
- a live Notion workspace
- a logged-in browser profile
- private device scripts
- operator-specific machine paths

## What is included

- `profile.json` — sanitized profile wiring, setup inputs, lifecycle metadata, adapter references, and artifact outputs
- `test-matrix.json` — the current working-matrix example for compatibility and quick review
- `matrices/working/` — working matrix assets for exploratory use
- `matrices/checkpoints/` — promoted checkpoint assets for regression-style review
- `fixture-results/` — offline row outcomes used by the review runner
- `expected-artifacts/` — stable sample outputs showing defect + run-summary contracts

## Suggested review path

1. inspect `profile.json`
2. compare `matrices/working/` vs `matrices/checkpoints/`
3. read `../../docs/matrix-lifecycle.md`
4. read `../../docs/modes-and-classification.md`
5. read `../../docs/review-runner.md`
6. inspect `expected-artifacts/`

## How this maps to the repo

### Lifecycle-aware matrices
The example no longer implies that one floating matrix file is enough.
It shows:
- working-matrix evolution under `matrices/working/`
- explicit checkpoint promotion under `matrices/checkpoints/`

### Setup inspection
The profile declares required setup inputs so AHTO can explain what is missing without hardcoding secrets or personal defaults.

### Review runner
The fixture file under `fixture-results/` lets the review runner exercise the orchestration contract offline.
That is a deliberate v0.2 step toward a real runner story.

### Core outputs
The sample files under `expected-artifacts/` mirror the contract shape produced by:
- `../../core/emit_defect_record.mjs`
- `../../core/emit_run_summary.mjs`
- `../../core/review_runner.mjs`

## Example operator flow

Inspect setup posture:

```bash
node core/setup_assistant.mjs inspect --profile ./examples/iot-dashboard/profile.json
```

Plan the checkpoint run:

```bash
node core/review_runner.mjs plan \
  --profile ./examples/iot-dashboard/profile.json \
  --matrix ./examples/iot-dashboard/matrices/checkpoints/smoke-checkpoint-v2026-04-24.json
```

Execute the offline review run:

```bash
AHTO_SYNC_OK=1 \
node core/review_runner.mjs run \
  --profile ./examples/iot-dashboard/profile.json \
  --matrix ./examples/iot-dashboard/matrices/checkpoints/smoke-checkpoint-v2026-04-24.json \
  --fixture ./examples/iot-dashboard/fixture-results/checkpoint-review.json \
  --outDir ./.tmp/ahto-review-run
```

## Why the artifacts are still static

This example is still meant to answer: “What does a packaged AHTO profile and run shape look like?”

The repo is stronger now because it includes a real offline orchestration lane.
But it is still honest about the gap between:
- reviewable package quality
- and full live environment maturity
