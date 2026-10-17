import { kstParts, yearRange } from './kst';

export interface TxLike {
  amount: number;
  direction: string;
  bucket: string;
  category: string;
  status: string;
  occurredAt: Date;
}

export interface Summary {
  income: number;
  spend: number;
  investment: number;
  byBucket: Record<string, number>;
  byCategory: { category: string; amount: number }[];
  needsReview: number;
}

/** 승인(APPROVED) 건만 집계. 이체(TRANSFER)는 제외. */
export function summarize(txs: TxLike[]): Summary {
  const s: Summary = { income: 0, spend: 0, investment: 0, byBucket: {}, byCategory: [], needsReview: 0 };
  const cats = new Map<string, number>();
  for (const t of txs) {
    if (t.status === 'NEEDS_REVIEW') s.needsReview++;
    if (t.status !== 'APPROVED' || t.direction === 'TRANSFER') continue;
    s.byBucket[t.bucket] = (s.byBucket[t.bucket] ?? 0) + t.amount;
    if (t.direction === 'INCOME') s.income += t.amount;
    else if (t.direction === 'INVESTMENT') s.investment += t.amount;
    else {
      s.spend += t.amount;
      cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount);
    }
  }
  s.byCategory = [...cats.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  return s;
}

/**
 * 저축액 = 수입 - 지출 - (투자를 저축으로 안 볼 때) 투자.
 * 투자를 저축으로 보면 주식에 넣은 돈도 '모은 돈'으로 칩니다.
 */
export function savingOf(s: Pick<Summary, 'income' | 'spend' | 'investment'>, includeInvestment: boolean) {
  return s.income - s.spend - (includeInvestment ? 0 : s.investment);
}

export function monthlySavings(txs: TxLike[], year: number, includeInvestment: boolean) {
  const buckets: TxLike[][] = Array.from({ length: 12 }, () => []);
  for (const t of txs) {
    const p = kstParts(t.occurredAt);
    if (p.y === year) buckets[p.m - 1].push(t);
  }
  return buckets.map((b) => savingOf(summarize(b), includeInvestment));
}

export interface PlanProgress {
  target: number;
  saved: number;
  percent: number;
  expectedByNow: number;
  projected: number;
  requiredPerMonth: number;
  remainingMonths: number;
  onTrack: boolean;
}

export function planProgress(target: number, savingsByMonth: number[], year: number, now = new Date()): PlanProgress {
  const saved = savingsByMonth.reduce((a, b) => a + b, 0);
  const { start, end } = yearRange(year);
  const frac = Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime())));
  const p = kstParts(now);
  const remainingMonths = p.y < year ? 12 : p.y > year ? 0 : 12 - p.m + 1;
  const expectedByNow = Math.round(target * frac);
  return {
    target,
    saved,
    percent: target > 0 ? saved / target : 0,
    expectedByNow,
    projected: frac > 0.02 ? Math.round(saved / frac) : saved,
    requiredPerMonth: remainingMonths > 0 ? Math.max(0, Math.ceil((target - saved) / remainingMonths)) : 0,
    remainingMonths,
    onTrack: saved >= expectedByNow,
  };
}
