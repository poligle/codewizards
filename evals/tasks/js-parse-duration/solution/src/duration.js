export function parseDuration(text) {
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(String(text));
  if (!text || !m || (!m[1] && !m[2] && !m[3])) throw new TypeError(`bad duration: ${text}`);
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}
