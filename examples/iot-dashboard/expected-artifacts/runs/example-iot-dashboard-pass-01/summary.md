# Run Summary

## Identity
- summary id: example-iot-dashboard-pass-01
- run id: example-iot-dashboard-run-001
- pass number: 1
- mode: packaged-example
- matrices included: IoT Dashboard Smoke Matrix

## Outcome counts
- rows passed: 1
- rows failed: 1
- rows blocked by environment: 0
- rows blocked by product defect: 0
- rows unresolved / flaky: 0

## Key findings
- The packaged profile shows how a hardware-sync gate, UI adapter, and core emitters fit together without live credentials.
- A failing alerts-panel row produces a durable defect artifact while the pass still emits a summary for handoff.

## Defect outputs
- ../defects/example-iot-dashboard-stale-alert/record.json

## Recommendation
- Review the sample defect contract, then replace the static matrix and placeholder evidence paths with project-specific adapters.
