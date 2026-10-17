import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BUCKET_VALUES, DIRECTION_VALUES, directionForBucket } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { ingestMessage } from '@/lib/ingest';
import { fromKstLocalInput, monthRange, parseMonth } from '@/lib/kst';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { y, m } = parseMonth(new URL(req.url).searchParams.get('month'));
  const { start, end } = monthRange(y, m);
  const items = await prisma.transaction.findMany({
    where: { occurredAt: { gte: start, lt: end } },
    orderBy: { occurredAt: 'desc' },
  });
  return NextResponse.json({ items });
}

const Manual = z.object({
  mode: z.literal('manual'),
  occurredAt: z.string(),
  amount: z.coerce.number().int().positive().max(10_000_000_000),
  bucket: z.enum(BUCKET_VALUES),
  direction: z.enum(DIRECTION_VALUES).optional(),
  category: z.string().trim().min(1).max(30),
  merchant: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

const Paste = z.object({ mode: z.literal('paste'), text: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const parsed = z.union([Manual, Paste]).safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값을 확인하세요.', issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  if (body.mode === 'paste') {
    const outcome = await ingestMessage(body.text, { source: 'MANUAL' });
    if (outcome.status === 'ignored') {
      return NextResponse.json({ error: '금액을 인식하지 못했습니다.' }, { status: 422 });
    }
    return NextResponse.json(outcome);
  }

  const occurredAt = fromKstLocalInput(body.occurredAt);
  if (!occurredAt) return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 });

  const transaction = await prisma.transaction.create({
    data: {
      occurredAt,
      amount: body.amount,
      bucket: body.bucket,
      direction: body.direction ?? directionForBucket(body.bucket),
      category: body.category,
      merchant: body.merchant || null,
      note: body.note || null,
      source: 'MANUAL',
    },
  });
  return NextResponse.json({ status: 'created', transaction });
}
