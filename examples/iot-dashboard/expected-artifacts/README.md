# Expected artifacts

This directory shows the intended artifact layout for the sanitized IoT dashboard example.

## Layout

- `defects/` — structured defect outputs for actionable failures
- `runs/` — pass-level run summaries
- `screenshots/` — reserved location for UI evidence files

## Included sample outputs

- `defects/example-iot-dashboard-stale-alert/record.json`
- `defects/example-iot-dashboard-stale-alert/record.md`
- `runs/example-iot-dashboard-pass-01/summary.json`
- `runs/example-iot-dashboard-pass-01/summary.md`

These files now reflect the richer v0.2 contract shape:
- mode + lifecycle metadata
- matrix family / revision / checkpoint id
- richer row-outcome counts
- compatibility rollups retained for legacy consumers
