# Review runner

The review runner is a deliberately modest but meaningful v0.2 addition.

Entry point:
- [`../core/review_runner.mjs`](../core/review_runner.mjs)

## Why it exists
The earlier v0.1 repo shape explained AHTO well enough for packaging review, but it still underdelivered on runner/orchestration.
The review runner closes part of that gap by providing a real offline orchestration surface that can:
- validate profile + matrix contracts
- materialize a normalized execution plan
- execute the hardware-sync gate
- consume fixture row outcomes
- emit structured defect + run-summary artifacts

## What it proves
It proves that the repo now has a reviewable orchestration lane.
It does **not** prove full live end-to-end maturity across browsers, devices, and backends.
That distinction is important.

## Commands
Plan a run:

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

## Outputs
The runner writes:
- `plan.json`
- `validation.json`
- `hardware-sync.json`
- `row-results.json`
- `defects/`
- `runs/`

These outputs are intentionally simple, but they move AHTO closer to a real runner/orchestration story instead of a docs-only promise.
