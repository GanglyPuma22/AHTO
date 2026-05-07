#!/usr/bin/env node

// AHTO Notion adapter.
//
// Creates dated run pages from canonical Notion matrix pages, updates row results
// by Test ID, and resolves matrix names from a configurable Matrix Library page.
//
// This packaged version is intentionally public-safe:
// - no hardcoded private page IDs
// - no local-path assumptions
// - all Notion page IDs come from env vars or CLI flags

const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';

const CORE_SCHEMA_COLUMNS = [
  'Test ID',
  'Scenario',
  'Steps',
  'Expected UI',
  'Expected Hardware',
  'Scope',
  'Preconditions',
  'Pass/Fail signal',
  'Timing budget',
  'Browsers/Viewport',
  'Result',
  'Comments',
  'Issue Link',
  'Evidence',
];

const AUTONOMOUS_HINT_COLUMNS = [
  'UI Route',
  'UI Target Hints',
  'Selector Hints',
  'UI Action Notes',
];

function printUsageAndExit(code = 2) {
  console.error('Usage: node adapters/notion/notion_run.mjs matrices');
  console.error('   or: node adapters/notion/notion_run.mjs matrices --names "Login Matrix, Alerts Matrix"');
  console.error('   or: node adapters/notion/notion_run.mjs create --prefix "Integration Run"');
  console.error('   or: node adapters/notion/notion_run.mjs create --prefix "Integration Run" --matrixNames "Login Matrix, Alerts Matrix"');
  console.error('   or: node adapters/notion/notion_run.mjs populate --runPageId <RUN_PAGE_ID>');
  console.error('   or: node adapters/notion/notion_run.mjs populate --runPageId <RUN_PAGE_ID> --matrixNames "Login Matrix, Alerts Matrix"');
  console.error('   or: node adapters/notion/notion_run.mjs verify --runPageId <RUN_PAGE_ID>');
  console.error('   or: node adapters/notion/notion_run.mjs resume --runPageId <RUN_PAGE_ID>');
  console.error('   or: node adapters/notion/notion_run.mjs matrix --runPageId <RUN_PAGE_ID> --testId TEST-001');
  console.error('   or: node adapters/notion/notion_run.mjs matrix --matrixName "Login Matrix" --testId TEST-001');
  console.error('   or: node adapters/notion/notion_run.mjs matrix --matrixPageId <PAGE_ID> --testId TEST-001');
  console.error('   or: node adapters/notion/notion_run.mjs update --runPageId <RUN_PAGE_ID> --testId TEST-001 --result Pass --comments "..."');
  console.error('');
  console.error('Configuration inputs:');
  console.error('  NOTION_API_KEY            required for all live API calls');
  console.error('  RUN_PARENT_PAGE_ID        required for create');
  console.error('  MATRIX_LIBRARY_PAGE_ID    required for matrices or --matrixName resolution');
  console.error('  DEFAULT_MATRIX_PAGE_ID    required when no explicit matrix name/page id is supplied');
  console.error('');
  console.error('CLI flags can override page ids per invocation:');
  console.error('  --runParentPageId, --matrixLibraryPageId, --defaultMatrixPageId');
  process.exit(code);
}

function getArg(args, name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function getConfig(args) {
  return {
    runParentPageId: getArg(args, 'runParentPageId') || process.env.RUN_PARENT_PAGE_ID || '',
    matrixLibraryPageId: getArg(args, 'matrixLibraryPageId') || process.env.MATRIX_LIBRARY_PAGE_ID || '',
    defaultMatrixPageId: getArg(args, 'defaultMatrixPageId') || process.env.DEFAULT_MATRIX_PAGE_ID || '',
  };
}

function requireApiKey() {
  const key = process.env.NOTION_API_KEY;
  if (!key) {
    throw new Error('NOTION_API_KEY is required. Export a Notion integration token before using this adapter.');
  }
  return key;
}

function requirePageId(value, envName, purpose) {
  if (!value) {
    throw new Error(`${envName} is required ${purpose}. Supply it via env or CLI flag.`);
  }
  return normalizePageId(value);
}

function normalizePageId(pageId) {
  const normalized = (pageId || '').replace(/-/g, '').trim();
  if (!normalized) {
    throw new Error('Missing Notion page/block id.');
  }
  return normalized;
}

async function api(path, { method = 'GET', body } = {}) {
  const notionApiKey = requireApiKey();
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.message || text;
    throw new Error(`${method} ${path} -> ${res.status}: ${msg}`);
  }

  return json;
}

