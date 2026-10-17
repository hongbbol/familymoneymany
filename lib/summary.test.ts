import { describe, expect, it } from 'vitest';
import { monthlySavings, planProgress, savingOf, summarize, type TxLike } from './summary';

const tx = (p: Partial<TxLike>): TxLike => ({
  amount: 0,
  direction: 'EXPENSE',
  bucket: 'CARD_SPEND',
  category: '기타',
  status: 'APPROVED',
  occurredAt: new Date('2026-03-10T03:00:00Z'),
  ...p,
});

describe('summarize', () => {
  const txs = [
    tx({ amount: 3_000_000, direction: 'INCOME', bucket: 'INCOME', category: '급여' }),
    tx({ amount: 50_000, category: '식비' }),
    tx({ amount: 30_000, category: '식비' }),
    tx({ amount: 80_000, bucket: 'UTILITY', category: '전기' }),
    tx({ amount: 500_000, direction: 'INVESTMENT', bucket: 'INVESTMENT', category: '주식' }),
    tx({ amount: 99_999, status: 'CANCELED' }),
    tx({ amount: 12_345, status: 'NEEDS_REVIEW' }),
    tx({ amount: 1_000_000, direction: 'TRANSFER', bucket: 'OTHER' }),
  ];

  it('승인 건만, 이체 제외', () => {
    const s = summarize(txs);
    expect(s.income).toBe(3_000_000);
    expect(s.spend).toBe(160_000);
    expect(s.investment).toBe(500_000);
    expect(s.needsReview).toBe(1);
    expect(s.byCategory[0]).toEqual({ category: '식비', amount: 80_000 });
    expect(s.byBucket.UTILITY).toBe(80_000);
  });

  it('투자를 저축으로 볼지 여부', () => {
    const s = summarize(txs);
    expect(savingOf(s, true)).toBe(2_840_000);
    expect(savingOf(s, false)).toBe(2_340_000);
  });

  it('월별 저축은 KST 기준 월로 나눔', () => {
    const m = monthlySavings(
      [
        // 1월 31일 23:30 KST = 1월 31일 14:30 UTC
        tx({ amount: 100, direction: 'INCOME', bucket: 'INCOME', occurredAt: new Date('2026-01-31T14:30:00Z') }),
        // 2월 1일 00:30 KST = 1월 31일 15:30 UTC
        tx({ amount: 200, direction: 'INCOME', bucket: 'INCOME', occurredAt: new Date('2026-01-31T15:30:00Z') }),
      ],
      2026,
      false,
    );
    expect(m[0]).toBe(100);
    expect(m[1]).toBe(200);
  });
});

describe('planProgress', () => {
  it('연 중간 페이스 계산', () => {
    const months = [1_000_000, 1_000_000, 1_000_000, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // 2026-07-02 KST 즈음 = 연의 절반
    const p = planProgress(12_000_000, months, 2026, new Date('2026-07-02T03:00:00Z'));
    expect(p.saved).toBe(3_000_000);
    expect(p.remainingMonths).toBe(6);
    expect(p.requiredPerMonth).toBe(1_500_000);
    expect(p.onTrack).toBe(false);
    expect(p.expectedByNow).toBeGreaterThan(5_900_000);
    expect(p.expectedByNow).toBeLessThan(6_100_000);
  });

  it('지난 연도는 남은 달 0', () => {
    const p = planProgress(1_000, Array(12).fill(100), 2025, new Date('2026-03-01T00:00:00Z'));
    expect(p.remainingMonths).toBe(0);
    expect(p.requiredPerMonth).toBe(0);
    expect(p.saved).toBe(1_200);
    expect(p.onTrack).toBe(true);
  });
});
