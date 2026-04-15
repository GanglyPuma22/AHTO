# IoT dashboard example

This directory is a public-safe reference example for AHTO v0.1.

It shows one packaged scenario without requiring:
- a live Notion workspace
- a logged-in browser profile
- private device scripts
- operator-specific machine paths

## What is included

- `profile.json` — sanitized profile wiring for the test-matrix source, hardware-sync gate, UI adapter, and artifact outputs
- `test-matrix.json` — two example test-matrix rows using the field shape expected by the packaged Notion adapter
- `expected-artifacts/` — stable sample outputs showing where defect and run-summary artifacts land

## How this maps to the packaged repo

### Test-matrix source

`test-matrix.json` demonstrates the row shape that a test-matrix source adapter should produce.

The packaged Notion adapter in [`../../adapters/notion/`](../../adapters/notion/) would normally read and update rows with fields such as:
- `Test ID`
- `Scenario`
- `Steps`
- `Expected UI`
- `Expected Hardware`
- `Result`
- `Comments`
- `Issue Link`
- `Evidence`
- optional UI hint columns

This example keeps those fields as static JSON so the workflow can be reviewed offline.

### Hardware-sync gate

`profile.json` points to the packaged example gate contract at [`../../adapters/hardware-sync/`](../../adapters/hardware-sync/).

In a live project, that gate would verify that the device, bridge, or runtime has been synchronized before row execution starts.
In this example, the command shape is documented without bundling a private deployment flow.

### UI/runtime adapter

`profile.json` also shows how the packaged CDP adapter in [`../../adapters/cdp/`](../../adapters/cdp/) plugs into a profile.

The example rows include:
- `uiRoute`
- `uiTargetHints`
- `selectorHints`
- `uiActionNotes`

Those fields give the UI adapter enough context to locate an existing page target, perform a lightweight assertion, and capture evidence.

### Core outputs

The sample files under `expected-artifacts/` mirror the contract shape produced by:
- [`../../core/emit_defect_record.mjs`](../../core/emit_defect_record.mjs)
- [`../../core/emit_run_summary.mjs`](../../core/emit_run_summary.mjs)

The sample IDs are intentionally stable for review.
A live run would generate timestamped output folders.

## Example operator flow

1. load `profile.json`
2. materialize rows from `test-matrix.json` or from a real test-matrix adapter with the same field shape
3. run the hardware-sync gate before the pass
4. execute row checks through the CDP adapter or another UI/runtime adapter
5. capture screenshots or notes into `expected-artifacts/screenshots/`
6. emit structured defect records for actionable failures
7. emit a pass-level summary into `expected-artifacts/runs/`

## Why the artifacts are static

This example is meant to answer the question, “What does a packaged AHTO profile look like?”

Because it is static, a reviewer can inspect:
- test-matrix row shape
- adapter boundaries
- expected artifact locations
- defect and summary contracts

without needing credentials, browser state, or hardware access.
