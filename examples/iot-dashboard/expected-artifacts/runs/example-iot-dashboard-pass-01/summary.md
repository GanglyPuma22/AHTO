# Run Summary

## Identity
- summary id: example-iot-dashboard-pass-01
- run id: example-iot-dashboard-run-001
- pass number: 1
- mode: checkpoint
- matrix id: iot-dashboard-smoke-checkpoint-v2026-04-24
- matrix family: iot-dashboard-smoke
- matrix revision: 2026-04-24
- lifecycle stage: checkpoint
- checkpoint id: iot-dashboard-smoke-v2026-04-24
- matrices included: IoT Dashboard Smoke Matrix

## Outcome counts
- rows passed: 1
- actionable failed rows (legacy rollup): 1
- rows blocked by environment/rig (legacy rollup): 1
- rows blocked by product defect (legacy field retained for compatibility): 0
- rows unresolved / flaky: 0
- product defects: 1
- rig blocked: 1
- environment blocked: 0
- matrix defects: 0
- framework defects: 0
- UI-contract defects: 0
- not run: 0

## Key findings
- Checkpoint mode used checkpoint iot-dashboard-smoke-v2026-04-24 from family iot-dashboard-smoke.
- The profile demonstrates lifecycle-aware checkpoint execution instead of a single floating matrix file.
- The offline review runner can emit defects and summaries without needing live Notion, browser, or hardware credentials.
- At least one row was explicitly marked rig-blocked instead of being silently dropped.

## Defect outputs
- ../defects/example-iot-dashboard-stale-alert/record.json

## Recommendation
- Fix the alerts-panel defect, decide whether the recovery path should become a real rig capability, then rerun the checkpoint.
