# AHTO architecture

AHTO is a test-matrix-driven integration testing system for workflows that need to validate behavior across multiple layers at once: user interface, backend/services, and hardware/runtime state.

The v0.2 repo shape is still intentionally review-first.
It is stronger on contracts and orchestration than the earlier v0.1 packaging shell, but it does **not** pretend the public repo already proves full live lab maturity.

## What AHTO is
- a matrix-driven testing orchestration model
- a set of durable artifact contracts
- a profile/setup contract for project-specific truth
- a place for adapters that connect the model to real systems
- a reviewable offline runner that exercises the orchestration contract without live credentials
- a reference example showing working-matrix vs checkpoint lifecycle

## What AHTO is not
- not a generic browser testing framework
- not a CI/CD product
- not a Notion-only tool
- not a zero-config hardware lab fantasy
- not an AI-agent demo pretending to be a testing system

## Four-layer model

### 1. Core contracts
Core contracts define the things that should survive adapter swaps:
- row shape expectations
- execution modes
- outcome taxonomy
- matrix lifecycle metadata
- defect record structure
- run summary structure
- hardware-sync gating rule

Current v0.2 core entry points:
- [`../core/contracts.mjs`](../core/contracts.mjs)
- [`../core/emit_defect_record.mjs`](../core/emit_defect_record.mjs)
- [`../core/emit_run_summary.mjs`](../core/emit_run_summary.mjs)

### 2. Core orchestration helpers
These helpers prove the next repo shape without claiming live end-to-end completeness:
- [`../core/review_runner.mjs`](../core/review_runner.mjs) — validates profile + matrix contracts, runs the hardware gate, and emits artifacts from fixture outcomes
- [`../core/setup_assistant.mjs`](../core/setup_assistant.mjs) — inspects required setup inputs and can prompt for missing values interactively

This is the key v0.2 strengthening over the v0.1 shell: orchestration is no longer docs-only.

### 3. Adapters
Adapters connect AHTO to real systems.
Examples in this repo:
- a test-matrix source adapter (Notion)
- a browser/runtime interaction adapter (CDP)
- a hardware-sync gate adapter

Planned future adapter families:
- backend evidence adapters
- device/runtime evidence adapters
- alternative matrix providers

Adapters are intentionally replaceable.
AHTO should not assume one database, one browser startup strategy, or one hardware deployment method.

### 4. Example packs
Examples show a coherent slice without silently becoming the product identity.

The bundled IoT dashboard example now demonstrates:
- profile-driven setup inputs
- an evolving working matrix
- an explicit regression checkpoint matrix
- richer row classification possibilities
- expected artifact layouts
- an offline fixture-driven review run

## Execution model

### Step 1: choose profile + matrix + mode
AHTO starts with:
- a project profile
- a matrix family/member
- an execution mode

Mode matters:
- `exploratory` favors discovery and matrix refinement
- `checkpoint` favors repeatability against a promoted regression checkpoint

### Step 2: run the hardware-sync gate
Hardware-backed runs are not trustworthy if the device/runtime state is stale.
AHTO treats hardware sync as a core gating rule.
The implementation is adapter-specific; the rule is not.

### Step 3: execute rows and classify results honestly
Each row should preserve:
- route/entry context
- action intent
- evidence expectations
- timing expectations
- supported outcome kinds

Outcome classification is deliberately richer than pass/fail.
See [`./modes-and-classification.md`](./modes-and-classification.md).

### Step 4: emit durable artifacts
AHTO should emit:
- structured defect records for actionable failures
- run summaries that preserve mode, matrix lifecycle, and result counts

### Step 5: feed the next loop
Outputs should make the next step easier:
- fix product defects
- repair the rig
- refine the matrix
- harden the framework
- promote or replace a checkpoint

## Matrix lifecycle is first-class
AHTO distinguishes:
- **working matrices** — evolving truth during active product change
- **checkpoints** — promoted regression snapshots tied to a matrix family + revision

This matters because “baseline” is not just “whatever matrix exists today.”
A deliberate checkpoint is the durable regression asset.

See [`./matrix-lifecycle.md`](./matrix-lifecycle.md).

## Setup truth is profile-driven
AHTO is not zero-config, but it should also not force users through heavyweight ceremony.
Profiles declare the minimum runtime truth the framework needs.
The setup assistant can inspect and prompt for missing inputs in a lightweight, contextual way.

See [`./setup-profile.md`](./setup-profile.md).

## OpenClaw is still optional
OpenClaw is a useful interface for invoking AHTO, but the repo identity remains portable:
- Node-based helpers
- contract docs
- adapter boundaries
- examples that do not require OpenClaw-specific runtime semantics to understand

That keeps the core concept portable even when a particular packaging uses OpenClaw well.