function isoUtcMinute() {
  return new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function cellText(cell) {
  if (!Array.isArray(cell)) return '';
  return cell.map((rt) => rt?.plain_text || '').join('');
}

function titleFromPage(page) {
  const props = page?.properties || {};
  for (const value of Object.values(props)) {
    if (value?.type === 'title') {
      return value.title?.map((t) => t.plain_text).join('') || 'Untitled';
    }
  }
  return page?.child_page?.title || page?.title || page?.id || 'Untitled';
}

function normalizeName(s) {
  return (s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreName(query, candidate) {
  const q = normalizeName(query);
  const c = normalizeName(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.startsWith(q) || q.startsWith(c)) return 92;
  if (c.includes(q) || q.includes(c)) return 85;
  const qTokens = new Set(q.split(' '));
  const cTokens = new Set(c.split(' '));
  const overlap = [...qTokens].filter((t) => cTokens.has(t));
  const ratio = overlap.length / Math.max(1, qTokens.size);
  return Math.round(60 * ratio);
}

function looksLikeCanonicalMatrixTitle(title) {
  return /matrix$/i.test((title || '').trim());
}

function inferMatrixSchema(headerCells) {
  const header = (headerCells || []).map((s) => (s || '').trim()).filter(Boolean);
  const missingCoreColumns = CORE_SCHEMA_COLUMNS.filter((col) => !header.includes(col));
  const missingAutonomousColumns = AUTONOMOUS_HINT_COLUMNS.filter((col) => !header.includes(col));
  const hasCoreSchema = missingCoreColumns.length === 0;
  const hasAutonomousHints = missingAutonomousColumns.length === 0;
  return {
    columnCount: header.length,
    hasCoreSchema,
    hasAutonomousHints,
    version: hasAutonomousHints ? 'autonomous-v2' : 'legacy-v1',
    missingCoreColumns,
    missingAutonomousColumns,
  };
}

function assertUsableMatrixSchema(matrixTitle, schema) {
  if (!schema.hasCoreSchema) {
    throw new Error(`Matrix "${matrixTitle}" is missing core columns: ${schema.missingCoreColumns.join(', ')}`);
  }
}

async function getPage(pageId) {
  return api(`/pages/${normalizePageId(pageId)}`);
}

async function listMatrixLibraryPages(config) {
  const matrixLibraryPageId = requirePageId(
    config.matrixLibraryPageId,
    'MATRIX_LIBRARY_PAGE_ID',
    'to list or resolve canonical matrix pages',
  );

  const children = await api(`/blocks/${matrixLibraryPageId}/children?page_size=100`);
  return children.results
    .filter((b) => b.type === 'child_page')
    .map((b) => ({ id: b.id, title: b.child_page?.title || 'Untitled' }))
    .filter((p) => looksLikeCanonicalMatrixTitle(p.title))
    .sort((a, b) => a.title.localeCompare(b.title));
}

async function getTableFromPage(pageId, { title } = {}) {
  const normalizedPageId = normalizePageId(pageId);
  const pageTitle = title || titleFromPage(await getPage(normalizedPageId));
  const children = await api(`/blocks/${normalizedPageId}/children?page_size=100`);
  const table = children.results.find((b) => b.type === 'table');
  if (!table) throw new Error(`Page ${pageId} (${pageTitle}) has no table block`);

  const rows = await api(`/blocks/${table.id}/children?page_size=200`);
  const tableRows = rows.results.filter((r) => r.type === 'table_row');
  const headerCells = tableRows[0]?.table_row?.cells?.map(cellText) || [];
  const schema = inferMatrixSchema(headerCells);
  assertUsableMatrixSchema(pageTitle, schema);

  return {
    pageId: normalizedPageId,
    pageTitle,
    tableId: table.id,
    tableMeta: table.table,
    tableRows,
    schema,
  };
}

async function getDefaultMatrixTable(config) {
  const defaultMatrixPageId = requirePageId(
    config.defaultMatrixPageId,
    'DEFAULT_MATRIX_PAGE_ID',
    'when running commands without an explicit --matrixName or --matrixPageId',
  );
  return getTableFromPage(defaultMatrixPageId, { title: 'Default Matrix' });
}

async function resolveMatrixNames(names, config) {
  const libraryPages = await listMatrixLibraryPages(config);
  if (libraryPages.length === 0) {
    throw new Error(
      `Matrix library page ${normalizePageId(config.matrixLibraryPageId)} has no canonical child matrix pages.`,
    );
  }

  const results = [];
  for (const name of names) {
    const scored = libraryPages
      .map((p) => ({ ...p, score: scoreName(name, p.title) }))
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    const top = scored[0];
    const second = scored[1];
    const topIsWeak = !top || top.score < 60;
    const isTied = Boolean(second && second.score === top?.score);

    if (topIsWeak || isTied) {
      const list = scored.slice(0, 8).map((s) => `${s.title} (${s.id})`).join('; ');
      throw new Error(
        `Ambiguous matrix name "${name}" within Matrix Library. Use the exact matrix title. Candidates: ${list || 'none'}`,
      );
    }

    results.push({ name, pageId: top.id, title: top.title, score: top.score });
  }

  return results;
}

async function resolveMatrixSource({ matrixPageId, matrixName } = {}, config) {
  if (matrixPageId) {
    return getTableFromPage(matrixPageId);
  }
  if (matrixName) {
    const [resolved] = await resolveMatrixNames([matrixName], config);
    return getTableFromPage(resolved.pageId, { title: resolved.title });
  }
  return getDefaultMatrixTable(config);
}

async function resolveRequestedMatrices(matrixNames, config) {
  if (!matrixNames.length) {
    const matrix = await getDefaultMatrixTable(config);
    return {
      mode: 'default-single',
      matrices: [{
        name: matrix.pageTitle,
        pageId: matrix.pageId,
        title: matrix.pageTitle,
        score: 100,
        ...matrix,
      }],
    };
  }

  const resolved = await resolveMatrixNames(matrixNames, config);
  const matrices = [];
  for (const item of resolved) {
    const matrix = await getTableFromPage(item.pageId, { title: item.title });
    matrices.push({
      ...item,
      ...matrix,
    });
  }

  return { mode: 'explicit', matrices };
}

function rowToPlainCells(rowBlock) {
  const cells = rowBlock?.table_row?.cells || [];
  return cells.map(cellText);
}

async function createRunPage(prefix, config) {
  const runParentPageId = requirePageId(
    config.runParentPageId,
    'RUN_PARENT_PAGE_ID',
    'to create a run page',
  );

  const title = `${prefix} - ${isoUtcMinute()}`;
  const page = await api('/pages', {
    method: 'POST',
    body: {
      parent: { page_id: runParentPageId },
      properties: {
        title: {
          title: [{ type: 'text', text: { content: title } }],
        },
      },
    },
  });

  return { pageId: page.id, title };
}

function toRowBlockFromCells(cells) {
  return {
    object: 'block',
    type: 'table_row',
    table_row: { cells },
  };
}

async function appendBlocks(parentBlockId, children) {
  return api(`/blocks/${normalizePageId(parentBlockId)}/children`, {
    method: 'PATCH',
    body: { children },
  });
}

async function createRunTable(runPageId, tableWidth, hasColumnHeader, rowsCells) {
  const header = rowsCells[0];
  const tableBlock = {
    object: 'block',
    type: 'table',
    table: {
      table_width: tableWidth,
      has_column_header: hasColumnHeader,
      has_row_header: false,
      children: [toRowBlockFromCells(header)],
    },
  };

  const resp = await appendBlocks(runPageId, [
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '🧪' },
        color: 'yellow_background',
        rich_text: [
          {
            type: 'text',
            text: {
              content:
                'Test run report: fill Result/Comments/Issue Link/Evidence per row. Update Notion immediately after each test case; do not batch.',
            },
          },
        ],
      },
    },
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Test Run' } }],
      },
    },
    tableBlock,
  ]);

  const newTable = resp.results.find((b) => b.type === 'table');
  if (!newTable) throw new Error('Failed to create run table');

  const remaining = rowsCells.slice(1).map(toRowBlockFromCells);
  const chunk = 50;
  for (let i = 0; i < remaining.length; i += chunk) {
    await appendBlocks(newTable.id, remaining.slice(i, i + chunk));
  }

  return newTable.id;
}

