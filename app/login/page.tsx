'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-bold">가계부</h1>
      <p className="mb-6 text-sm text-muted">비밀번호를 입력하세요.</p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ password }),
          });
          setBusy(false);
          if (res.ok) window.location.href = '/';
          else setError((await res.json()).error ?? '로그인 실패');
        }}
      >
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          aria-label="비밀번호"
        />
        {error && <p className="text-sm text-negative">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-50">
          로그인
        </button>
      </form>
    </main>
  );
}
