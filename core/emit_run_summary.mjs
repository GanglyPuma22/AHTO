#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function nowIso() { return new Date().toISOString(); }
function slugify(value) {
  return String(value || 'run-summary')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'run-summary';
}
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i += 1; }
    } else out._.push(a);
  }
  return out;
}
async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }
async function writeJson(p, obj) { await ensureDir(path.dirname(p)); await fs.writeFile(p, `${JSON.stringify(obj, null, 2)}\n`); }
async function writeText(p, text) { await ensureDir(path.dirname(p)); await fs.writeFile(p, text); }

function csv(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function buildRunSummaryRecord(input = {}) {
  const createdAt = input.createdAt || nowIso();
  const runId = input.runId || input['run-id'] || 'unknown-run';
  const passNumber = num(input.passNumber || input['pass-number'] || 1, 1);
  const summaryId = input.summaryId || `${createdAt.slice(0, 19).replace(/[:T]/g, '-')}-${slugify(`${runId}-pass-${passNumber}`)}`;

  const rowsPassed = num(input.rowsPassed || input['rows-passed']);
  const rowsFailed = num(input.rowsFailed || input['rows-failed']);
  const rowsBlockedEnv = num(input.rowsBlockedEnv || input['rows-blocked-env']);
  const rowsBlockedDefect = num(input.rowsBlockedDefect || input['rows-blocked-defect']);
  const rowsFlaky = num(input.rowsFlaky || input['rows-flaky']);

  return {
    summaryId,
    createdAt,
    runId,
    passNumber,
    mode: input.mode || 'unknown',
    matrixId: input.matrixId || '',
    matrixFamily: input.matrixFamily || '',
    matrixRevision: input.matrixRevision || '',
    lifecycleStage: input.lifecycleStage || '',
    checkpointId: input.checkpointId || '',
    matrices: Array.isArray(input.matrices) ? input.matrices : csv(input.matrices),
    rowsPassed,
    rowsFailed,
    rowsBlockedEnv,
    rowsBlockedDefect,
    rowsFlaky,
    rowsProductDefect: num(input.rowsProductDefect || input['rows-product-defect']),
    rowsRigBlocked: num(input.rowsRigBlocked || input['rows-rig-blocked']),
    rowsEnvironmentBlocked: num(input.rowsEnvironmentBlocked || input['rows-environment-blocked']),
    rowsMatrixDefect: num(input.rowsMatrixDefect || input['rows-matrix-defect']),
    rowsFrameworkDefect: num(input.rowsFrameworkDefect || input['rows-framework-defect']),
    rowsUiContractDefect: num(input.rowsUiContractDefect || input['rows-ui-contract-defect']),
    rowsNotRun: num(input.rowsNotRun || input['rows-not-run']),
    keyFindings: Array.isArray(input.keyFindings)
      ? input.keyFindings.filter(Boolean)
      : [input.finding1, input.finding2, input.finding3].filter(Boolean),
    defects: Array.isArray(input.defects) ? input.defects : csv(input.defects),
    recommendation: input.recommendation || 'investigation',
  };
}

function summaryMarkdown(record) {
  return `# Run Summary\n\n## Identity\n- summary id: ${record.summaryId}\n- run id: ${record.runId}\n- pass number: ${record.passNumber}\n- mode: ${record.mode}\n- matrix id: ${record.matrixId || '-'}\n- matrix family: ${record.matrixFamily || '-'}\n- matrix revision: ${record.matrixRevision || '-'}\n- lifecycle stage: ${record.lifecycleStage || '-'}\n- checkpoint id: ${record.checkpointId || '-'}\n- matrices included: ${record.matrices.join(', ') || '-'}\n\n## Outcome counts\n- rows passed: ${record.rowsPassed}\n- actionable failed rows (legacy rollup): ${record.rowsFailed}\n- rows blocked by environment/rig (legacy rollup): ${record.rowsBlockedEnv}\n- rows blocked by product defect (legacy field retained for compatibility): ${record.rowsBlockedDefect}\n- rows unresolved / flaky: ${record.rowsFlaky}\n- product defects: ${record.rowsProductDefect}\n- rig blocked: ${record.rowsRigBlocked}\n- environment blocked: ${record.rowsEnvironmentBlocked}\n- matrix defects: ${record.rowsMatrixDefect}\n- framework defects: ${record.rowsFrameworkDefect}\n- UI-contract defects: ${record.rowsUiContractDefect}\n- not run: ${record.rowsNotRun}\n\n## Key findings\n${record.keyFindings.length ? record.keyFindings.map((item) => `- ${item}`).join('\n') : '- none'}\n\n## Defect outputs\n${record.defects.length ? record.defects.map((d) => `- ${d}`).join('\n') : '- none'}\n\n## Recommendation\n- ${record.recommendation}\n`;
}

export async function emitRunSummaryRecord({ record, outDir }) {
  const dir = path.join(outDir, record.summaryId);
  await writeJson(path.join(dir, 'summary.json'), record);
  await writeText(path.join(dir, 'summary.md'), summaryMarkdown(record));
  return { outDir: dir, record };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseDir = args.outDir || path.resolve(process.cwd(), 'output/runs');
  const record = buildRunSummaryRecord(args);
  const out = await emitRunSummaryRecord({ record, outDir: baseDir });
  console.log(JSON.stringify({ ok: true, summaryId: record.summaryId, outDir: out.outDir, record }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.stack || String(err));
    process.exit(1);
  });
}
