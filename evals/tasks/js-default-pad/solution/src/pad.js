export function padLeft(text, width, fill = ' ') {
  let s = String(text);
  while (s.length < width) s = fill + s;
  return s;
}
