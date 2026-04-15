# Notion adapter

This adapter lets AHTO use Notion as a test-matrix source and as a lightweight run-status surface.

Included in this directory:
- `notion_run.mjs` — CLI helper for listing test-matrices, creating run pages, populating run tables, reading rows, resuming execution state, and updating row results by `Test ID`

## Public-safety constraints

This packaged adapter intentionally removes private defaults:
- no hardcoded Notion page IDs
- no local path assumptions
- no baked-in user or workspace details
- all live page IDs must be supplied by environment variables or CLI flags

## Required configuration

`NOTION_API_KEY` is required for all live calls.

Depending on the command, you may also need:
- `RUN_PARENT_PAGE_ID` — parent page where new run pages will be created
- `MATRIX_LIBRARY_PAGE_ID` — parent page whose child pages contain canonical test-matrices
- `DEFAULT_MATRIX_PAGE_ID` — fallback test-matrix page when you do not pass `--matrixName` or `--matrixPageId`

You can override page IDs per invocation with:
- `--runParentPageId`
- `--matrixLibraryPageId`
- `--defaultMatrixPageId`

## Expected test-matrix shape

The adapter expects a canonical test-matrix table with these core columns:
- `Test ID`
- `Scenario`
- `Steps`
- `Expected UI`
- `Expected Hardware`
- `Scope`
- `Preconditions`
- `Pass/Fail signal`
- `Timing budget`
- `Browsers/Viewport`
- `Result`
- `Comments`
- `Issue Link`
- `Evidence`

Optional autonomous-hint columns:
- `UI Route`
- `UI Target Hints`
- `Selector Hints`
- `UI Action Notes`

## Examples

List canonical test-matrices:

```bash
NOTION_API_KEY=... \
MATRIX_LIBRARY_PAGE_ID=... \
node adapters/notion/notion_run.mjs matrices
```

Create a run page from a default test-matrix:

```bash
NOTION_API_KEY=... \
RUN_PARENT_PAGE_ID=... \
DEFAULT_MATRIX_PAGE_ID=... \
node adapters/notion/notion_run.mjs create --prefix "Integration Run"
```

Create a run page from named test-matrices:

```bash
NOTION_API_KEY=... \
RUN_PARENT_PAGE_ID=... \
MATRIX_LIBRARY_PAGE_ID=... \
node adapters/notion/notion_run.mjs create \
  --prefix "Integration Run" \
  --matrixNames "Login Matrix, Alerts Matrix"
```

Update a row result:

```bash
NOTION_API_KEY=... \
node adapters/notion/notion_run.mjs update \
  --runPageId <RUN_PAGE_ID> \
  --testId TEST-001 \
  --result Pass \
  --comments "Observed expected behavior" \
  --issueLink "" \
  --evidence "logs/TEST-001.txt"
```

Resume run state:

```bash
NOTION_API_KEY=... \
node adapters/notion/notion_run.mjs resume --runPageId <RUN_PAGE_ID>
```

## Verification

Local syntax check:

```bash
npm run check:notion-adapter
```

This only validates the packaged adapter parses cleanly. Live validation still requires a real Notion integration token and safe test pages.
