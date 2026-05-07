# CDP adapter

This adapter packages a small Chrome DevTools Protocol helper for AHTO UI checks.

Included in this directory:
- `cdp_ui.mjs` — CLI helper for listing CDP page targets, activating a target, navigating an existing page, asserting text via a CSS selector, and capturing screenshots

## Public-safety constraints

This packaged adapter intentionally avoids private environment assumptions:
- no hardcoded browser profiles
- no hardcoded local workspace paths
- no user-specific hostnames or machine names
- no bundled browser-launch script or login state

The adapter only connects to an already-running Chromium-based browser that has remote debugging enabled.

## Required runtime setup

Before using the adapter, start a compatible browser with a CDP endpoint exposed, for example with a flag such as:

```bash
--remote-debugging-port=9222
```

The browser startup flow is intentionally left outside this repo so teams can use their own profile, container, CI, or ephemeral browser strategy.

## Configuration

CLI flags:
- `--host` — CDP host, default `localhost`
- `--port` — CDP port, default `9222`
- `--url` — substring used to find the existing page target
- `--to` — destination URL for `navigate`
- `--selector` — CSS selector for `assertText`, default `body`
- `--text` — expected text for `assertText`
- `--out` — screenshot output path for `screenshot`, default `./cdp-screenshot.png`

Environment fallbacks:
- `AHTO_CDP_HOST`
- `AHTO_CDP_PORT`
- `AHTO_CDP_SCREENSHOT_OUT`

## Examples

List available page targets:

```bash
node adapters/cdp/cdp_ui.mjs list
```

Activate a page whose URL contains `/dashboard`:

```bash
node adapters/cdp/cdp_ui.mjs activate --url /dashboard
```

Navigate an existing target to a new route:

```bash
node adapters/cdp/cdp_ui.mjs navigate \
  --url /dashboard \
  --to http://localhost:3000/dashboard?panel=alerts
```

Assert that an `h2` contains `Alerts`:

```bash
node adapters/cdp/cdp_ui.mjs assertText \
  --url /dashboard \
  --selector h2 \
  --text Alerts
```

Capture a screenshot into a local artifacts directory:

```bash
node adapters/cdp/cdp_ui.mjs screenshot \
  --url /dashboard \
  --out ./artifacts/cdp/dashboard.png
```

## Verification

Local syntax check:

```bash
npm run check:cdp-adapter
```

This only validates that the packaged adapter parses cleanly. Live validation still requires a browser exposing a reachable CDP endpoint.
