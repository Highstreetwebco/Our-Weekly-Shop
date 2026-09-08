// Branch-based Pages is still enabled in this repository. Publish the Expo
// artifact after that workflow finishes, so the README cannot win the race.
const { setTimeout: delay } = require('node:timers/promises');

async function waitForLegacyPages({ readRuns, now = Date.now, pause = delay, log = console.log, timeoutMs = 600000, graceMs = 30000 }) {
  const started = now();
  while (now() - started < timeoutMs) {
    const runs = await readRuns();
    if (!Array.isArray(runs)) throw new Error('GitHub did not return workflow runs.');
    const legacy = runs.filter(run => run.name === 'pages build and deployment');
    if (legacy.length && legacy.every(run => run.status === 'completed')) {
      log('Branch-based Pages publishing has finished. The app will publish last.');
      return;
    }
    if (!legacy.length && now() - started >= graceMs) {
      log('No branch-based Pages workflow for this commit. Publishing the app.');
      return;
    }
    log('Waiting for branch-based Pages publishing before publishing the app…');
    await pause(10000);
  }
  throw new Error('Branch-based Pages did not finish in time. App publishing stopped to avoid a race.');
}

if (require.main === module) {
  const { GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_SHA, GH_TOKEN } = process.env;
  if (!GITHUB_API_URL || !GITHUB_REPOSITORY || !GITHUB_SHA || !GH_TOKEN) throw new Error('Missing GitHub workflow environment.');
  const url = `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/actions/runs?head_sha=${encodeURIComponent(GITHUB_SHA)}&per_page=100`;
  waitForLegacyPages({ readRuns: async () => {
    const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${GH_TOKEN}`, 'X-GitHub-Api-Version': '2026-03-10' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Could not check Pages publishing (HTTP ${response.status}).`);
    const data = await response.json();
    if (data.total_count > 100) throw new Error('Too many runs for this commit to verify publishing order safely.');
    return data.workflow_runs;
  }}).catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { waitForLegacyPages };