async function appendMatrixToRunPage(runPageId, matrixTitle, rowsCells) {
  const header = rowsCells[0];
  const tableBlock = {
    object: 'block',
    type: 'table',
    table: {
      table_width: header.length,
      has_column_header: true,
      has_row_header: false,
      children: [toRowBlockFromCells(header)],
    },
  };

  const resp = await appendBlocks(runPageId, [
    {
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: matrixTitle } }] },
    },
    tableBlock,
  ]);

  const newTable = resp.results.find((b) => b.type === 'table');
  if (!newTable) throw new Error('Failed to append matrix table');

  const remaining = rowsCells.slice(1).map(toRowBlockFromCells);
  const chunk = 50;
  for (let i = 0; i < remaining.length; i += chunk) {
    await appendBlocks(newTable.id, remaining.slice(i, i + chunk));
  }

  return newTable.id;
}

async function appendRunHeader(runPageId, title = 'Test Run') {
  await appendBlocks(runPageId, [
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '🧪' },
        color: 'yellow_background',
        rich_text: [
          {
            type: 'text',
            text: {
              content:
                'Test run report: fill Result/Comments/Issue Link/Evidence per row. Update Notion immediately after each test case; do not batch.',
            },
          },
        ],
      },
    },
    {
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: title } }] },
    },
  ]);
}

