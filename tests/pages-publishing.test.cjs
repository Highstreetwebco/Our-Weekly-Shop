const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { waitForLegacyPages } = require('../.github/scripts/wait-for-legacy-pages.cjs');

function clock() {
  let time = 0;
  return { now: () => time, pause: async ms => { time += ms; }, log: () => {} };
}
test('app publishing waits for the legacy publisher, not its own running workflow', async () => {
  let reads = 0;
  await waitForLegacyPages({ ...clock(), readRuns: async () => [
    { name: 'Deploy web app to GitHub Pages', status: 'in_progress' },
    { name: 'pages build and deployment', status: ++reads === 1 ? 'in_progress' : 'completed' }
  ] });
  assert.equal(reads, 2);
});
test('a repository using only Actions can publish after the discovery grace period', async () => {
  const timer = clock();
  await waitForLegacyPages({ ...timer, readRuns: async () => [] });
  assert.equal(timer.now(), 30000);
});
test('unknown or stuck publishing fails instead of silently racing', async () => {
  await assert.rejects(waitForLegacyPages({ ...clock(), readRuns: async () => null }), /did not return/);
  await assert.rejects(waitForLegacyPages({ ...clock(), timeoutMs: 20000, readRuns: async () => [{name:'pages build and deployment',status:'queued'}] }), /did not finish/);
  await assert.rejects(waitForLegacyPages({ ...clock(), readRuns: async () => { throw new Error('HTTP 403'); } }), /HTTP 403/);
});
test('the private connector requests no cookie, password, payment or network interception permission', () => {
  const root = resolve(__dirname,'..');
  const manifest = JSON.parse(readFileSync(resolve(root,'connector/sainsburys/manifest.json'),'utf8'));
  assert.deepEqual(manifest.permissions,['storage']);
  for (const forbidden of ['cookies','webRequest','webRequestBlocking','history','debugger']) assert.equal(manifest.permissions.includes(forbidden),false);
  assert.deepEqual(manifest.content_scripts[1].matches,[
    'https://www.sainsburys.co.uk/groceries',
    'https://www.sainsburys.co.uk/groceries/',
    'https://www.sainsburys.co.uk/groceries/product/*',
    'https://www.sainsburys.co.uk/groceries/trolley'
  ]);
  assert.deepEqual(manifest.host_permissions || [],[]);
  const workflows = readFileSync(resolve(root,'.github/workflows/deploy-pages.yml'),'utf8') + readFileSync(resolve(root,'.github/workflows/publish-root.yml'),'utf8');
  assert.match(workflows,/our-weekly-shop-sainsburys-pilot\.zip/);
});
