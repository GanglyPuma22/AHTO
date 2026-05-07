# Modes and classification

AHTO needs more than a single pass/fail worldview.
The framework exists for hardware-backed systems where failures can belong to very different layers.

## Execution modes

### Exploratory mode
Use exploratory mode when:
- the system is changing quickly
- the matrix is still being refined
- you expect to discover missing coverage, vague wording, or weak evidence hooks

Exploratory mode does **not** mean sloppy.
It means the matrix is still allowed to learn.

### Checkpoint mode
Use checkpoint mode when:
- a matrix snapshot has been deliberately promoted
- repeatability matters more than discovery
- rerun-to-rerun comparisons need to mean something

Checkpoint mode should feel stricter:
- fewer ad hoc reinterpretations
- clearer row ownership
- explicit handling of blockers

## Outcome taxonomy

### Pass
The row executed fairly and the expected result was observed.

### Product defect
The row executed fairly and the system under test appears to be wrong.
Example: the offline banner never renders even though the underlying condition is present.

### Rig blocked
The row could not be executed fairly because the required lab/rig capability is missing.
Example: a remote power-cycle path does not exist yet.

### Environment blocked
The broader environment was not ready for trustworthy execution.
Example: stale firmware or failed sync gate.

### Matrix defect
The matrix row itself is wrong or under-specified.
Example: expected behavior references an obsolete route or impossible condition.

### Framework defect
The failure belongs to AHTO/framework behavior rather than the product.
Example: orchestration emitted the wrong field mapping or mishandled row state.

### UI-contract defect
The product may be functioning, but the UI-facing hooks needed for stable testing are missing or invalid.
Example: expected stable selectors or route contract are absent after a redesign.

### Flaky
The row produced unresolved or inconsistent evidence that is not yet trustworthy enough to classify more strongly.

### Not run
The row was intentionally left unexecuted.

## Why this taxonomy exists
A vague pass/fail bucket causes expensive confusion.
AHTO is trying to preserve the difference between:
- fix the product
- fix the matrix
- fix the rig
- fix the framework
- fix the UI contract

That is one of the main design lessons behind the repo.

## Artifact impact
- actionable failure kinds can emit structured defect records
- blocked outcomes should still appear in summaries
- run summaries should preserve both legacy rollups and richer v0.2 counts

## Example reminder
The IoT dashboard example and review runner are small, but they are meant to prove that the repo shape now has room for this taxonomy instead of collapsing everything into a single failure bucket.
