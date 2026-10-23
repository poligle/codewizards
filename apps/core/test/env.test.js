import test from 'node:test';
import assert from 'node:assert/strict';
import { claudeEnv } from '../src/agents/claude-code/env.js';

// Values are fake and short on purpose: only the names matter here.
const env = { PATH: '/bin', HOME: '/home/x', ANTHROPIC_API_KEY: 'x', anthropic_auth_token: 'y', ANTHROPIC_MODEL: 'sonnet', CLAUDE_CODE_OAUTH_TOKEN: 'z' };

test('by default the API key variables are left out, so the plan pays', () => {
  const r = claudeEnv(env);
  assert.deepEqual(r.found, ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN']);
  assert.deepEqual(r.removed, r.found);
  assert.equal(r.env.ANTHROPIC_API_KEY, undefined);
  assert.equal(r.env.anthropic_auth_token, undefined, 'names are matched without case (Windows)');
  assert.equal(r.env.PATH, '/bin');
  assert.equal(r.env.ANTHROPIC_MODEL, 'sonnet', 'other Anthropic settings stay');
  assert.equal(r.env.CLAUDE_CODE_OAUTH_TOKEN, 'z', 'a plan token from claude setup-token still bills the plan');
  assert.equal(env.ANTHROPIC_API_KEY, 'x', 'the original environment is not touched');
});

test('--use-api-key keeps them, and an empty variable does not count', () => {
  const r = claudeEnv(env, { useApiKey: true });
  assert.equal(r.env, env);
  assert.deepEqual(r.removed, []);
  assert.deepEqual(claudeEnv({ PATH: '/bin', ANTHROPIC_API_KEY: '' }).found, []);
});
