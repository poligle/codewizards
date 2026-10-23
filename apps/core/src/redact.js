// Masks well-known secret formats before an event reaches the log or the room. A safety net, not a
// guarantee: adapters already avoid raw tool output, and the log never leaves the user's machine.
const RULES = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[redacted private key]'],
  [/\bsk-ant-[A-Za-z0-9_-]{16,}/g, '[redacted]'],
  [/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/g, '[redacted]'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/g, '[redacted]'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/g, '[redacted]'],
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, '[redacted]'],
  [/\bAIza[0-9A-Za-z_-]{35}/g, '[redacted]'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, '[redacted]'],
  [/\bnpm_[A-Za-z0-9]{36}\b/g, '[redacted]'],
  [/(\bauthorization\s*[:=]\s*(?:bearer|token|basic)\s+)[A-Za-z0-9._~+/-]{12,}=*/gi, '$1[redacted]'],
];

export function redact(s) {
  if (typeof s !== 'string' || !s) return s;
  let out = s;
  for (const [re, rep] of RULES) out = out.replace(re, rep);
  return out;
}

export function redactEvent(ev) {
  const out = {};
  for (const [k, v] of Object.entries(ev)) {
    if (typeof v === 'string') out[k] = redact(v);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' ? redact(x) : x));
    else out[k] = v;
  }
  return out;
}
