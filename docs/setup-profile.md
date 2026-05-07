# Setup profile contract

AHTO does not pretend serious hardware-backed testing is zero-config.
It also should not make users perform a giant setup ceremony before the first useful action.

## v0.2 posture
Profiles declare the minimum runtime truth the framework needs.
The setup assistant can then:
- inspect what is missing
- explain why an input matters
- optionally prompt for missing values interactively
- avoid baking secrets into repo files

Current helper:
- [`../core/setup_assistant.mjs`](../core/setup_assistant.mjs)

## Profile fields worth declaring
A profile should declare:
- `profileId`
- supported `executionModes`
- `defaultMode`
- `setupInputs`
- `hardwareSync` contract
- adapter wiring
- artifact locations
- matrix lifecycle pointers when useful

## Setup input shape
Each setup input can declare:
- `key` — usually an environment variable name
- `source` — currently `env`
- `required` — default true
- `description` — why the input matters
- `example` — safe example value or shape
- `defaultValue` — if there is a reasonable non-secret default

## Example usage
Inspect the IoT dashboard profile without prompting:

```bash
node core/setup_assistant.mjs inspect --profile ./examples/iot-dashboard/profile.json
```

Structured JSON inspection:

```bash
node core/setup_assistant.mjs inspect --profile ./examples/iot-dashboard/profile.json --json
```

Prompt only for missing required values:

```bash
node core/setup_assistant.mjs prompt --profile ./examples/iot-dashboard/profile.json
```

## Why this matters
This is the v0.2 answer to the setup-UX problem:
- honest about project-specific truth
- lighter than a giant manual bootstrap document
- safer than storing operator-specific defaults inside the repo

It is still a small step.
Future live adapters can consume the same profile contract more deeply.
