'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BUCKETS, bucketLabel } from '@/lib/constants';

export function PlanForm({
  year,
  targetAmount,
  includeInvestmentAsSaving,
}: {
  year: number;
  targetAmount: number | null;
  includeInvestmentAsSaving: boolean;
}) {
  const router = useRouter();
  const [manwon, setManwon] = useState(targetAmount ? String(Math.round(targetAmount / 10_000)) : '');
  const [includeInv, setIncludeInv] = useState(includeInvestmentAsSaving);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch('/api/savings-plan', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ year, targetAmount: Number(manwon) * 10_000, includeInvestmentAsSaving: includeInv }),
        });
        setMsg(res.ok ? '저장했어요.' : '저장 실패');
        router.refresh();
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{year}년에 모을 금액</span>
        <div className="flex items-center gap-2">
          <input
            inputMode="numeric"
            required
            value={manwon}
            onChange={(e) => setManwon(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="1200"
            className="tabular text-lg"
          />
          <span className="shrink-0">만원</span>
        </div>
        {manwon && (
          <span className="mt-1 block text-xs text-muted">
            한 달에 약 {Math.round(Number(manwon) / 12).toLocaleString('ko-KR')}만원씩
          </span>
        )}
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 !w-auto" checked={includeInv} onChange={(e) => setIncludeInv(e.target.checked)} />
        <span>
          주식·투자에 넣은 돈도 &lsquo;모은 돈&rsquo;으로 계산
          <span className="block text-xs text-muted">끄면 수입 − 지출 − 투자 = 저축, 켜면 수입 − 지출 = 저축</span>
        </span>
      </label>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <button className="w-full rounded-xl bg-accent py-3 font-semibold text-white">저장</button>
    </form>
  );
}

export interface RuleView {
  id: string;
  keyword: string;
  matchType: string;
  category: string;
  bucket: string;
}

export function RulesEditor({ rules }: { rules: RuleView[] }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [bucket, setBucket] = useState('CARD_SPEND');

  return (
    <div className="space-y-3">
      <form
        className="grid grid-cols-2 gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await fetch('/api/rules', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ keyword, category, bucket, matchType: 'rawText' }),
          });
          setKeyword('');
          setCategory('');
          router.refresh();
        }}
      >
        <input required value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="문구 (예: 넷플릭스)" className="col-span-2" />
        <input required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="카테고리 (예: 구독)" />
        <select value={bucket} onChange={(e) => setBucket(e.target.value)}>
          {BUCKETS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
        <button className="col-span-2 rounded-xl border border-border py-2.5 text-sm">규칙 추가</button>
      </form>
      {rules.length === 0 ? (
        <p className="text-sm text-muted">아직 규칙이 없어요. 내역을 수정할 때 &lsquo;항상 이 분류로&rsquo;를 체크해도 추가됩니다.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate">
                &lsquo;{r.keyword}&rsquo; → {r.category} <span className="text-muted">({bucketLabel(r.bucket)})</span>
              </span>
              <button
                className="shrink-0 rounded-lg px-2 py-1 text-negative"
                aria-label={`${r.keyword} 규칙 삭제`}
                onClick={async () => {
                  await fetch(`/api/rules?id=${encodeURIComponent(r.id)}`, { method: 'DELETE' });
                  router.refresh();
                }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LogoutButton() {
  return (
    <button
      className="w-full rounded-xl border border-border py-3 text-sm text-muted"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      }}
    >
      로그아웃
    </button>
  );
}