async function appendStatusCallout(runPageId, title, lines, color = 'gray_background') {
  const text = [title, ...lines].filter(Boolean).join('\n');
  await appendBlocks(runPageId, [
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '🧭' },
        color,
        rich_text: [
          {
            type: 'text',
            text: { content: text },
          },
        ],
      },
    },
  ]);
}

function summarizeMatrix(matrix) {
  const rows = matrix.tableRows.length - 1;
  const hintStatus = matrix.schema.hasAutonomousHints
    ? 'autonomous hints present'
    : 'legacy schema (no autonomous UI-hint columns)';
  return `${matrix.title || matrix.pageTitle}: ${rows} rows, schema=${matrix.schema.version}, ${hintStatus}, page=${matrix.pageId}`;
}

async function findRunTables(runPageId) {
  const children = await api(`/blocks/${normalizePageId(runPageId)}/children?page_size=100`);
  const tables = children.results.filter((b) => b.type === 'table').map((b) => b.id);
  if (!tables.length) throw new Error('Run page has no table block');
  return tables;
}

function looksLikeHeaderRow(rowBlock) {
  const first = cellText(rowBlock?.table_row?.cells?.[0] || []).trim().toLowerCase();
  return first === 'test id' || first === 'testid' || first === 'id' || first.includes('test');
}

