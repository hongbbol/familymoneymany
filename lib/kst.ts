const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstParts(d: Date) {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return {
    y: k.getUTCFullYear(),
    m: k.getUTCMonth() + 1,
    d: k.getUTCDate(),
    h: k.getUTCHours(),
    min: k.getUTCMinutes(),
  };
}

export function fromKst(y: number, m: number, d = 1, h = 0, min = 0) {
  return new Date(Date.UTC(y, m - 1, d, h, min) - KST_OFFSET_MS);
}

/** [start, end) of a KST calendar month. */
export function monthRange(y: number, m: number) {
  return { start: fromKst(y, m), end: fromKst(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1) };
}

export function yearRange(y: number) {
  return { start: fromKst(y, 1), end: fromKst(y + 1, 1) };
}

/** "2026-11" → {y, m}; 잘못된 값이면 현재 KST 월. */
export function parseMonth(s: string | null | undefined, now = new Date()) {
  const match = s && /^(\d{4})-(\d{1,2})$/.exec(s);
  if (match) {
    const m = Number(match[2]);
    if (m >= 1 && m <= 12) return { y: Number(match[1]), m };
  }
  const p = kstParts(now);
  return { y: p.y, m: p.m };
}

/** datetime-local 입력값(KST 기준 "2026-11-27T08:30")을 Date로. */
export function fromKstLocalInput(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s);
  if (!m) return undefined;
  return fromKst(+m[1], +m[2], +m[3], m[4] ? +m[4] : 12, m[5] ? +m[5] : 0);
}

export function toKstLocalInput(d: Date) {
  const p = kstParts(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}
