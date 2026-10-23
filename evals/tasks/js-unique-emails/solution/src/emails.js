export function cleanEmails(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const e = String(raw).trim().toLowerCase();
    const parts = e.split('@');
    if (parts.length !== 2 || !parts[0]) continue;
    const d = parts[1];
    const dot = d.indexOf('.');
    if (dot <= 0 || d.endsWith('.')) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}