function findColumnIndex(headerCells, nameVariants) {
  const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const headers = headerCells.map(norm);
  for (const v of nameVariants) {
    const idx = headers.indexOf(norm(v));
    if (idx >= 0) return idx;
  }
  return -1;
}

async function getRunTableRows(runPageId) {
  const tableIds = await findRunTables(runPageId);
  const tables = [];
  for (const tableId of tableIds) {
    const rows = await api(`/blocks/${tableId}/children?page_size=200`);
    const trs = rows.results.filter((r) => r.type === 'table_row');
    tables.push({ tableId, rows: trs });
  }
  return tables;
}

async function updateResult({ runPageId, testId, result, comments, issueLink, evidence }) {
  const tables = await getRunTableRows(runPageId);
  const matches = [];

  for (const t of tables) {
    const target = t.rows.find((r) => cellText(r.table_row.cells[0]).trim() === testId);
    if (target) matches.push({ tableId: t.tableId, row: target, rows: t.rows });
  }

  if (matches.length === 0) throw new Error(`Could not find row with Test ID ${testId}`);
  if (matches.length > 1) {
    const ids = matches.map((m) => m.row.id).join(', ');
    throw new Error(`Ambiguous Test ID ${testId} across multiple tables: ${ids}`);
  }

  const { tableId, row: target, rows } = matches[0];
  const cells = target.table_row.cells;

  const headerRow = looksLikeHeaderRow(rows[0]) ? rows[0] : null;
  const headerCells = headerRow ? rowToPlainCells(headerRow) : [];
  const idxResult = findColumnIndex(headerCells, ['Result']);
  const idxComments = findColumnIndex(headerCells, ['Comments', 'Comment', 'Issues', 'Comments / Issues']);
  const idxIssue = findColumnIndex(headerCells, ['Issue Link', 'Issue', 'Issue URL', 'Link']);
  const idxEvidence = findColumnIndex(headerCells, ['Evidence', 'Evidence Link']);

  function txt(t) {
    return t ? [{ type: 'text', text: { content: t } }] : [];
  }

  const fallbackResult = 10;
  const fallbackComments = 11;
  const fallbackIssue = 12;
  const fallbackEvidence = 13;

  const ensureIndex = (i) => {
    while (cells.length <= i) cells.push([]);
  };

  const rIdx = idxResult >= 0 ? idxResult : fallbackResult;
  const cIdx = idxComments >= 0 ? idxComments : fallbackComments;
  const iIdx = idxIssue >= 0 ? idxIssue : fallbackIssue;
  const eIdx = idxEvidence >= 0 ? idxEvidence : fallbackEvidence;

  [rIdx, cIdx, iIdx, eIdx].forEach(ensureIndex);
  cells[rIdx] = txt(result || '');
  cells[cIdx] = txt(comments || '');
  cells[iIdx] = txt(issueLink || '');
  cells[eIdx] = txt(evidence || '');

  await api(`/blocks/${target.id}`, {
    method: 'PATCH',
    body: { table_row: { cells } },
  });

  return { tableId, rowId: target.id };
}

