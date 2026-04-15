# Packaged workflow

This document describes the public-safe AHTO v0.1 execution flow.

It connects the packaged surfaces that currently exist in this repo without assuming any private Notion pages, browser profiles, device scripts, or local machine layout.

## Packaged surfaces

Core artifacts and contracts:
- [`../core/emit_defect_record.mjs`](../core/emit_defect_record.mjs)
- [`../core/emit_run_summary.mjs`](../core/emit_run_summary.mjs)
- [`./architecture.md`](./architecture.md)
- [`./hardware-sync-gate.md`](./hardware-sync-gate.md)

Adapters:
- [`../adapters/notion/README.md`](../adapters/notion/README.md)
- [`../adapters/cdp/README.md`](../adapters/cdp/README.md)
- [`../adapters/hardware-sync/README.md`](../adapters/hardware-sync/README.md)

Example profile:
- [`../examples/iot-dashboard/README.md`](../examples/iot-dashboard/README.md)
- [`../examples/iot-dashboard/profile.json`](../examples/iot-dashboard/profile.json)
- [`../examples/iot-dashboard/test-matrix.json`](../examples/iot-dashboard/test-matrix.json)

## What this workflow is trying to preserve

AHTO is not just a browser test runner.
The packaged workflow preserves a higher-level testing loop:

1. load a test-matrix of rows from a system of record
2. verify the environment is in the right hardware/runtime state
3. perform UI checks against the system under test
4. correlate supporting evidence across layers
5. emit structured defects for actionable failures
6. emit a durable run summary for handoff and review

## End-to-end v0.1 flow

### 1. Test-matrix source adapter selects the work to run

AHTO begins with a test-matrix source.
In the current packaged path, the example source adapter is the Notion adapter under [`../adapters/notion/`](../adapters/notion/).

Typical responsibilities of the test-matrix source adapter:
- list available test-matrices
- create a run record for a new pass
- materialize rows into a run table or local execution state
- read row details such as scenario, steps, expected UI, expected hardware state, and hints
- update row status as the run progresses

What belongs to the adapter:
- authentication to the test-matrix system
- page/database lookup rules
- test-matrix ingestion and row updates
- mapping external fields into AHTO row data

What does **not** belong to the adapter:
- the meaning of pass/fail at the AHTO level
- the structure of defect records
- the structure of run summaries
- the hardware gate contract

Those concerns belong to AHTO core contracts.

### 2. Hardware-sync gate validates the environment before execution

Before row execution starts, AHTO runs the hardware-sync gate described in [`./hardware-sync-gate.md`](./hardware-sync-gate.md).
The packaged adapter stub lives under [`../adapters/hardware-sync/`](../adapters/hardware-sync/).

This is a hard precondition for trustworthy hardware-backed runs.
If the gate fails, the run should stop before normal test execution proceeds.

Expected outcome handling:
- success (`exit 0`): the environment is considered synchronized and the pass may continue
- failure (non-zero exit): record an environment blocker and stop the pass

Boundary line:
- adapter side: how a team flashes devices, deploys firmware, restarts services, or verifies runtime freshness
- core side: the rule that sync must happen before evidence-based execution continues

### 3. UI/runtime adapter performs browser-visible checks

Once the environment is ready, AHTO can execute row-level checks.
In v0.1 the packaged browser/runtime helper is the CDP adapter under [`../adapters/cdp/`](../adapters/cdp/).

The CDP adapter can support row execution by doing tasks such as:
- locating a page target
- activating or navigating that target
- asserting text within a selector
- capturing screenshots as evidence

This adapter is intentionally narrow.
It expects a browser that already exposes a CDP endpoint and does not define the team-specific browser startup strategy.

Boundary line:
- adapter side: connecting to an existing browser endpoint and carrying out UI-level interactions
- core side: deciding which row is running, what evidence is required, and how outcomes are recorded

### 4. Evidence capture correlates multiple layers

AHTO rows are meant to be judged with more than a single UI assertion.
A credible run often needs evidence from multiple sources, for example:
- UI observations from the CDP adapter
- hardware/runtime evidence from the hardware-sync flow or device logs
- backend or database evidence from project-specific adapters
- operator notes or structured comments from the run surface

The packaged v0.1 repo includes the contracts for defect and summary emission, but it intentionally leaves many evidence collectors as replaceable adapters.
That keeps the public repo useful without shipping private infrastructure hooks.

### 5. Core defect emission turns actionable failures into durable artifacts

When a row fails because of a product or integration problem, AHTO should emit a structured defect artifact with [`../core/emit_defect_record.mjs`](../core/emit_defect_record.mjs).

The defect emitter is core because the record shape should stay stable even when test-matrix systems, browsers, or evidence backends change.

The emitted record captures fields such as:
- run identity and row identity
- test-matrix name and pass number
- failure classification and severity
- expected vs actual result
- UI route and selector hints
- hardware/runtime and backend evidence summaries
- follow-on action or ownership hint

Adapter output feeds this core artifact, but the artifact contract itself is not adapter-specific.

### 6. Core run summary emission closes the pass

After row execution finishes, AHTO should emit a run summary with [`../core/emit_run_summary.mjs`](../core/emit_run_summary.mjs).

The summary provides a durable pass-level handoff including:
- run identity and pass number
- execution mode
- included test-matrices
- outcome counts
- key findings
- links or references to emitted defects
- a next-step recommendation

Like the defect record, this belongs in core because downstream consumers should not need to care whether the run used Notion, another test-matrix system, CDP, or some future adapter.

## Where adapters end and core begins

### Adapters own integration details

Adapters are responsible for connecting AHTO to concrete systems.
That includes:
- auth and connection details
- page/database/device/browser access
- external field mapping
- project-specific setup and environment access
- collecting raw evidence from a specific source

Adapters should be replaceable.
If you swap Notion for another test-matrix source, or CDP for another UI driver, the higher-level AHTO workflow should still make sense.

### Core owns durable workflow contracts

Core is responsible for the testing discipline that should survive adapter changes.
That includes:
- the requirement to start from a test-matrix of rows
- the requirement to gate hardware-backed runs on synchronization
- the distinction between environment blockers and product defects
- durable defect artifact structure
- durable run-summary artifact structure
- handoff-friendly output for humans and downstream systems

A useful rule of thumb:
- if the logic depends on a particular vendor, tool, or local environment, it is probably adapter territory
- if the logic should remain true no matter which adapter is used, it is probably core territory

## Minimal v0.1 operator sequence

A public-safe operator flow can be described like this:

1. choose a test-matrix source and target test-matrix rows
2. create or resume a run through the test-matrix adapter
3. execute the hardware-sync gate
4. stop immediately if the gate reports an environment problem
5. run row checks with the UI/runtime adapter and any other evidence adapters
6. update row status as evidence is collected
7. emit defect records for actionable failures
8. emit a pass-level run summary at the end

This repo currently provides the core artifact emitters plus packaged Notion, CDP, and hardware-sync adapter surfaces needed to explain that loop.

## Why this is public-safe

The packaged workflow is intentionally documented at the contract level.
It does **not** require publishing:
- private Notion structure defaults
- private browser profile management
- private device deployment scripts
- private machine paths or operator-specific environment details

That makes the repo reviewable and testable as an open package while still reflecting the real workflow shape AHTO came from.
