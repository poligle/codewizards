// Which account pays. Claude Code prefers an API key in the environment over the user's plan
// login (https://code.claude.com/docs/en/authentication), and an API key is billed per token.
// CodeWizards is meant to spend the user's plan, so by default it hands Claude Code the
// environment without these variables; `--use-api-key` keeps them. Values are never read out.
export const API_KEY_VARS = Object.freeze(['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN']);

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {{useApiKey?: boolean}} [o]
 * @returns {{env: NodeJS.ProcessEnv, found: string[], removed: string[]}}
 *   `found`: API key variables set in `env` (names only); `removed`: the ones left out.
 */
export function claudeEnv(env, { useApiKey = false } = {}) {
  const isKey = k => API_KEY_VARS.includes(k.toUpperCase());   // Windows names are case-insensitive
  const found = Object.keys(env).filter(k => isKey(k) && env[k]).map(k => k.toUpperCase());
  if (useApiKey || !found.length) return { env, found, removed: [] };
  const out = {};
  for (const [k, v] of Object.entries(env)) if (!isKey(k)) out[k] = v;
  return { env: out, found, removed: found };
}
