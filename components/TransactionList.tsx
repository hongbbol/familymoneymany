'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { bucketLabel } from '@/lib/constants';
import { kstDateLabel, kstDayKey, kstTime, won } from '@/lib/format';
import { toKstLocalInput } from '@/lib/kst';
import { Sheet } from './Sheet';
import { TransactionForm } from './TransactionForm';
import type { TxView } from './types';

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'INCOME', label: '수입' },
  { key: 'EXPENSE', label: '지출' },
  { key: 'INVESTMENT', label: '투자' },
  { key: 'review', label: '검토 필요' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function signed(t: TxView) {
  if (t.direction === 'INCOME') return `+${won(t.amount)}`;
  if (t.direction === 'TRANSFER') return won(t.amount);
  return `-${won(t.amount)}`;
}

export function TransactionList({ items }: { items: TxView[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [editing, setEditing] = useState<TxView | null>(null);

  const groups = useMemo(() => {
    const filtered = items.filter((t) =>
      filter === 'all' ? true : filter === 'review' ? t.status === 'NEEDS_REVIEW' : t.direction === filter,
    );
    const map = new Map<string, { label: string; items: TxView[] }>();
    for (const t of filtered) {
      const d = new Date(t.occurredAt);
      const key = kstDayKey(d);
      if (!map.has(key)) map.set(key, { label: kstDateLabel(d), items: [] });
      map.get(key)!.items.push(t);
    }
    return [...map.values()];
  }, [items, filter]);

  return (
    <section>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              filter === f.key ? 'border-fg bg-fg text-bg' : 'border-border text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && <p className="py-10 text-center text-sm text-muted">내역이 없습니다.</p>}

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <h3 className="mb-1 text-xs font-medium text-muted">{g.label}</h3>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
              {g.items.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setEditing(t)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-border/40">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{t.merchant || t.category}</span>
                        {t.status === 'NEEDS_REVIEW' && (
                          <span className="shrink-0 rounded bg-negative/15 px-1.5 text-[11px] font-medium text-negative">⚠ 검토</span>
                        )}
                        {t.status === 'CANCELED' && (
                          <span className="shrink-0 rounded bg-border px-1.5 text-[11px] text-muted">취소</span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {kstTime(new Date(t.occurredAt))} · {t.category} · {bucketLabel(t.bucket)}
                        {t.account ? ` · ${t.account}` : ''}
                        {t.installment > 0 ? ` · ${t.installment}개월` : ''}
                      </div>
                    </div>
                    <span
                      className={`tabular shrink-0 font-semibold ${
                        t.status === 'CANCELED' ? 'text-muted line-through' : t.direction === 'INCOME' ? 'text-positive' : ''
                      }`}
                    >
                      {signed(t)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Sheet open={!!editing} title="내역 수정" onClose={() => setEditing(null)}>
        {editing && (
          <div className="space-y-4">
            <TransactionForm
              key={editing.id}
              submitLabel="저장"
              showRemember
              initial={{
                occurredAt: toKstLocalInput(new Date(editing.occurredAt)),
                amount: String(editing.amount),
                bucket: editing.bucket,
                category: editing.category,
                merchant: editing.merchant ?? '',
                note: editing.note ?? '',
              }}
              onSubmit={async (v, rememberRule) => {
                const res = await fetch(`/api/transactions/${editing.id}`, {
                  method: 'PATCH',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ ...v, merchant: v.merchant || null, note: v.note || null, rememberRule }),
                });
                if (!res.ok) return (await res.json()).error ?? '저장 실패';
                setEditing(null);
                router.refresh();
                return null;
              }}
            />
            {editing.rawText && (
              <details className="rounded-xl bg-bg p-3 text-xs text-muted">
                <summary className="cursor-pointer">원문 보기 ({editing.source === 'SMS' ? '문자' : editing.source === 'NOTIFICATION' ? '알림' : editing.source})</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all font-sans">{editing.rawText}</pre>
              </details>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-xl border border-border py-2.5 text-sm"
                onClick={async () => {
                  const next = editing.status === 'CANCELED' ? 'APPROVED' : 'CANCELED';
                  await fetch(`/api/transactions/${editing.id}`, {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ status: next }),
                  });
                  setEditing(null);
                  router.refresh();
                }}
              >
                {editing.status === 'CANCELED' ? '취소 해제' : '취소 처리(집계 제외)'}
              </button>
              <button
                className="rounded-xl border border-negative/40 py-2.5 text-sm text-negative"
                onClick={async () => {
                  if (!confirm('이 내역을 삭제할까요?')) return;
                  await fetch(`/api/transactions/${editing.id}`, { method: 'DELETE' });
                  setEditing(null);
                  router.refresh();
                }}
              >
                삭제
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </section>
  );
}
