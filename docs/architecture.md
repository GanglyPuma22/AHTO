# AHTO architecture

AHTO is a test-matrix-driven integration testing system for workflows that need to validate behavior across multiple layers at once: user interface, backend/services, and hardware/runtime state.

## What AHTO is
- a testing orchestration model
- a set of artifact contracts
- a place for adapters that connect the model to real systems
- a reference example showing how the parts fit together

## What AHTO is not
- not a generic browser testing framework
- not a CI/CD product
- not a Notion-only tool
- not an AI-agent demo pretending to be a testing system

## Three-layer model

### 1. Core
The core defines the execution discipline and the artifacts that make results durable and handoff-friendly.

Core concerns:
- test-matrix-driven row execution
- evidence correlation across layers
- immediate row-level result updates
- defect record contract
- run summary contract
- pass/retest semantics
- downstream handoff model
- hardware-sync gate contract

### 2. Adapters
Adapters connect AHTO to real systems.

Examples:
- a test-matrix source adapter (Notion in the current v0.1 path)
- a browser/runtime interaction adapter (CDP in the current v0.1 path)
- a hardware-sync gate adapter
- backend/database evidence adapters
- hardware/log evidence adapters

Adapters are intentionally replaceable.
AHTO should not assume one database, one browser profile strategy, or one hardware deployment method.

### 3. Examples
Examples demonstrate a complete end-to-end workflow without claiming that the example is the product identity.

The v0.1 repo should include a sanitized IoT dashboard example profile under [`../examples/iot-dashboard/`](../examples/iot-dashboard/) showing:
- a row-based test-matrix
- evidence expectations
- defect and run-summary outputs
- required configuration inputs
- where adapters plug into the workflow

## Execution flow
1. Choose a project profile and test-matrix source.
2. Run the hardware-sync gate.
3. If the gate fails, stop and record an environment blocker.
4. If the gate succeeds, execute test-matrix rows.
5. Gather cross-layer evidence for each row.
6. Record row outcomes immediately.
7. Emit structured defect records for actionable failures.
8. Emit a pass-level run summary.
9. Hand the outputs to a downstream human or implementation workflow if needed.

## Why the hardware-sync gate is core
In hardware/software integration testing, stale firmware or stale device runtime invalidates results.
AHTO treats hardware sync as a first-class workflow capability so that test outcomes remain trustworthy.

The specific sync implementation is adapter-specific.
The contract is core.

## Why OpenClaw is not the repo identity
OpenClaw is a good interface for invoking AHTO, but the public repo should remain runnable as standalone Node-based tooling plus documentation.
That keeps the core portable and prevents the project from looking like an OpenClaw-only wrapper.
