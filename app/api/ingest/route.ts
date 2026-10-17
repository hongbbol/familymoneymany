import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ingestMessage } from '@/lib/ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function secretMatches(given: string | null) {
  const expected = process.env.INGEST_SECRET;
  if (!expected || !given) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

interface Payload {
  text?: string;
  title?: string;
  app?: string;
  source?: string;
  receivedAt?: string | number;
}

async function readPayload(req: Request): Promise<Payload> {
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return (await req.json().catch(() => ({}))) as Payload;
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) as Payload;
  }
  return { text: await req.text() };
}

function toDate(v: Payload['receivedAt']) {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  // MacroDroid 시스템 시간은 초 또는 밀리초 단위일 수 있음
  const d = Number.isFinite(n) ? new Date(n < 1e12 ? n * 1000 : n) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!secretMatches(req.headers.get('x-ingest-secret') ?? url.searchParams.get('token'))) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 });
  }

  const p = await readPayload(req);
  // text/plain 본문을 쓸 때는 부가 정보를 쿼리로 받습니다.
  for (const k of ['app', 'source', 'receivedAt', 'title'] as const) {
    const q = url.searchParams.get(k);
    if (q && !p[k]) p[k] = q;
  }
  const text = [p.title, p.text].filter((s) => s && s.trim() && !s.startsWith('[not_')).join('\n');
  if (!text) return NextResponse.json({ status: 'ignored', reason: 'empty' });

  const outcome = await ingestMessage(text, {
    receivedAt: toDate(p.receivedAt),
    hint: p.app,
    source: p.source?.toUpperCase() === 'SMS' ? 'SMS' : 'NOTIFICATION',
  });

  // 무시/중복도 200으로 응답해 MacroDroid가 재시도/오류 알림을 띄우지 않게 합니다.
  if (outcome.status === 'ignored') return NextResponse.json(outcome);
  const t = outcome.transaction;
  return NextResponse.json({
    status: outcome.status,
    id: t.id,
    amount: t.amount,
    merchant: t.merchant,
    category: t.category,
    bucket: t.bucket,
  });
}
