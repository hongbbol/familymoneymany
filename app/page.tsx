import Link from 'next/link';
import { AddButton } from '@/components/AddButton';
import { SavingsChart, type SavingsPoint } from '@/components/SavingsChart';
import { TransactionList } from '@/components/TransactionList';
import type { TxView } from '@/components/types';
import { bucketLabel } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { compactWon, won } from '@/lib/format';
import { kstParts, monthRange, parseMonth, yearRange } from '@/lib/kst';
import { monthlySavings, planProgress, savingOf, summarize } from '@/lib/summary';

export const dynamic = 'force-dynamic';

const fmtMonth = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
const shift = (y: number, m: number, d: number) => {
  const i = y * 12 + (m - 1) + d;
  return { y: Math.floor(i / 12), m: (i % 12) + 1 };
};

export default async function Dashboard({ searchParams }: { searchParams: { month?: string } }) {
  const now = new Date();
  const { y, m } = parseMonth(searchParams.month, now);
  const today = kstParts(now);
  const isCurrentMonth = y === today.y && m === today.m;

  const mr = monthRange(y, m);
  const yr = yearRange(y);
  const [monthTxs, yearTxs, plan] = await Promise.all([
    prisma.transaction.findMany({ where: { occurredAt: { gte: mr.start, lt: mr.end } }, orderBy: { occurredAt: 'desc' } }),
    prisma.transaction.findMany({
      where: { occurredAt: { gte: yr.start, lt: yr.end }, status: 'APPROVED' },
      select: { amount: true, direction: true, bucket: true, category: true, status: true, occurredAt: true },
    }),
    prisma.savingsPlan.findUnique({ where: { year: y } }),
  ]);

  const includeInv = plan?.includeInvestmentAsSaving ?? false;
  const s = summarize(monthTxs);
  const monthSaving = savingOf(s, includeInv);
  const perMonth = monthlySavings(yearTxs, y, includeInv);
  const progress = plan ? planProgress(plan.targetAmount, perMonth, y, now) : null;

  const lastMonthWithData = y < today.y ? 12 : y > today.y ? 0 : today.m;
  let acc = 0;
  const chart: SavingsPoint[] = perMonth.map((v, i) => {
    acc += v;
    return {
      month: i + 1,
      actual: i + 1 <= lastMonthWithData ? acc : null,
      target: plan ? Math.round((plan.targetAmount * (i + 1)) / 12) : 0,
    };
  });

  const topCats = s.byCategory.slice(0, 6);
  const restCats = s.byCategory.slice(6).reduce((a, c) => a + c.amount, 0);
  if (restCats > 0) topCats.push({ category: '그 외', amount: restCats });
  const maxCat = Math.max(1, ...topCats.map((c) => c.amount));

  const prev = shift(y, m, -1);
  const next = shift(y, m, 1);
  const items: TxView[] = monthTxs.map((t) => ({
    id: t.id,
    occurredAt: t.occurredAt.toISOString(),
    amount: t.amount,
    direction: t.direction,
    bucket: t.bucket,
    category: t.category,
    merchant: t.merchant,
    account: t.account,
    installment: t.installment,
    status: t.status,
    source: t.source,
    rawText: t.rawText,
    note: t.note,
  }));

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href={`/?month=${fmtMonth(prev.y, prev.m)}`} className="rounded-lg px-2 py-1 text-xl text-muted" aria-label="이전 달">
            ‹
          </Link>
          <h1 className="text-xl font-bold">
            {y !== today.y && `${y}년 `}
            {m}월
          </h1>
          <Link href={`/?month=${fmtMonth(next.y, next.m)}`} className="rounded-lg px-2 py-1 text-xl text-muted" aria-label="다음 달">
            ›
          </Link>
          {!isCurrentMonth && (
            <Link href="/" className="ml-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
              이번 달
            </Link>
          )}
        </div>
        <Link href="/settings" className="rounded-lg px-2 py-1 text-sm text-muted">
          설정
        </Link>
      </header>

      {/* 연간 저축 플랜 */}
      <section className="mb-4 rounded-2xl bg-card p-4">
        {plan && progress ? (
          <>
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="font-semibold">
                {y}년 {compactWon(plan.targetAmount)}원 모으기
              </h2>
              <span className="tabular text-sm text-muted">{Math.round(progress.percent * 100)}%</span>
            </div>
            <p className="tabular mb-3 text-2xl font-bold">{won(progress.saved)}</p>
            <div
              className="relative mb-2 h-3 rounded-full bg-border"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={plan.targetAmount}
              aria-valuenow={progress.saved}
              aria-label="연간 저축 진행률"
            >
              <div
                className="h-3 rounded-full bg-accent"
                style={{ width: `${Math.min(100, Math.max(0, progress.percent * 100))}%` }}
              />
              {progress.remainingMonths > 0 && (
                <div
                  className="absolute -top-1 h-5 w-0.5 rounded bg-fg"
                  style={{ left: `${Math.min(100, (progress.expectedByNow / Math.max(1, plan.targetAmount)) * 100)}%` }}
                  title={`지금까지 목표: ${won(progress.expectedByNow)}`}
                />
              )}
            </div>
            <p className="mb-3 text-sm">
              {progress.onTrack ? (
                <span className="text-positive">▲ 목표 페이스보다 {won(progress.saved - progress.expectedByNow)} 앞서는 중</span>
              ) : (
                <span className="text-negative">▼ 목표 페이스보다 {won(progress.expectedByNow - progress.saved)} 뒤처짐</span>
              )}
            </p>
            <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-bg p-3">
                <dt className="text-xs text-muted">남은 {progress.remainingMonths}개월 월 필요액</dt>
                <dd className="tabular font-semibold">{won(progress.requiredPerMonth)}</dd>
              </div>
              <div className="rounded-xl bg-bg p-3">
                <dt className="text-xs text-muted">이 페이스면 연말</dt>
                <dd className="tabular font-semibold">{won(progress.projected)}</dd>
              </div>
            </dl>
            <SavingsChart data={chart} />
          </>
        ) : (
          <div className="text-center">
            <p className="mb-1 font-semibold">{y}년 저축 목표가 없어요</p>
            <p className="mb-3 text-sm text-muted">&lsquo;1년에 1,200만원 모으기&rsquo; 같은 목표를 세워보세요.</p>
            <Link href="/settings#plan" className="inline-block rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
              목표 설정하기
            </Link>
          </div>
        )}
      </section>

      {/* 이번 달 요약 */}
      <section className="mb-4 grid grid-cols-2 gap-2">
        {[
          { label: '수입', value: s.income, tone: 'text-positive' },
          { label: '지출', value: s.spend, tone: '' },
          { label: '이번 달 저축', value: monthSaving, tone: monthSaving < 0 ? 'text-negative' : '' },
          { label: '투자', value: s.investment, tone: '' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-card p-4">
            <div className="text-xs text-muted">{k.label}</div>
            <div className={`text-lg font-bold ${k.tone}`}>{won(k.value)}</div>
          </div>
        ))}
      </section>

      {s.needsReview > 0 && (
        <p className="mb-4 rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">
          ⚠ 자동으로 분류하지 못한 내역 {s.needsReview}건이 있어요. 아래 &lsquo;검토 필요&rsquo;에서 확인하세요.
        </p>
      )}

      {/* 구분별 / 카테고리별 */}
      <section className="mb-4 rounded-2xl bg-card p-4">
        <h2 className="mb-3 font-semibold">어디에 썼나</h2>
        <dl className="mb-4 space-y-1.5 text-sm">
          {(['CARD_SPEND', 'UTILITY', 'TAX', 'OTHER', 'INVESTMENT'] as const).map((b) => (
            <div key={b} className="flex justify-between">
              <dt className="text-muted">{bucketLabel(b)}</dt>
              <dd className="tabular font-medium">{won(s.byBucket[b] ?? 0)}</dd>
            </div>
          ))}
        </dl>
        {topCats.length === 0 ? (
          <p className="text-sm text-muted">이번 달 지출이 아직 없어요.</p>
        ) : (
          <ul className="space-y-2.5" aria-label="카테고리별 지출">
            {topCats.map((c) => (
              <li key={c.category} title={`${c.category} ${won(c.amount)} (${Math.round((c.amount / s.spend) * 100)}%)`}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{c.category}</span>
                  <span className="tabular text-muted">
                    {won(c.amount)} · {Math.round((c.amount / s.spend) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-border/60">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TransactionList items={items} />
      <AddButton />
    </main>
  );
}
