const OPEN_NUMBER_RE = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

export function parseOpenNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!OPEN_NUMBER_RE.test(trimmed)) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}
