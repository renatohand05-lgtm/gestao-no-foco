/** Destaca termo na string (case-insensitive) sem HTML. */
export function splitHighlight(
  text: string,
  term: string,
): { text: string; match: boolean }[] {
  const q = term.trim();
  if (!q || !text) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(needle, i);
    if (idx === -1) {
      parts.push({ text: text.slice(i), match: false });
      break;
    }
    if (idx > i) parts.push({ text: text.slice(i, idx), match: false });
    parts.push({ text: text.slice(idx, idx + needle.length), match: true });
    i = idx + needle.length;
  }
  return parts.length ? parts : [{ text, match: false }];
}
