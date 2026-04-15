#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

function nowIso() { return new Date().toISOString(); }
function slugify(value) {
  return String(value || 'defect').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'defect';
}
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}
async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }
async function writeJson(p, obj) { await ensureDir(path.dirname(p)); await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n'); }
async function writeText(p, text) { await ensureDir(path.dirname(p)); await fs.writeFile(p, text); }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseDir = args.outDir || path.resolve(process.cwd(), 'output/defects');
  const runId = args.runId || args['run-id'] || 'unknown-run';
  const rowId = args.rowId || args['row-id'] || 'unknown-row';
  const matrix = args.matrix || 'unknown-matrix';
  const summary = args.summary || 'unspecified defect';
  const defectId = `${nowIso().slice(0,19).replace(/[:T]/g,'-')}-${slugify(rowId + '-' + summary)}`;
  const dir = path.join(baseDir, defectId);
  const record = {
    defectId,
    createdAt: nowIso(),
    runId,
    passNumber: Number(args.passNumber || args['pass-number'] || 1),
    matrixName: matrix,
    rowId,
    mode: args.mode || 'unknown',
    failureKind: args.failureKind || args['failure-kind'] || 'unknown',
    severity: args.severity || 'unknown',
    recommendedNextOwner: args.nextOwner || args['next-owner'] || 'investigation',
    summary,
    expectedResult: args.expected || '',
    actualResult: args.actual || '',
    uiRoute: args.uiRoute || args['ui-route'] || '',
    selectorHints: args.selectorHints || args['selector-hints'] || '',
    rowActionSummary: args.rowActionSummary || args['row-action-summary'] || '',
    timingWindow: args.timingWindow || args['timing-window'] || '',
    retryPolicy: args.retryPolicy || args['retry-policy'] || '',
    firebaseEvidence: args.firebase || '',
    hardwareEvidence: args.hardware || '',
    logs: args.logs || '',
    screenshots: args.screenshots || '',
    followOnAction: args.followOn || args['follow-on'] || ''
  };

  await writeJson(path.join(dir, 'record.json'), record);
  await writeText(path.join(dir, 'record.md'), `# Defect Record\n\n## Identity\n- defect id: ${record.defectId}\n- run id: ${record.runId}\n- pass number: ${record.passNumber}\n- matrix name: ${record.matrixName}\n- row id: ${record.rowId}\n- mode: ${record.mode}\n\n## Classification\n- failure kind: ${record.failureKind}\n- severity / impact: ${record.severity}\n- recommended next owner: ${record.recommendedNextOwner}\n\n## Summary\n- short summary: ${record.summary}\n- expected result: ${record.expectedResult || '-'}\n- actual result: ${record.actualResult || '-'}\n\n## Reproduction / row context\n- UI route: ${record.uiRoute || '-'}\n- selector hints used: ${record.selectorHints || '-'}\n- row action summary: ${record.rowActionSummary || '-'}\n- timing window / retry policy: ${[record.timingWindow, record.retryPolicy].filter(Boolean).join(' / ') || '-'}\n\n## Evidence\n- backend/database evidence summary: ${record.firebaseEvidence || '-'}\n- hardware/runtime evidence summary: ${record.hardwareEvidence || '-'}\n- logs / markers: ${record.logs || '-'}\n- screenshots / recording pointers: ${record.screenshots || '-'}\n\n## Follow-on action\n${record.followOnAction || '-'}\n`);

  console.log(JSON.stringify({ ok: true, defectId, outDir: dir, record }, null, 2));
}

main().catch(err => {
  console.error(err.stack || String(err));
  process.exit(1);
});
