#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import CDP from 'chrome-remote-interface';

const usage = `AHTO CDP adapter

Usage:
  node adapters/cdp/cdp_ui.mjs list [--host HOST] [--port PORT]
  node adapters/cdp/cdp_ui.mjs activate --url URL_SUBSTR [--host HOST] [--port PORT]
  node adapters/cdp/cdp_ui.mjs navigate --url URL_SUBSTR --to URL [--host HOST] [--port PORT]
  node adapters/cdp/cdp_ui.mjs assertText --url URL_SUBSTR --text TEXT [--selector CSS] [--host HOST] [--port PORT]
  node adapters/cdp/cdp_ui.mjs screenshot --url URL_SUBSTR [--out PATH] [--host HOST] [--port PORT]

Environment fallbacks:
  AHTO_CDP_HOST (default: localhost)
  AHTO_CDP_PORT (default: 9222)
  AHTO_CDP_SCREENSHOT_OUT (default: ./cdp-screenshot.png)
`;

function arg(name, def = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return def;
  return process.argv[idx + 1] ?? def;
}

function requiredArg(name) {
  const value = arg(name);
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

function envOrArg(name, envName, def = null) {
  return arg(name, process.env[envName] ?? def);
}

function getEndpoint() {
  const host = envOrArg('host', 'AHTO_CDP_HOST', 'localhost');
  const portValue = envOrArg('port', 'AHTO_CDP_PORT', '9222');
  const port = Number(portValue);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid CDP port: ${portValue}`);
  }
  return { host, port };
}

const cmd = process.argv[2];

async function listTargets(endpoint) {
  const targets = await CDP.List(endpoint);
  for (const target of targets) {
    console.log(`${target.id}\t${target.type}\t${target.url}\t${target.title}`);
  }
}

async function withTarget(endpoint, target) {
  const client = await CDP({ ...endpoint, target });
  const { Page, Runtime, DOM } = client;
  await Promise.all([Page.enable(), Runtime.enable(), DOM.enable()]);
  return { client, Page, Runtime, DOM };
}

async function findTargetIdByUrl(endpoint, urlSubstr) {
  const targets = await CDP.List(endpoint);
  const hit = targets.find((target) => target.type === 'page' && target.url.includes(urlSubstr));
  if (!hit) {
    throw new Error(`No page target url includes: ${urlSubstr}`);
  }
  return hit.id;
}

async function activate(endpoint) {
  const url = requiredArg('url');
  const id = await findTargetIdByUrl(endpoint, url);
  await CDP.Activate({ ...endpoint, id });
  console.log('activated', id);
}

async function navigate(endpoint) {
  const url = requiredArg('url');
  const to = requiredArg('to');
  const id = await findTargetIdByUrl(endpoint, url);
  const { client, Page } = await withTarget(endpoint, id);
  try {
    const nav = await Page.navigate({ url: to });
    await Page.loadEventFired();
    console.log('navigated', { from: url, to, frameId: nav.frameId });
  } finally {
    await client.close();
  }
}

async function assertText(endpoint) {
  const url = requiredArg('url');
  const selector = arg('selector', 'body');
  const text = requiredArg('text');
  const id = await findTargetIdByUrl(endpoint, url);
  const { client, Runtime } = await withTarget(endpoint, id);
  try {
    const expression = `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el ? el.innerText : null; })()`;
    const result = await Runtime.evaluate({ expression, returnByValue: true });
    const innerText = result.result.value;
    if (!innerText || !String(innerText).includes(text)) {
      console.error('ASSERT_FAIL', {
        selector,
        want: text,
        gotPreview: innerText ? String(innerText).slice(0, 200) : null,
      });
      process.exitCode = 2;
      return;
    }
    console.log('ASSERT_OK', { selector, text });
  } finally {
    await client.close();
  }
}

async function screenshot(endpoint) {
  const url = requiredArg('url');
  const out = envOrArg('out', 'AHTO_CDP_SCREENSHOT_OUT', './cdp-screenshot.png');
  const id = await findTargetIdByUrl(endpoint, url);
  const { client, Page } = await withTarget(endpoint, id);
  try {
    const { data } = await Page.captureScreenshot({ format: 'png' });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data, 'base64'));
    console.log('screenshot_saved', out);
  } finally {
    await client.close();
  }
}

async function main() {
  const endpoint = getEndpoint();
  switch (cmd) {
    case 'list':
      await listTargets(endpoint);
      return;
    case 'activate':
      await activate(endpoint);
      return;
    case 'navigate':
      await navigate(endpoint);
      return;
    case 'assertText':
      await assertText(endpoint);
      return;
    case 'screenshot':
      await screenshot(endpoint);
      return;
    case '--help':
    case '-h':
    case 'help':
    case undefined:
      console.log(usage.trim());
      if (!cmd) process.exitCode = 2;
      return;
    default:
      throw new Error(`Unknown cmd: ${cmd}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('Tip: launch a Chromium-based browser with remote debugging enabled, then pass --host/--port or AHTO_CDP_HOST/AHTO_CDP_PORT as needed.');
  console.error('');
  console.error(usage.trim());
  process.exit(2);
}
