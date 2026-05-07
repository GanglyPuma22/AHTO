import fs from 'node:fs/promises';
import path from 'node:path';

export const RUN_MODES = ['exploratory', 'checkpoint'];
export const MATRIX_STAGES = ['working', 'checkpoint'];
export const ROW_OUTCOME_KINDS = [
  'pass',
  'product-defect',
  'rig-blocked',
  'environment-blocked',
  'matrix-defect',
  'framework-defect',
  'ui-contract-defect',
  'flaky',
  'not-run',
];
export const ACTIONABLE_DEFECT_KINDS = new Set([
  'product-defect',
  'matrix-defect',
  'framework-defect',
  'ui-contract-defect',
]);

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export function resolveFromFile(baseFile, maybeRelativePath) {
  if (!maybeRelativePath) return '';
  if (path.isAbsolute(maybeRelativePath)) return maybeRelativePath;
  return path.resolve(path.dirname(baseFile), maybeRelativePath);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

export function normalizeMode(value, fallback = 'checkpoint') {
  const candidate = String(value || fallback).trim().toLowerCase();
  if (!RUN_MODES.includes(candidate)) {
    throw new Error(`Unsupported mode: ${value}. Expected one of: ${RUN_MODES.join(', ')}`);
  }
  return candidate;
}

export function normalizeMatrixMetadata(matrix, profile = {}) {
  const lifecycle = matrix?.lifecycle || {};
  const lifecycleStage = String(
    matrix?.lifecycleStage || lifecycle.stage || (lifecycle.checkpointId ? 'checkpoint' : 'working'),
  ).trim().toLowerCase();

  return {
    matrixId: matrix?.matrixId || matrix?.id || null,
    matrixName: matrix?.matrixName || matrix?.name || 'Unnamed Matrix',
    matrixFamily:
      matrix?.matrixFamily || lifecycle.family || profile?.matrixLifecycle?.family || `${profile?.profileId || 'ahto'}-matrix`,
    lifecycleStage,
    matrixRevision: matrix?.matrixRevision || lifecycle.revision || null,
    checkpointId: matrix?.checkpointId || lifecycle.checkpointId || null,
    promotedFrom: lifecycle.promotedFrom || null,
  };
}

export function validateSetupInputs(profile, { profilePath = 'profile.json' } = {}) {
  const errors = [];
  const warnings = [];
  const setupInputs = Array.isArray(profile?.setupInputs) ? profile.setupInputs : [];
  const seen = new Set();

  setupInputs.forEach((item, index) => {
    const key = item?.key;
    const source = item?.source || 'env';
    if (!hasText(key)) {
      errors.push(`${profilePath}: setupInputs[${index}] is missing required field "key".`);
      return;
    }
    if (seen.has(key)) {
      errors.push(`${profilePath}: duplicate setup input key "${key}".`);
    }
    seen.add(key);
    if (source !== 'env') {
      errors.push(`${profilePath}: setup input "${key}" has unsupported source "${source}". Only "env" is supported in v0.2.`);
    }
    if (!hasText(item?.description)) {
      warnings.push(`${profilePath}: setup input "${key}" should include a short description for reviewers/operators.`);
    }
  });

  return { errors, warnings, setupInputs };
}

export function validateProfile(profile, { profilePath = 'profile.json' } = {}) {
  const errors = [];
  const warnings = [];

  if (!hasText(profile?.profileId)) errors.push(`${profilePath}: missing profileId.`);
  if (!hasText(profile?.description)) warnings.push(`${profilePath}: description is missing or empty.`);

  const defaultMode = profile?.defaultMode || 'checkpoint';
  if (!RUN_MODES.includes(String(defaultMode).trim().toLowerCase())) {
    errors.push(`${profilePath}: defaultMode must be one of ${RUN_MODES.join(', ')}.`);
  }

  const executionModes = Array.isArray(profile?.executionModes) ? profile.executionModes : [];
  if (!executionModes.length) {
    warnings.push(`${profilePath}: executionModes is missing; reviewers will not see which modes the profile supports.`);
  } else {
    executionModes.forEach((mode) => {
      if (!RUN_MODES.includes(String(mode).trim().toLowerCase())) {
        errors.push(`${profilePath}: unsupported execution mode "${mode}".`);
      }
    });
  }

  if (!profile?.matrixLifecycle?.family) {
    warnings.push(`${profilePath}: matrixLifecycle.family is missing; family-level lifecycle review will be weaker.`);
  }
  if (!Array.isArray(profile?.matrixLifecycle?.checkpoints) || !profile.matrixLifecycle.checkpoints.length) {
    warnings.push(`${profilePath}: matrixLifecycle.checkpoints is missing; checkpoint promotion is only weakly represented.`);
  }

  if (!profile?.hardwareSync?.adapter) errors.push(`${profilePath}: hardwareSync.adapter is required.`);
  if (!profile?.hardwareSync?.command) errors.push(`${profilePath}: hardwareSync.command is required.`);

  if (!profile?.artifacts?.root) {
    warnings.push(`${profilePath}: artifacts.root is missing; local runs will need --outDir.`);
  }

  const setup = validateSetupInputs(profile, { profilePath });
  errors.push(...setup.errors);
  warnings.push(...setup.warnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalized: {
      profileId: profile?.profileId,
      defaultMode: String(defaultMode).trim().toLowerCase(),
      executionModes: executionModes.map((mode) => String(mode).trim().toLowerCase()),
      matrixLifecycle: profile?.matrixLifecycle || {},
      setupInputs: setup.setupInputs,
    },
  };
}

function validateRow(row, index, metadata, errors, warnings) {
  const prefix = `${metadata.matrixName} row[${index}]`;
  if (!hasText(row?.testId)) errors.push(`${prefix}: missing testId.`);
  if (!hasText(row?.scenario)) errors.push(`${prefix}: missing scenario.`);
  if (!Array.isArray(row?.steps) || row.steps.length === 0) {
    errors.push(`${prefix}: steps must be a non-empty array.`);
  }
  if (!hasText(row?.expectedUi) && !hasText(row?.expectedResult)) {
    warnings.push(`${prefix}: expectedUi/expectedResult is missing.`);
  }
  if (!hasText(row?.uiRoute) && !hasText(row?.entryRoute) && !hasText(row?.scope)) {
    warnings.push(`${prefix}: uiRoute/entryRoute/scope is missing; row entry is vague.`);
  }
  if (!hasText(row?.actionIntent) && !hasText(row?.uiActionNotes)) {
    warnings.push(`${prefix}: actionIntent/uiActionNotes is missing; row action is less explicit than desired.`);
  }
  if (!Array.isArray(row?.evidenceExpectations) || row.evidenceExpectations.length === 0) {
    warnings.push(`${prefix}: evidenceExpectations is missing or empty.`);
  }

  const supportedOutcomeKinds = asList(row?.supportedOutcomeKinds);
  supportedOutcomeKinds.forEach((kind) => {
    if (!ROW_OUTCOME_KINDS.includes(kind)) {
      errors.push(`${prefix}: unsupported supportedOutcomeKinds value "${kind}".`);
    }
  });
}

export function validateMatrix(matrix, { matrixPath = 'matrix.json', profile = {} } = {}) {
  const errors = [];
  const warnings = [];
  const metadata = normalizeMatrixMetadata(matrix, profile);

  if (!MATRIX_STAGES.includes(metadata.lifecycleStage)) {
    errors.push(`${matrixPath}: lifecycle stage must be one of ${MATRIX_STAGES.join(', ')}.`);
  }
  if (metadata.lifecycleStage === 'checkpoint' && !hasText(metadata.checkpointId)) {
    errors.push(`${matrixPath}: checkpoint matrices must define checkpointId or lifecycle.checkpointId.`);
  }
  if (!Array.isArray(matrix?.rows) || matrix.rows.length === 0) {
    errors.push(`${matrixPath}: rows must be a non-empty array.`);
  }

  const seen = new Set();
  (matrix?.rows || []).forEach((row, index) => {
    const testId = hasText(row?.testId) ? row.testId : null;
    if (testId && seen.has(testId)) {
      errors.push(`${matrixPath}: duplicate testId "${testId}".`);
    }
    if (testId) seen.add(testId);
    validateRow(row, index, metadata, errors, warnings);
  });

  return { ok: errors.length === 0, errors, warnings, metadata };
}

export function normalizeFixture(fixture = {}) {
  const normalizedRows = {};
  const rowResults = fixture?.rowResults || fixture?.results || {};

  if (Array.isArray(rowResults)) {
    rowResults.forEach((row) => {
      if (hasText(row?.testId)) normalizedRows[row.testId] = row;
    });
  } else {
    for (const [testId, value] of Object.entries(rowResults)) {
      normalizedRows[testId] = { testId, ...(value || {}) };
    }
  }

  return {
    runId: fixture?.runId || null,
    passNumber: Number(fixture?.passNumber || 1),
    recommendation: fixture?.recommendation || 'review findings and continue with the next bounded step',
    keyFindings: Array.isArray(fixture?.keyFindings) ? fixture.keyFindings.filter(Boolean) : [],
    rowResults: normalizedRows,
  };
}

export function buildExecutionPlan({ profile, matrix, mode }) {
  const metadata = normalizeMatrixMetadata(matrix, profile);
  return {
    profileId: profile.profileId,
    mode,
    matrixId: metadata.matrixId,
    matrixName: metadata.matrixName,
    matrixFamily: metadata.matrixFamily,
    lifecycleStage: metadata.lifecycleStage,
    matrixRevision: metadata.matrixRevision,
    checkpointId: metadata.checkpointId,
    rowCount: Array.isArray(matrix.rows) ? matrix.rows.length : 0,
    rows: (matrix.rows || []).map((row, index) => ({
      order: index + 1,
      testId: row.testId,
      scenario: row.scenario,
      entryRoute: row.entryRoute || row.uiRoute || '',
      actionIntent: row.actionIntent || row.uiActionNotes || '',
      timingBudget: row.timingBudget || '',
      supportedOutcomeKinds: Array.isArray(row.supportedOutcomeKinds) ? row.supportedOutcomeKinds : [],
      evidenceExpectations: Array.isArray(row.evidenceExpectations) ? row.evidenceExpectations : [],
    })),
  };
}

export function buildSummaryCounts(rowResults) {
  const counts = {
    rowsPassed: 0,
    rowsFailed: 0,
    rowsBlockedEnv: 0,
    rowsBlockedDefect: 0,
    rowsFlaky: 0,
    rowsProductDefect: 0,
    rowsRigBlocked: 0,
    rowsEnvironmentBlocked: 0,
    rowsMatrixDefect: 0,
    rowsFrameworkDefect: 0,
    rowsUiContractDefect: 0,
    rowsNotRun: 0,
  };

  for (const result of rowResults) {
    switch (result.outcomeKind) {
      case 'pass':
        counts.rowsPassed += 1;
        break;
      case 'product-defect':
        counts.rowsFailed += 1;
        counts.rowsProductDefect += 1;
        break;
      case 'rig-blocked':
        counts.rowsBlockedEnv += 1;
        counts.rowsRigBlocked += 1;
        break;
      case 'environment-blocked':
        counts.rowsBlockedEnv += 1;
        counts.rowsEnvironmentBlocked += 1;
        break;
      case 'matrix-defect':
        counts.rowsFailed += 1;
        counts.rowsMatrixDefect += 1;
        break;
      case 'framework-defect':
        counts.rowsFailed += 1;
        counts.rowsFrameworkDefect += 1;
        break;
      case 'ui-contract-defect':
        counts.rowsFailed += 1;
        counts.rowsUiContractDefect += 1;
        break;
      case 'flaky':
        counts.rowsFlaky += 1;
        break;
      case 'not-run':
      default:
        counts.rowsNotRun += 1;
        break;
    }
  }

  return counts;
}

export function toFailureKind(outcomeKind) {
  switch (outcomeKind) {
    case 'product-defect':
      return 'product-defect';
    case 'matrix-defect':
      return 'matrix-defect';
    case 'framework-defect':
      return 'framework-defect';
    case 'ui-contract-defect':
      return 'ui-contract-defect';
    case 'rig-blocked':
      return 'rig-blocked';
    case 'environment-blocked':
      return 'environment-blocked';
    default:
      return outcomeKind || 'unknown';
  }
}
