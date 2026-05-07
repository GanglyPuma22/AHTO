#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function nowIso() { return new Date().toISOString(); }
function slugify(value) {
  return String(value || 'defect')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'defect';
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

export function buildDefectRecord(input = {}) {
  const createdAt = input.createdAt || nowIso();
  const summary = input.summary || 'unspecified defect';
  const rowId = input.rowId || input.testId || 'unknown-row';
  const defectId = input.defectId || `${createdAt.slice(0, 19).replace(/[:T]/g, '-')}-${slugify(`${rowId}-${summary}`)}`;

  return {
    defectId,
    createdAt,
    runId: input.runId || 'unknown-run',
    passNumber: Number(input.passNumber || 1),
    matrixId: input.matrixId || '',
    matrixName: input.matrixName || input.matrix || 'unknown-matrix',
    matrixFamily: input.matrixFamily || '',
    matrixRevision: input.matrixRevision || '',
    checkpointId: input.checkpointId || '',
    rowId,
    mode: input.mode || 'unknown',
    lifecycleStage: input.lifecycleStage || '',
    outcomeKind: input.outcomeKind || input.failureKind || input['failure-kind'] || 'unknown',
    failureKind: input.failureKind || input['failure-kind'] || input.outcomeKind || 'unknown',
    classificationFamily: input.classificationFamily || input.failureKind || input.outcomeKind || 'unknown',
    severity: input.severity || 'unknown',
    recommendedNextOwner: input.nextOwner || input['next-owner'] || input.recommendedNextOwner || 'investigation',
    summary,
    expectedResult: input.expected || input.expectedResult || '',
    actualResult: input.actual || input.actualResult || '',
    uiRoute: input.uiRoute || input['ui-route'] || '',
    selectorHints: input.selectorHints || input['selector-hints'] || '',
    rowActionSummary: input.rowActionSummary || input['row-action-summary'] || '',
    timingWindow: input.timingWindow || input['timing-window'] || '',
    retryPolicy: input.retryPolicy || input['retry-policy'] || '',
    backendEvidence: input.backendEvidence || input.firebase || '',
    hardwareEvidence: input.hardwareEvidence || input.hardware || '',
    logs: input.logs || '',
    screenshots: input.screenshots || '',
    evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs : csv(input.evidenceRefs || input.evidence || ''),
    followOnAction: input.followOn || input['follow-on'] || input.followOnAction || '',
    issueRoutingHint: input.issueRoutingHint || '',
  };
}

function defectMarkdown(record) {
  return `# Defect Record\n\n## Identity\n- defect id: ${record.defectId}\n- run id: ${record.runId}\n- pass number: ${record.passNumber}\n- matrix id: ${record.matrixId || '-'}\n- matrix name: ${record.matrixName}\n- matrix family: ${record.matrixFamily || '-'}\n- matrix revision: ${record.matrixRevision || '-'}\n- checkpoint id: ${record.checkpointId || '-'}\n- row id: ${record.rowId}\n- mode: ${record.mode}\n- lifecycle stage: ${record.lifecycleStage || '-'}\n\n## Classification\n- outcome kind: ${record.outcomeKind}\n- failure kind: ${record.failureKind}\n- classification family: ${record.classificationFamily}\n- severity / impact: ${record.severity}\n- recommended next owner: ${record.recommendedNextOwner}\n- issue routing hint: ${record.issueRoutingHint || '-'}\n\n## Summary\n- short summary: ${record.summary}\n- expected result: ${record.expectedResult || '-'}\n- actual result: ${record.actualResult || '-'}\n\n## Reproduction / row context\n- UI route: ${record.uiRoute || '-'}\n- selector hints used: ${record.selectorHints || '-'}\n- row action summary: ${record.rowActionSummary || '-'}\n- timing window / retry policy: ${[record.timingWindow, record.retryPolicy].filter(Boolean).join(' / ') || '-'}\n\n## Evidence\n- backend/database evidence summary: ${record.backendEvidence || '-'}\n- hardware/runtime evidence summary: ${record.hardwareEvidence || '-'}\n- logs / markers: ${record.logs || '-'}\n- screenshots / recording pointers: ${record.screenshots || '-'}\n${record.evidenceRefs.length ? `- explicit evidence refs:\n${record.evidenceRefs.map((item) => `  - ${item}`).join('\n')}\n` : '- explicit evidence refs: -\n'}\n## Follow-on action\n${record.followOnAction || '-'}\n`;
}

export async function emitDefectRecord({ record, outDir }) {
  const dir = path.join(outDir, record.defectId);
  await writeJson(path.join(dir, 'record.json'), record);
  await writeText(path.join(dir, 'record.md'), defectMarkdown(record));
  return { outDir: dir, record };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseDir = args.outDir || path.resolve(process.cwd(), 'output/defects');
  const record = buildDefectRecord({
    ...args,
    evidenceRefs: args.evidenceRefs,
  });
  const out = await emitDefectRecord({ record, outDir: baseDir });
  console.log(JSON.stringify({ ok: true, defectId: record.defectId, outDir: out.outDir, record }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.stack || String(err));
    process.exit(1);
  });
}
