# Packaged workflow

This document describes the public-safe AHTO v0.2 execution flow.

It connects the packaged surfaces that currently exist in this repo without assuming private Notion pages, browser profiles, device scripts, or local machine layout.

## Packaged surfaces

Core contracts and helpers:
- [`../core/contracts.mjs`](../core/contracts.mjs)
- [`../core/review_runner.mjs`](../core/review_runner.mjs)
- [`../core/setup_assistant.mjs`](../core/setup_assistant.mjs)
- [`../core/emit_defect_record.mjs`](../core/emit_defect_record.mjs)
- [`../core/emit_run_summary.mjs`](../core/emit_run_summary.mjs)

Architecture docs:
- [`./architecture.md`](./architecture.md)
- [`./matrix-lifecycle.md`](./matrix-lifecycle.md)
- [`./modes-and-classification.md`](./modes-and-classification.md)
- [`./setup-profile.md`](./setup-profile.md)
- [`./hardware-sync-gate.md`](./hardware-sync-gate.md)

Adapters:
- [`../adapters/notion/README.md`](../adapters/notion/README.md)
- [`../adapters/cdp/README.md`](../adapters/cdp/README.md)
- [`../adapters/hardware-sync/README.md`](../adapters/hardware-sync/README.md)

Example profile pack:
- [`../examples/iot-dashboard/README.md`](../examples/iot-dashboard/README.md)
- [`../examples/iot-dashboard/profile.json`](../examples/iot-dashboard/profile.json)
- [`../examples/iot-dashboard/test-matrix.json`](../examples/iot-dashboard/test-matrix.json)
- [`../examples/iot-dashboard/matrices/checkpoints/smoke-checkpoint-v2026-04-24.json`](../examples/iot-dashboard/matrices/checkpoints/smoke-checkpoint-v2026-04-24.json)
- [`../examples/iot-dashboard/fixture-results/checkpoint-review.json`](../examples/iot-dashboard/fixture-results/checkpoint-review.json)

## What this workflow is trying to preserve

AHTO is not just a browser test runner.
The packaged workflow preserves a higher-level testing loop:

1. choose a profile, matrix family/member, and execution mode
2. verify the environment is in the right hardware/runtime state
3. perform UI checks against the system under test
4. correlate supporting evidence across layers
5. classify row outcomes honestly
6. emit structured defects for actionable failures
7. emit a durable run summary for handoff and review

## End-to-end v0.2 flow

### 1. Profile setup truth is inspected first
AHTO starts from a profile.
The profile declares:
- supported execution modes
- required setup inputs
- hardware-sync expectations
- adapter wiring
- artifact locations
- matrix lifecycle pointers

The setup assistant under [`../core/setup_assistant.mjs`](../core/setup_assistant.mjs) can inspect or prompt for missing inputs without baking them into the repo.

### 2. Matrix lifecycle is chosen deliberately
AHTO now makes the matrix lifecycle more explicit.
An operator chooses:
- a working matrix for exploratory/refinement use
- or a promoted checkpoint matrix for repeatable regression review

That means baseline/checkpoint is a deliberate state, not just “whatever matrix file exists today.”

### 3. Hardware-sync gate validates the environment before execution
Before row execution starts, AHTO runs the hardware-sync gate described in [`./hardware-sync-gate.md`](./hardware-sync-gate.md).
The packaged stub lives under [`../adapters/hardware-sync/`](../adapters/hardware-sync/).

Expected outcome handling:
- success (`exit 0`): the environment is considered synchronized and the pass may continue
- failure (non-zero exit): rows should become environment-blocked rather than pretending a fair product result was observed

Boundary line:
- adapter side: how a team flashes devices, deploys firmware, restarts services, or verifies runtime freshness
- core side: the rule that sync must happen before trustworthy evidence-based execution continues

### 4. UI/runtime adapter performs browser-visible checks
Once the environment is ready, AHTO can execute row-level checks.
In this repo the packaged UI/runtime helper is the CDP adapter under [`../adapters/cdp/`](../adapters/cdp/).

The CDP adapter can support row execution by doing tasks such as:
- locating a page target
- activating or navigating that target
- asserting text within a selector
- capturing screenshots as evidence

The adapter remains intentionally narrow.
It expects a browser that already exposes a CDP endpoint and does not define the team-specific browser startup strategy.

### 5. Evidence capture correlates multiple layers
AHTO rows are meant to be judged with more than a single UI assertion.
A credible run often needs evidence from multiple sources, for example:
- UI observations from the CDP adapter
- hardware/runtime evidence from the sync flow or device logs
- backend evidence from project-specific adapters
- operator notes or structured comments from the run surface

The public repo does not ship every evidence collector.
It ships the contracts and examples that make those collectors pluggable.

### 6. Row outcomes are classified, not flattened
The packaged v0.2 shape now preserves a richer taxonomy:
- pass
- product defect
- rig blocked
- environment blocked
- matrix defect
- framework defect
- UI-contract defect
- flaky
- not run

This distinction is one of the most important things AHTO is trying to preserve.
It changes what happens next.

### 7. Core defect emission turns actionable failures into durable artifacts
When a row fails because of a product, matrix, framework, or UI-contract problem, AHTO can emit a structured defect artifact with [`../core/emit_defect_record.mjs`](../core/emit_defect_record.mjs).

The defect emitter is core because the record shape should stay stable even when test-matrix systems, browsers, or evidence backends change.

### 8. Core run summary emission closes the pass
After row execution finishes, AHTO emits a run summary with [`../core/emit_run_summary.mjs`](../core/emit_run_summary.mjs).

The summary preserves:
- run identity and pass number
- execution mode
- matrix family / revision / checkpoint metadata
- legacy rollups for compatibility
- richer v0.2 outcome counts
- key findings
- defect refs
- next-step recommendation

### 9. The review runner proves the orchestration contract offline
The review runner under [`../core/review_runner.mjs`](../core/review_runner.mjs) is the concrete v0.2 strengthening step.
It can:
- validate the profile + matrix contract
- materialize a normalized execution plan
- execute the hardware-sync gate
- consume fixture row outcomes
- emit defect and run-summary artifacts

This is intentionally honest:
- it **does** prove the repo now has a reviewable orchestration lane
- it **does not** claim full live multi-adapter runtime maturity

## Minimal v0.2 operator sequence

A public-safe operator flow can be described like this:

1. inspect profile setup inputs
2. choose working vs checkpoint matrix
3. inspect or generate the execution plan
4. execute the hardware-sync gate
5. stop cleanly if the gate fails
6. run row checks through adapters or, for offline review, through the review-runner fixture path
7. classify row outcomes honestly
8. emit defect records for actionable failures
9. emit a pass-level run summary at the end

## Why this is still public-safe

The packaged workflow is intentionally documented at the contract level.
It still does **not** require publishing:
- private Notion structure defaults
- private browser profile management
- private device deployment scripts
- private machine paths or operator-specific environment details

That keeps the repo reviewable and testable as an open package while still reflecting the real workflow shape AHTO came from.
