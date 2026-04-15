# AHTO

> Matrix-driven integration testing across hardware, software, and services.

This repo is being packaged from a real internal testing workflow into a publish-safe open-source artifact.

Current packaging goals:
- preserve the orchestration model,
- preserve structured defect and run-summary artifacts,
- expose adapters rather than hardcoded private integrations,
- ship one sanitized reference example,
- keep OpenClaw as an optional interface rather than a hard dependency.

See:
- `docs/architecture.md`
- `docs/hardware-sync-gate.md`
- `core/emit_defect_record.mjs`
- `core/emit_run_summary.mjs`
