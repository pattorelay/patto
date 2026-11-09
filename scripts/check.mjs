import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
let failed = false;
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function check(name, fn) {
  try { await fn(); console.log('pass: ' + name); }
  catch (error) { failed = true; console.log('fail: ' + name + ': ' + error.message); }
}
async function get(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'patto-plugin-check' },
    signal: AbortSignal.timeout(10000),
  });
  assert(response.ok, 'HTTP ' + response.status);
  return response;
}

await check('server URLs match latest registry remote', async () => {
  const urls = [];
  for (const path of ['plugins/claude/.mcp.json', 'plugins/openai/mcp.json']) {
    const servers = Object.values((await json(path)).mcpServers ?? {});
    assert(servers.length === 1, path + ' must have exactly one server');
    assert(typeof servers[0].url === 'string' && servers[0].url.length > 0, path + ' has no URL');
    urls.push(servers[0].url);
  }
  const registry = await (await get('https://registry.modelcontextprotocol.io/v0.1/servers?search=com.pattorelay/patto')).json();
  const latest = registry.servers.filter(entry => entry.server?.name === 'com.pattorelay/patto' &&
    entry._meta?.['io.modelcontextprotocol.registry/official']?.isLatest === true);
  assert(latest.length === 1, 'expected one latest registry entry');
  const remote = latest[0].server.remotes?.[0]?.url;
  assert(typeof remote === 'string' && urls.every(url => url === remote), 'server URLs differ');
});

await check('onboarding steps match both skills', async () => {
  const onboarding = await (await get('https://pattorelay.com/onboarding.md')).text();
  const steps = onboarding.split(/\r?\n/).filter(line => /^[34]\. /.test(line));
  assert(steps.length === 2, 'expected exactly two onboarding steps');
  for (const path of ['plugins/claude/skills/setup/SKILL.md', 'plugins/openai/skills/setup/SKILL.md']) {
    const skill = await readFile(path, 'utf8');
    for (const step of steps) assert(skill.includes(step.replace(/^[34]\. /, '')), path + ' differs from onboarding');
  }
});

await check('.claude-plugin/marketplace.json entries', async () => {
  const entries = (await json('.claude-plugin/marketplace.json')).plugins;
  assert(Array.isArray(entries) && entries.length > 0, 'no plugin entries');
  for (const entry of entries) {
    assert(typeof entry.source === 'string', 'missing source path');
    const dir = resolve(entry.source);
    assert((await stat(dir)).isDirectory(), dir + ' is not a directory');
    assert((await json(resolve(dir, '.claude-plugin/plugin.json'))).name === entry.name, 'manifest name differs');
  }
});

const available = spawnSync('claude', ['--version'], { stdio: 'ignore' });
if (available.error?.code === 'ENOENT') console.log('skip: claude not installed');
else {
  for (const args of [
    ['plugin', 'validate', '.', '--strict'],
    ['plugin', 'validate', 'plugins/claude', '--strict', '--profile', 'directory'],
  ]) {
    await check('claude ' + args.join(' '), () => {
      const result = spawnSync('claude', args, { encoding: 'utf8' });
      assert(result.status === 0, (result.error?.message || result.stderr || result.stdout || 'exit ' + result.status).trim().replace(/\s+/g, ' '));
    });
  }
}
if (failed) process.exitCode = 1;
