#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  ACTIONABLE_DEFECT_KINDS,
  buildExecutionPlan,
  buildSummaryCounts,
  normalizeFixture,
  normalizeMatrixMetadata,
  normalizeMode,
  readJson,
  resolveFromFile,
  toFailureKind,
  validateMatrix,
  validateProfile,
} from './contracts.mjs';
import { buildDefectRecord, emitDefectRecord } from './emit_defect_record.mjs';
import { buildRunSummaryRecord, emitRunSummaryRecord } from './emit_run_summary.mjs';

const usage = `AHTO review runner

Usage:
  node core/review_runner.mjs plan --profile PATH --matrix PATH [--mode exploratory|checkpoint]
  node core/review_runner.mjs run --profile PATH --matrix PATH --fixture PATH [--mode exploratory|checkpoint] [--outDir PATH]

What this does:
  - validates the profile + matrix contract
  - materializes a normalized execution plan
  - optionally runs the hardware-sync gate
  - emits defect and run-summary artifacts from fixture outcomes

What this does NOT do:
  - it does not claim live browser/device orchestration maturity
  - it does not replace project-specific adapters
  - it is a reviewable offline orchestration surface for v0.2
`;

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function requiredArg(name) {
  const value = arg(name);
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

function normalizeFindingList(plan, fixture, gateResult, rowResults) {
  const findings = [];
  if (gateResult && gateResult.ok === false) {
    findings.push(`Hardware-sync gate failed before row execution: ${gateResult.stderr || gateResult.stdout || gateResult.reason || 'no reason provided'}`);
  }
  if (plan.lifecycleStage === 'checkpoint') {
    findings.push(`Checkpoint mode used checkpoint ${plan.checkpointId || 'unknown-checkpoint'} from family ${plan.matrixFamily}.`);
  } else {
    findings.push(`Working-matrix mode used family ${plan.matrixFamily} revision ${plan.matrixRevision || 'working-draft'}.`);
  }
  if (rowResults.some((row) => row.outcomeKind === 'rig-blocked')) {
    findings.push('At least one row was explicitly marked rig-blocked instead of being silently dropped.');
  }
  if (rowResults.some((row) => row.outcomeKind === 'ui-contract-defect')) {
    findings.push('At least one row identified a UI-contract defect separately from a product defect.');
  }
  findings.push(...fixture.keyFindings);
  return findings.filter(Boolean).slice(0, 6);
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function summarizeValidation(label, report) {
  if (report.ok) return `${label}: ok`;
  return `${label}: failed -> ${report.errors.join(' | ')}`;
}

function failIfInvalid(profileReport, matrixReport) {
  const errors = [...profileReport.errors, ...matrixReport.errors];
  if (errors.length) {
    throw new Error(`Contract validation failed. ${errors.join(' | ')}`);
  }
}

function resolveArtifactsRoot(profilePath, profile, overrideOutDir) {
  if (overrideOutDir) return path.resolve(process.cwd(), overrideOutDir);
  if (profile?.artifacts?.root) return resolveFromFile(profilePath, profile.artifacts.root);
  return path.resolve(process.cwd(), 'output/review-runner');
}

function runHardwareSync(profilePath, profile) {
  const command = profile?.hardwareSync?.command;
  if (!command) {
    return { ok: false, reason: 'Missing hardwareSync.command' };
  }

  const result = spawnSync(command, {
    shell: true,
    cwd: path.resolve(path.dirname(profilePath), '..', '..'),
    env: process.env,
    encoding: 'utf8',
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    command,
  };
}

function normalizeRowResult(row, fixtureRow) {
  const outcomeKind = fixtureRow?.outcomeKind || 'pass';
  return {
    testId: row.testId,
    scenario: row.scenario,
    outcomeKind,
    severity: fixtureRow?.severity || (outcomeKind === 'product-defect' ? 'high' : outcomeKind === 'pass' ? 'none' : 'medium'),
    summary: fixtureRow?.summary || (outcomeKind === 'pass' ? 'Row passed according to fixture outcome.' : `Fixture marked row as ${outcomeKind}.`),
    actualResult: fixtureRow?.actualResult || '',
    recommendedNextOwner: fixtureRow?.recommendedNextOwner || (outcomeKind === 'product-defect' ? 'product' : outcomeKind === 'matrix-defect' ? 'test-authoring' : outcomeKind === 'framework-defect' ? 'framework' : outcomeKind === 'ui-contract-defect' ? 'frontend-contract' : 'investigation'),
    followOnAction: fixtureRow?.followOnAction || '',
    retryPolicy: fixtureRow?.retryPolicy || '',
    backendEvidence: fixtureRow?.backendEvidence || '',
    hardwareEvidence: fixtureRow?.hardwareEvidence || '',
    logs: fixtureRow?.logs || '',
    screenshots: fixtureRow?.screenshots || '',
    evidenceRefs: Array.isArray(fixtureRow?.evidenceRefs) ? fixtureRow.evidenceRefs : [],
  };
}

async function commandPlan() {
  const profilePath = path.resolve(process.cwd(), requiredArg('profile'));
  const matrixPath = path.resolve(process.cwd(), requiredArg('matrix'));
  const profile = await readJson(profilePath);
  const matrix = await readJson(matrixPath);
  const mode = normalizeMode(arg('mode', matrix.lifecycle?.stage === 'working' ? 'exploratory' : profile.defaultMode || 'checkpoint'));

  const profileReport = validateProfile(profile, { profilePath });
  const matrixReport = validateMatrix(matrix, { matrixPath, profile });
  failIfInvalid(profileReport, matrixReport);

  const plan = buildExecutionPlan({ profile, matrix, mode });
  console.log(JSON.stringify({
    ok: true,
    validation: {
      profile: summarizeValidation('profile', profileReport),
      matrix: summarizeValidation('matrix', matrixReport),
      warnings: [...profileReport.warnings, ...matrixReport.warnings],
    },
    plan,
  }, null, 2));
}

async function commandRun() {
  const profilePath = path.resolve(process.cwd(), requiredArg('profile'));
  const matrixPath = path.resolve(process.cwd(), requiredArg('matrix'));
  const fixturePath = path.resolve(process.cwd(), requiredArg('fixture'));

  const profile = await readJson(profilePath);
  const matrix = await readJson(matrixPath);
  const fixture = normalizeFixture(await readJson(fixturePath));
  const mode = normalizeMode(arg('mode', matrix.lifecycle?.stage === 'working' ? 'exploratory' : profile.defaultMode || 'checkpoint'));

  const profileReport = validateProfile(profile, { profilePath });
  const matrixReport = validateMatrix(matrix, { matrixPath, profile });
  failIfInvalid(profileReport, matrixReport);

  const metadata = normalizeMatrixMetadata(matrix, profile);
  const plan = buildExecutionPlan({ profile, matrix, mode });
  const artifactsRoot = resolveArtifactsRoot(profilePath, profile, arg('outDir'));

  await writeJson(path.join(artifactsRoot, 'plan.json'), plan);
  await writeJson(path.join(artifactsRoot, 'validation.json'), {
    profileWarnings: profileReport.warnings,
    matrixWarnings: matrixReport.warnings,
  });

  const gateResult = runHardwareSync(profilePath, profile);
  await writeJson(path.join(artifactsRoot, 'hardware-sync.json'), gateResult);

  const runId = fixture.runId || `review-${profile.profileId}-${mode}`;
  const passNumber = fixture.passNumber || 1;
  const defectsRoot = path.join(artifactsRoot, 'defects');
  const runsRoot = path.join(artifactsRoot, 'runs');

  const rowResults = [];
  const defectRefs = [];

  if (gateResult.ok) {
    for (const row of matrix.rows) {
      const fixtureRow = fixture.rowResults[row.testId] || {};
      const rowResult = normalizeRowResult(row, fixtureRow);
      rowResults.push(rowResult);

      if (ACTIONABLE_DEFECT_KINDS.has(rowResult.outcomeKind)) {
        const defectRecord = buildDefectRecord({
          runId,
          passNumber,
          matrixId: metadata.matrixId,
          matrixName: metadata.matrixName,
          matrixFamily: metadata.matrixFamily,
          matrixRevision: metadata.matrixRevision,
          checkpointId: metadata.checkpointId,
          mode,
          lifecycleStage: metadata.lifecycleStage,
          rowId: row.testId,
          outcomeKind: rowResult.outcomeKind,
          failureKind: toFailureKind(rowResult.outcomeKind),
          classificationFamily: rowResult.outcomeKind,
          severity: rowResult.severity,
          nextOwner: rowResult.recommendedNextOwner,
          summary: rowResult.summary,
          expected: row.expectedUi || row.expectedResult || '',
          actual: rowResult.actualResult,
          uiRoute: row.entryRoute || row.uiRoute || '',
          selectorHints: row.selectorHints || '',
          rowActionSummary: row.actionIntent || row.uiActionNotes || '',
          timingWindow: row.timingBudget || '',
          retryPolicy: rowResult.retryPolicy,
          backendEvidence: rowResult.backendEvidence,
          hardwareEvidence: rowResult.hardwareEvidence,
          logs: rowResult.logs,
          screenshots: rowResult.screenshots,
          evidenceRefs: rowResult.evidenceRefs,
          followOnAction: rowResult.followOnAction,
          issueRoutingHint: row.issueRoutingHint || '',
        });
        const defectOut = await emitDefectRecord({ record: defectRecord, outDir: defectsRoot });
        defectRefs.push(path.relative(path.dirname(path.join(runsRoot, 'placeholder')), path.join(defectOut.outDir, 'record.json')).replace(/\\/g, '/'));
      }
    }
  } else {
    for (const row of matrix.rows) {
      rowResults.push({
        testId: row.testId,
        scenario: row.scenario,
        outcomeKind: 'environment-blocked',
        severity: 'high',
        summary: `Hardware-sync gate failed before row execution for ${row.testId}.`,
        actualResult: gateResult.stderr || gateResult.stdout || gateResult.reason || 'hardware-sync gate failed',
        recommendedNextOwner: 'environment',
        followOnAction: 'Repair the environment and rerun the checkpoint.',
        retryPolicy: '',
        backendEvidence: '',
        hardwareEvidence: gateResult.stderr || gateResult.stdout || '',
        logs: '',
        screenshots: '',
        evidenceRefs: [],
      });
    }
  }

  const counts = buildSummaryCounts(rowResults);
  const keyFindings = normalizeFindingList(plan, fixture, gateResult, rowResults);
  const summaryRecord = buildRunSummaryRecord({
    runId,
    passNumber,
    mode,
    matrixId: metadata.matrixId,
    matrixFamily: metadata.matrixFamily,
    matrixRevision: metadata.matrixRevision,
    lifecycleStage: metadata.lifecycleStage,
    checkpointId: metadata.checkpointId,
    matrices: [metadata.matrixName],
    ...counts,
    keyFindings,
    defects: defectRefs,
    recommendation: fixture.recommendation,
  });
  const summaryOut = await emitRunSummaryRecord({ record: summaryRecord, outDir: runsRoot });

  await writeJson(path.join(artifactsRoot, 'row-results.json'), rowResults);

  console.log(JSON.stringify({
    ok: true,
    runId,
    mode,
    validationWarnings: [...profileReport.warnings, ...matrixReport.warnings],
    hardwareSync: gateResult,
    defects: defectRefs,
    summary: path.join(summaryOut.outDir, 'summary.json'),
    counts,
  }, null, 2));
}

async function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'plan':
      await commandPlan();
      return;
    case 'run':
      await commandRun();
      return;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(usage.trim());
      if (!cmd) process.exitCode = 2;
      return;
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    console.error('');
    console.error(usage.trim());
    process.exit(1);
  });
}