async function computeResumeState(runPageId) {
  const tables = await getRunTableRows(runPageId);
  if (tables.length === 0) throw new Error('Run page has no table block');

  const dataRows = [];
  const tableResultIdx = new Map();
  for (const t of tables) {
    const trs = t.rows;
    if (trs.length === 0) continue;
    const headerRow = trs.length > 0 && looksLikeHeaderRow(trs[0]) ? trs[0] : null;
    const headerCells = headerRow ? rowToPlainCells(headerRow) : [];
    const idx = findColumnIndex(headerCells, ['Result']);
    tableResultIdx.set(t.tableId, idx >= 0 ? idx : 10);

    const body = headerRow ? trs.slice(1) : trs;
    const rows = body.filter((r) => cellText(r.table_row.cells[0]).trim().length > 0);
    for (const r of rows) dataRows.push({ tableId: t.tableId, row: r });
  }

  const getResult = (r, tableId) => {
    const idx = tableResultIdx.get(tableId) ?? 10;
    return cellText(r.table_row.cells[idx] || []).trim();
  };

  const isEffectivelyBlank = (res) => {
    if (!res) return true;
    const norm = res.toLowerCase().replace(/\s+/g, ' ').trim();
    return norm === 'not run';
  };

  let lastDone = null;
  let next = null;
  for (const item of dataRows) {
    const id = cellText(item.row.table_row.cells[0]).trim();
    const res = getResult(item.row, item.tableId);
    if (!isEffectivelyBlank(res)) {
      lastDone = { testId: id, result: res, rowId: item.row.id, tableId: item.tableId };
    }
    if (isEffectivelyBlank(res) && !next) {
      next = { testId: id, rowId: item.row.id, tableId: item.tableId };
    }
  }

  const tableIds = tables.map((t) => t.tableId);
  return { runPageId, tableIds, lastDone, next };
}

