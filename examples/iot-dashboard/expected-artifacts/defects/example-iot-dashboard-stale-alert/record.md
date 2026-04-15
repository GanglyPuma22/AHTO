# Defect Record

## Identity
- defect id: example-iot-dashboard-stale-alert
- run id: example-iot-dashboard-run-001
- pass number: 1
- matrix name: IoT Dashboard Smoke Matrix
- row id: IOT-DASH-002
- mode: packaged-example

## Classification
- failure kind: ui-regression
- severity / impact: high
- recommended next owner: frontend

## Summary
- short summary: Sensor offline banner did not render within the timing budget.
- expected result: The alerts panel displays an offline banner for Kitchen Temperature within 30 seconds of the bridge disconnect event.
- actual result: The alerts panel remained in an All sensors healthy state for 45 seconds while the example bridge condition indicated a disconnect.

## Reproduction / row context
- UI route: /dashboard?panel=alerts
- selector hints used: [data-testid="sensor-offline-banner"], [data-testid="alerts-panel"]
- row action summary: Opened the alerts panel, checked for the offline banner, and captured the missing-banner failure as a structured example defect.
- timing window / retry policy: 30s / single retry after refresh

## Evidence
- backend/database evidence summary: Not included in the static packaged example.
- hardware/runtime evidence summary: The example gate reported synchronized state before the UI check; the row then modeled a bridge disconnect condition.
- logs / markers: Reserved under examples/iot-dashboard/expected-artifacts/ for project-specific notes or logs.
- screenshots / recording pointers: Reserved under examples/iot-dashboard/expected-artifacts/screenshots/IOT-DASH-002-alerts-panel.png.

## Follow-on action
Inspect the alerts-state update path and rerun the row after the UI refresh logic is fixed.
