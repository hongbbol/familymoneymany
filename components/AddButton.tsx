'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toKstLocalInput } from '@/lib/kst';
import { Sheet } from './Sheet';
import { TransactionForm } from './TransactionForm';

export function AddButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'manual' | 'paste'>('manual');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setMsg(null);
    setText('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="내역 추가"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl text-white shadow-lg"
      >
        +
      </button>
      <Sheet open={open} title="내역 추가" onClose={close}>
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-border/50 p-1 text-sm">
          {(['manual', 'paste'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg py-2 ${tab === t ? 'bg-card font-semibold shadow-sm' : 'text-muted'}`}
            >
              {t === 'manual' ? '직접 입력' : '문자 붙여넣기'}
            </button>
          ))}
        </div>
        {tab === 'manual' ? (
          <TransactionForm
            submitLabel="추가"
            initial={{ occurredAt: toKstLocalInput(new Date()), amount: '', bucket: 'CARD_SPEND', category: '식비', merchant: '', note: '' }}
            onSubmit={async (v) => {
              const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ mode: 'manual', ...v }),
              });
              if (!res.ok) return (await res.json()).error ?? '저장 실패';
              close();
              router.refresh();
              return null;
            }}
          />
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ mode: 'paste', text }),
              });
              const body = await res.json();
              if (!res.ok) return setMsg(body.error ?? '인식 실패');
              if (body.status === 'duplicate') return setMsg('이미 등록된 내역입니다.');
              close();
              router.refresh();
            }}
          >
            <p className="text-sm text-muted">카드 승인 문자나 은행 알림을 그대로 붙여넣으면 자동으로 읽어 등록합니다.</p>
            <textarea
              rows={6}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'[Web발신]\n신한카드(1234)승인\n13,500원 일시불\n11/27 08:30 스타벅스'}
            />
            {msg && <p className="text-sm text-negative">{msg}</p>}
            <button className="w-full rounded-xl bg-accent py-3 font-semibold text-white">읽어서 추가</button>
          </form>
        )}
      </Sheet>
    </>
  );
}