async function main() {
  const argv = process.argv.slice(2);
  const [cmd, ...args] = argv;

  if (!cmd || ['help', '--help', '-h'].includes(cmd)) {
    printUsageAndExit(cmd ? 0 : 2);
  }

  if (!['create', 'populate', 'update', 'verify', 'resume', 'matrix', 'matrices'].includes(cmd)) {
    printUsageAndExit(2);
  }

  const config = getConfig(args);

  if (cmd === 'create') {
    const prefix = getArg(args, 'prefix') || 'Integration Run';
    const matrixNames = (getArg(args, 'matrixNames') || getArg(args, 'matrices') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const resolvedSet = await resolveRequestedMatrices(matrixNames, config);
    const run = await createRunPage(prefix, config);

    try {
      if (resolvedSet.mode === 'default-single') {
        const [matrix] = resolvedSet.matrices;
        const rowsCells = matrix.tableRows.map((r) => r.table_row.cells);
        const width = rowsCells[0]?.length || matrix.tableMeta.table_width;
        const tableId = await createRunTable(run.pageId, width, true, rowsCells);
        await appendStatusCallout(run.pageId, 'Run Status', [
          `Run: ${run.title}`,
          'Mode: default single matrix',
          `Run parent: ${requirePageId(config.runParentPageId, 'RUN_PARENT_PAGE_ID', 'for create')}`,
          `Source: ${summarizeMatrix(matrix)}`,
          `Table copied: ${tableId}`,
        ]);
        console.log(JSON.stringify({
          runPageId: run.pageId,
          title: run.title,
          tableId,
          sourceMatrix: {
            pageId: matrix.pageId,
            title: matrix.pageTitle,
            schema: matrix.schema,
          },
        }, null, 2));
        return;
      }

      await appendRunHeader(run.pageId, 'Test Run');
      await appendStatusCallout(run.pageId, 'Run Status', [
        `Run: ${run.title}`,
        'Mode: explicit matrix set',
        `Run parent: ${requirePageId(config.runParentPageId, 'RUN_PARENT_PAGE_ID', 'for create')}`,
        `Matrix library: ${requirePageId(config.matrixLibraryPageId, 'MATRIX_LIBRARY_PAGE_ID', 'for matrix-name resolution')}`,
        `Matrices requested: ${matrixNames.join(', ')}`,
        ...resolvedSet.matrices.map((m) => `Resolved: ${summarizeMatrix(m)}`),
      ]);

      const appended = [];
      for (const matrix of resolvedSet.matrices) {
        const rowsCells = matrix.tableRows.map((r) => r.table_row.cells);
        const tableId = await appendMatrixToRunPage(run.pageId, matrix.title, rowsCells);
        appended.push({
          name: matrix.name,
          title: matrix.title,
          pageId: matrix.pageId,
          tableId,
          rows: rowsCells.length - 1,
          schema: matrix.schema,
        });
      }

      await appendStatusCallout(run.pageId, 'Run Status', [
        `Tables copied: ${appended.length}`,
        ...appended.map((a) => `${a.title}: ${a.rows} rows, schema=${a.schema.version} (table ${a.tableId})`),
      ]);

      console.log(JSON.stringify({ runPageId: run.pageId, title: run.title, matrices: appended }, null, 2));
      return;
    } catch (err) {
      const msg = err?.message || String(err);
      await appendStatusCallout(run.pageId, 'Run Error', [msg], 'red_background');
      throw err;
    }
  }

  if (cmd === 'populate') {
    const runPageId = getArg(args, 'runPageId');
    if (!runPageId) throw new Error('Missing --runPageId');

    const matrixNames = (getArg(args, 'matrixNames') || getArg(args, 'matrices') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const resolvedSet = await resolveRequestedMatrices(matrixNames, config);

    if (resolvedSet.mode === 'default-single') {
      const [matrix] = resolvedSet.matrices;
      const rowsCells = matrix.tableRows.map((r) => r.table_row.cells);
      const width = rowsCells[0]?.length || matrix.tableMeta.table_width;
      const tableId = await createRunTable(runPageId, width, true, rowsCells);
      console.log(JSON.stringify({
        ok: true,
        runPageId,
        tableId,
        sourceMatrix: {
          pageId: matrix.pageId,
          title: matrix.pageTitle,
          schema: matrix.schema,
        },
      }, null, 2));
      return;
    }

    await appendRunHeader(runPageId, 'Test Run');
    const appended = [];
    for (const matrix of resolvedSet.matrices) {
      const rowsCells = matrix.tableRows.map((r) => r.table_row.cells);
      const tableId = await appendMatrixToRunPage(runPageId, matrix.title, rowsCells);
      appended.push({
        name: matrix.name,
        title: matrix.title,
        pageId: matrix.pageId,
        tableId,
        schema: matrix.schema,
      });
    }
    console.log(JSON.stringify({ ok: true, runPageId, matrices: appended }, null, 2));
    return;
  }

  if (cmd === 'verify') {
    const runPageId = getArg(args, 'runPageId');
    if (!runPageId) throw new Error('Missing --runPageId');

    const children = await api(`/blocks/${normalizePageId(runPageId)}/children?page_size=100`);
    const types = children.results.map((b) => b.type);
    const tables = children.results.filter((b) => b.type === 'table').map((b) => b.id);
    console.log(JSON.stringify({ ok: true, runPageId, childCount: children.results.length, types, tableIds: tables }, null, 2));
    process.exit(tables.length ? 0 : 3);
  }

  if (cmd === 'resume') {
    const runPageId = getArg(args, 'runPageId');
    if (!runPageId) throw new Error('Missing --runPageId');

    const state = await computeResumeState(runPageId);
    console.log(JSON.stringify({ ok: true, ...state }, null, 2));
    process.exit(state.next ? 0 : 4);
  }

  if (cmd === 'matrix') {
    const testId = getArg(args, 'testId');
    if (!testId) throw new Error('Missing --testId');

    const runPageId = getArg(args, 'runPageId');
    if (runPageId) {
      const tables = await getRunTableRows(runPageId);
      for (const t of tables) {
        const trs = t.rows;
        if (!trs.length) continue;
        const headerRow = looksLikeHeaderRow(trs[0]) ? trs[0] : null;
        const header = headerRow ? rowToPlainCells(headerRow) : [];
        const body = headerRow ? trs.slice(1) : trs;
        const target = body.find((r) => cellText(r.table_row.cells[0]).trim() === testId);
        if (!target) continue;
        const targetCells = rowToPlainCells(target);
        const obj = {};
        for (let i = 0; i < Math.max(header.length, targetCells.length); i += 1) {
          const key = (header[i] || `col_${i}`).trim() || `col_${i}`;
          obj[key] = (targetCells[i] || '').trim();
        }
        console.log(JSON.stringify({ ok: true, runPageId, tableId: t.tableId, testId, rowId: target.id, row: obj }, null, 2));
        return;
      }
      throw new Error(`Could not find Test ID ${testId} in run page ${runPageId}`);
    }

    const matrixName = getArg(args, 'matrixName');
    const matrixPageId = getArg(args, 'matrixPageId');
    const sourceMatrix = await resolveMatrixSource({ matrixName, matrixPageId }, config);
    const plainRows = sourceMatrix.tableRows.map((r) => ({ id: r.id, cells: rowToPlainCells(r) }));
    const header = plainRows[0]?.cells || [];
    const target = plainRows.find((r) => (r.cells[0] || '').trim() === testId);
    if (!target) {
      throw new Error(`Could not find matrix row for Test ID ${testId} in ${sourceMatrix.pageTitle}`);
    }

    const obj = {};
    for (let i = 0; i < Math.max(header.length, target.cells.length); i += 1) {
      const key = (header[i] || `col_${i}`).trim() || `col_${i}`;
      obj[key] = (target.cells[i] || '').trim();
    }

    console.log(JSON.stringify({
      ok: true,
      matrixPageId: sourceMatrix.pageId,
      matrixTitle: sourceMatrix.pageTitle,
      matrixTableId: sourceMatrix.tableId,
      matrixSchema: sourceMatrix.schema,
      testId,
      rowId: target.id,
      row: obj,
    }, null, 2));
    return;
  }

  if (cmd === 'matrices') {
    const namesRaw = getArg(args, 'names') || getArg(args, 'matrixNames') || '';
    const names = namesRaw.split(',').map((s) => s.trim()).filter(Boolean);

    if (names.length === 0) {
      const pages = await listMatrixLibraryPages(config);
      const details = [];
      for (const page of pages) {
        const matrix = await getTableFromPage(page.id, { title: page.title });
        details.push({
          pageId: page.id,
          title: page.title,
          rows: Math.max(0, matrix.tableRows.length - 1),
          schema: matrix.schema,
        });
      }
      console.log(JSON.stringify({
        ok: true,
        matrixLibraryPageId: requirePageId(config.matrixLibraryPageId, 'MATRIX_LIBRARY_PAGE_ID', 'for matrices'),
        runParentPageId: config.runParentPageId ? normalizePageId(config.runParentPageId) : null,
        defaultMatrixPageId: config.defaultMatrixPageId ? normalizePageId(config.defaultMatrixPageId) : null,
        matrices: details,
      }, null, 2));
      return;
    }

    const resolved = await resolveMatrixNames(names, config);
    const details = [];
    for (const item of resolved) {
      const matrix = await getTableFromPage(item.pageId, { title: item.title });
      details.push({
        requestedName: item.name,
        pageId: item.pageId,
        title: item.title,
        score: item.score,
        rows: Math.max(0, matrix.tableRows.length - 1),
        schema: matrix.schema,
      });
    }
    console.log(JSON.stringify({
      ok: true,
      matrixLibraryPageId: requirePageId(config.matrixLibraryPageId, 'MATRIX_LIBRARY_PAGE_ID', 'for matrices'),
      matrices: details,
    }, null, 2));
    return;
  }

  if (cmd === 'update') {
    const runPageId = getArg(args, 'runPageId');
    const testId = getArg(args, 'testId');
    if (!runPageId || !testId) throw new Error('Missing --runPageId or --testId');

    const result = getArg(args, 'result') || '';
    const comments = getArg(args, 'comments') || '';
    const issueLink = getArg(args, 'issueLink') || '';
    const evidence = getArg(args, 'evidence') || '';

    const out = await updateResult({ runPageId, testId, result, comments, issueLink, evidence });
    console.log(JSON.stringify({ ok: true, ...out }, null, 2));
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
