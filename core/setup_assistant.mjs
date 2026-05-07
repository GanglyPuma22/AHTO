#!/usr/bin/env node
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readJson, validateProfile } from './contracts.mjs';

const usage = `AHTO setup assistant

Usage:
  node core/setup_assistant.mjs inspect --profile PATH [--json]
  node core/setup_assistant.mjs prompt --profile PATH

What this does:
  - inspects profile-defined required setup inputs
  - reports which inputs are already satisfied by the environment
  - optionally prompts for missing values without writing secrets to disk
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

function buildInputStatus(item) {
  const envValue = process.env[item.key];
  const isPresent = Boolean(envValue);
  return {
    key: item.key,
    source: item.source || 'env',
    required: item.required !== false,
    description: item.description || '',
    example: item.example || '',
    defaultValue: item.defaultValue || '',
    status: isPresent ? 'present' : 'missing',
    hasCurrentValue: isPresent,
  };
}

async function loadProfile(profilePath) {
  const profile = await readJson(profilePath);
  const report = validateProfile(profile, { profilePath });
  if (!report.ok) {
    throw new Error(report.errors.join(' | '));
  }
  return { profile, report };
}

async function inspect(jsonMode = false) {
  const profilePath = path.resolve(process.cwd(), requiredArg('profile'));
  const { profile, report } = await loadProfile(profilePath);
  const inputs = (profile.setupInputs || []).map(buildInputStatus);
  const payload = {
    ok: true,
    profileId: profile.profileId,
    warnings: report.warnings,
    inputs,
    missingRequired: inputs.filter((item) => item.required && item.status === 'missing').map((item) => item.key),
  };

  if (jsonMode) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`Profile: ${profile.profileId}`);
  if (report.warnings.length) {
    console.log('Warnings:');
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }
  console.log('Setup inputs:');
  for (const item of inputs) {
    const label = item.required ? 'required' : 'optional';
    console.log(`- ${item.key} [${label}] ${item.status}`);
    if (item.description) console.log(`  ${item.description}`);
    if (item.example) console.log(`  example: ${item.example}`);
    if (item.defaultValue) console.log(`  default: ${item.defaultValue}`);
  }
  if (payload.missingRequired.length) {
    console.log('Missing required inputs:');
    for (const key of payload.missingRequired) console.log(`- ${key}`);
    process.exitCode = 2;
  }
}

async function promptForMissing() {
  const profilePath = path.resolve(process.cwd(), requiredArg('profile'));
  const { profile } = await loadProfile(profilePath);
  const inputs = (profile.setupInputs || []).map(buildInputStatus).filter((item) => item.required && item.status === 'missing');
  if (!inputs.length) {
    console.log('All required setup inputs are already present.');
    return;
  }

  const rl = readline.createInterface({ input, output });
  try {
    console.log(`# Suggested exports for profile ${profile.profileId}`);
    for (const item of inputs) {
      const answer = await rl.question(`${item.key}${item.description ? ` (${item.description})` : ''}: `);
      if (answer) console.log(`export ${item.key}=${JSON.stringify(answer)}`);
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'inspect':
      await inspect(process.argv.includes('--json'));
      return;
    case 'prompt':
      await promptForMissing();
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
