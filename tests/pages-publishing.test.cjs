const { test } = require('node:test');
const assert = require('node:assert/strict');
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
