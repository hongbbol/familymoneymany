'use client';

import { useState } from 'react';
import { BUCKETS, CATEGORY_SUGGESTIONS } from '@/lib/constants';

export interface TxFormValues {
  occurredAt: string;
  amount: string;
  bucket: string;
  category: string;
  merchant: string;
  note: string;
}

export function TransactionForm({
  initial,
  submitLabel,
  onSubmit,
  showRemember,
}: {
  initial: TxFormValues;
  submitLabel: string;
  onSubmit: (v: TxFormValues, rememberRule: boolean) => Promise<string | null>;
  showRemember?: boolean;
}) {
  const [v, setV] = useState(initial);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof TxFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(await onSubmit(v, remember));
        setBusy(false);
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-muted">금액 (원)</span>
        <input
          inputMode="numeric"
          required
          value={v.amount}
          onChange={(e) => setV({ ...v, amount: e.target.value.replace(/[^\d]/g, '') })}
          placeholder="예: 13500"
          className="tabular text-lg"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">구분</span>
          <select value={v.bucket} onChange={set('bucket')}>
            {BUCKETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">카테고리</span>
          <input list="category-suggestions" required value={v.category} onChange={set('category')} />
          <datalist id="category-suggestions">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">가맹점 / 내용</span>
        <input value={v.merchant} onChange={set('merchant')} placeholder="예: 스타벅스" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">일시</span>
        <input type="datetime-local" required value={v.occurredAt} onChange={set('occurredAt')} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">메모</span>
        <input value={v.note} onChange={set('note')} />
      </label>
      {showRemember && v.merchant && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="!w-auto" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          앞으로 &lsquo;{v.merchant}&rsquo;은(는) 항상 이 분류로
        </label>
      )}
      {error && <p className="text-sm text-negative">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-50">
        {busy ? '저장 중…' : submitLabel}
      </button>
    </form>
  );
}
