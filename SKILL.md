---
name: ahto
description: Test-matrix-driven integration testing across hardware, software, and services. Use when you need a structured test pass that coordinates a test-matrix source, a hardware-sync gate, UI/runtime checks, cross-layer evidence capture, outcome classification, and durable defect/run-summary artifacts.
---

# AHTO

AHTO is a packaged skill and toolkit for running disciplined integration tests from a **test-matrix** rather than from ad hoc manual notes.

## What this skill is for
Use AHTO when you need to:
- execute a **test-matrix** row by row
- distinguish exploratory working-matrix execution from checkpoint regression execution
- gate hardware-backed runs on a synchronization/preflight step
- collect evidence across UI, backend/runtime, and hardware layers
- distinguish environment blockers, rig blockers, matrix defects, framework defects, UI-contract defects, and true product defects
- emit durable defect and run-summary artifacts for downstream review or automation

## Start here
Read these first:
- `README.md`
- `docs/architecture.md`
- `docs/matrix-lifecycle.md`
- `docs/modes-and-classification.md`
- `docs/setup-profile.md`
- `docs/packaged-workflow.md`
- `examples/iot-dashboard/README.md`

Then inspect the packaged surfaces most relevant to your workflow:
- `core/contracts.mjs`
- `core/review_runner.mjs`
- `core/setup_assistant.mjs`
- `core/emit_defect_record.mjs`
- `core/emit_run_summary.mjs`
- `adapters/notion/README.md`
- `adapters/cdp/README.md`
- `adapters/hardware-sync/README.md`

## Core expectations
- Start from a **test-matrix** or equivalent row-based source of test intent.
- Treat hardware sync as a required gate for hardware-backed runs.
- Do not continue a hardware-backed pass after sync-gate failure.
- Keep integration details inside adapters rather than hardcoding one local environment.
- Preserve working-matrix vs checkpoint distinction explicitly.
- Preserve richer outcome classification instead of collapsing everything into pass/fail.
- Emit structured defect and run-summary artifacts instead of relying on chat transcripts or loose notes.

## Public-safety rules
- Do not hardcode local machine paths, browser-profile paths, or personal workspace layout.
- Do not hardcode private credentials, page ids, or operator-specific defaults.
- Do not assume one browser startup strategy, one database, or one hardware deployment method.
- Keep OpenClaw optional as an interface; AHTO should remain understandable outside OpenClaw.

## Adapter boundary
AHTO separates:
- **core contracts** — durable artifacts and workflow rules
- **core helpers** — review runner and setup assistant for the next orchestration shape
- **adapters** — concrete integrations like a test-matrix source, CDP/browser checks, or a hardware-sync gate
- **examples** — sanitized reference profiles that show how the parts fit together

## Current packaged surfaces
- `docs/` — architecture, lifecycle, classification, setup, workflow, and gate docs
- `core/` — contracts, review runner, setup assistant, and emitters
- `adapters/notion/` — packaged Notion test-matrix adapter
- `adapters/cdp/` — packaged CDP/browser adapter
- `adapters/hardware-sync/` — packaged hardware-sync gate contract and stub
- `examples/iot-dashboard/` — sanitized reference example pack

## Non-goals
AHTO is not:
- a generic browser test framework
- a CI/CD product
- a single-vendor Notion wrapper
- a bundled private device deployment flow
- proof that the public repo already has full live-lab maturity

## Compatibility note
Some packaged adapter commands and environment variable names still use the shorter historical `matrix` wording for compatibility.
In public docs and descriptions, prefer **test-matrix** for clarity.
