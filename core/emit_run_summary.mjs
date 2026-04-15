#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

function nowIso() { return new Date().toISOString(); }
function slugify(value) {
  return String(value || 'run-summary').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'run-summary';
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
  const baseDir = args.outDir || path.resolve(process.cwd(), 'output/runs');
  const runId = args.runId || args['run-id'] || 'unknown-run';
  const passNumber = Number(args.passNumber || args['pass-number'] || 1);
  const mode = args.mode || 'unknown';
  const matrices = args.matrices ? String(args.matrices).split(',').map(s => s.trim()).filter(Boolean) : [];
  const rowsPassed = Number(args.rowsPassed || args['rows-passed'] || 0);
  const rowsFailed = Number(args.rowsFailed || args['rows-failed'] || 0);
  const rowsBlockedEnv = Number(args.rowsBlockedEnv || args['rows-blocked-env'] || 0);
  const rowsBlockedDefect = Number(args.rowsBlockedDefect || args['rows-blocked-defect'] || 0);
  const rowsFlaky = Number(args.rowsFlaky || args['rows-flaky'] || 0);
  const defectRefs = args.defects ? String(args.defects).split(',').map(s => s.trim()).filter(Boolean) : [];
  const recommendation = args.recommendation || 'investigation';
  const finding1 = args.finding1 || '';
  const finding2 = args.finding2 || '';
  const summaryId = `${nowIso().slice(0,19).replace(/[:T]/g,'-')}-${slugify(runId + '-pass-' + passNumber)}`;
  const dir = path.join(baseDir, summaryId);

  const record = {
    summaryId,
    createdAt: nowIso(),
    runId,
    passNumber,
    mode,
    matrices,
    rowsPassed,
    rowsFailed,
    rowsBlockedEnv,
    rowsBlockedDefect,
    rowsFlaky,
    keyFindings: [finding1, finding2].filter(Boolean),
    defects: defectRefs,
    recommendation
  };

  await writeJson(path.join(dir, 'summary.json'), record);
  await writeText(path.join(dir, 'summary.md'), `# Run Summary\n\n## Identity\n- summary id: ${summaryId}\n- run id: ${runId}\n- pass number: ${passNumber}\n- mode: ${mode}\n- matrices included: ${matrices.join(', ') || '-'}\n\n## Outcome counts\n- rows passed: ${rowsPassed}\n- rows failed: ${rowsFailed}\n- rows blocked by environment: ${rowsBlockedEnv}\n- rows blocked by product defect: ${rowsBlockedDefect}\n- rows unresolved / flaky: ${rowsFlaky}\n\n## Key findings\n- ${finding1 || '-'}\n- ${finding2 || '-'}\n\n## Defect outputs\n${defectRefs.length ? defectRefs.map(d => `- ${d}`).join('\n') : '- none'}\n\n## Recommendation\n- ${recommendation}\n`);

  console.log(JSON.stringify({ ok: true, summaryId, outDir: dir, record }, null, 2));
}

main().catch(err => {
  console.error(err.stack || String(err));
  process.exit(1);
});
