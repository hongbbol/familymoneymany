import { kstParts } from './kst';

const nf = new Intl.NumberFormat('ko-KR');

export const won = (n: number) => `${nf.format(Math.round(n))}원`;

/** 차트 축/요약용: 1,234,000 → "123만", 150,000,000 → "1.5억" */
export function compactWon(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${+(abs / 100_000_000).toFixed(1)}억`;
  if (abs >= 10_000) return `${sign}${nf.format(Math.round(abs / 10_000))}만`;
  return `${sign}${nf.format(abs)}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function kstDateLabel(d: Date) {
  const p = kstParts(d);
  const wd = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return `${p.m}월 ${p.d}일 (${WEEKDAYS[wd]})`;
}

export function kstTime(d: Date) {
  const p = kstParts(d);
  return `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
}

export function kstDayKey(d: Date) {
  const p = kstParts(d);
  return `${p.y}-${p.m}-${p.d}`;
}
