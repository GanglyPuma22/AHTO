# Matrix lifecycle

AHTO treats matrix lifecycle as part of the testing system, not clerical overhead.

## Why this matters
AHTO came out of an environment where:
- UI behavior changes
- hardware topology changes
- evidence sources change
- operational expectations change

If the matrix does not evolve with those changes, the testing system lies.

## Core lifecycle distinction

### Working matrix
A working matrix is the active evolving truth.
It is where you:
- add rows
- split vague rows into diagnosable rows
- refine evidence expectations
- update selectors or route hints
- capture new outcome classifications

Use `exploratory` mode when the main goal is learning, discovery, or refinement.

### Checkpoint matrix
A checkpoint matrix is a deliberately promoted regression snapshot.
It should be tied to:
- a matrix family
- a revision or architecture version
- a checkpoint id
- a stable enough expectation set to support repeatable passes

Use `checkpoint` mode when the goal is repeatability, regression confidence, or comparison against a known-good snapshot.

## Family / revision model
AHTO v0.2 uses lightweight metadata rather than a heavy matrix registry.
A matrix should identify:
- `matrixFamily`
- `matrixRevision`
- `lifecycle.stage`
- `lifecycle.checkpointId` when applicable
- `lifecycle.promotedFrom` when applicable

This keeps working and checkpoint assets related without pretending they are interchangeable.

## Promotion guidance
Promotion from working -> checkpoint should be deliberate.
A good checkpoint candidate usually has:
- row coverage that feels representative rather than provisional
- stable enough UI/evidence hooks to rerun without rediscovery
- known rig limitations called out explicitly instead of omitted
- enough confidence that pass/fail drift will be meaningful

## What should not happen
- Do not treat every current matrix revision as a checkpoint automatically.
- Do not hide rig limitations by deleting hard rows from the checkpoint.
- Do not collapse matrix-defect and product-defect into one vague failure bucket.
- Do not assume one matrix family will remain sufficient forever.

## Example pack usage
The bundled IoT dashboard example now shows both:
- `matrices/working/` — evolving rows for exploratory use
- `matrices/checkpoints/` — a promoted checkpoint snapshot for regression review

That example is intentionally small, but it demonstrates the lifecycle boundary AHTO is trying to preserve.
