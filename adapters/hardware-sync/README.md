# Hardware sync adapter

This directory holds the hardware-sync gate interface for AHTO.

The real project-specific sync implementation is expected to live outside the core unless it is generic enough to publish safely.

Included in v0.1:
- a documented gate contract in `../../docs/hardware-sync-gate.md`
- a trivial example gate script showing the interface shape

Expected behavior:
- exit code `0` on success
- non-zero exit code on failure
- human-readable reason on failure
