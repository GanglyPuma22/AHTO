# Hardware sync gate

AHTO treats hardware sync as a core workflow capability.

## Why this exists
When a test pass targets a hardware-backed system, the orchestrator needs a reliable way to establish that the device under test is running the intended code/runtime state before evidence collection begins.

Without that gate, a result may reflect stale firmware, stale services, or stale bridge/runtime state rather than the code the operator believes they are testing.

## Gate contract
A hardware sync gate is a command or script that:

1. Accepts a project or profile identifier.
2. Returns exit code `0` when sync/preflight succeeded.
3. Returns a non-zero exit code when sync/preflight failed.
4. On success, guarantees that the device under test is running the intended code version or synchronized runtime state.
5. On failure, emits a human-readable reason.

## Orchestrator behavior
The testing orchestrator should:
- call the gate before a test pass,
- optionally call it again before specific rows when the workflow requires it,
- treat gate failure as a hard block,
- record gate failure as an environment blocker rather than a product defect,
- never continue into a pass that depends on fresh hardware/runtime state after gate failure.

## Why the implementation is adapter-specific
The actual sync procedure varies across projects. Examples include:
- OTA over Wi-Fi
- serial flashing
- SSH + rsync + restart
- container rebuild + deploy
- VM reset or snapshot restore

AHTO should not hardcode any one of these into the core.

## v0.1 packaging rule
Ship:
- this contract,
- a simple example gate script,
- documentation showing where the gate plugs into a run.

Do not ship private project-specific sync scripts as the default implementation.
