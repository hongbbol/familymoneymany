import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BUCKET_VALUES, DIRECTION_VALUES, STATUS_VALUES, directionForBucket } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { fromKstLocalInput } from '@/lib/kst';

const Patch = z.object({
  occurredAt: z.string().optional(),
  amount: z.coerce.number().int().positive().max(10_000_000_000).optional(),
  bucket: z.enum(BUCKET_VALUES).optional(),
  direction: z.enum(DIRECTION_VALUES).optional(),
  category: z.string().trim().min(1).max(30).optional(),
  merchant: z.string().trim().max(100).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  rememberRule: z.boolean().optional(),
});

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '입력값을 확인하세요.' }, { status: 400 });
  const { rememberRule, occurredAt, ...rest } = parsed.data;

  const current = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const data: Record<string, unknown> = { ...rest };
  if (occurredAt) {
    const d = fromKstLocalInput(occurredAt);
    if (!d) return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 });
    data.occurredAt = d;
  }
  if (rest.bucket && !rest.direction) data.direction = directionForBucket(rest.bucket);
  // 검토 필요 항목을 사용자가 분류하면 확정 처리
  if (current.status === 'NEEDS_REVIEW' && !rest.status && (rest.bucket || rest.category)) {
    data.status = 'APPROVED';
  }

  const updated = await prisma.transaction.update({ where: { id: params.id }, data });

  if (rememberRule && updated.merchant) {
    await prisma.categoryRule.deleteMany({ where: { keyword: updated.merchant, matchType: 'merchant' } });
    await prisma.categoryRule.create({
      data: {
        keyword: updated.merchant,
        matchType: 'merchant',
        category: updated.category,
        bucket: updated.bucket,
        direction: updated.direction,
        priority: 10,
      },
    });
  }
  return NextResponse.json({ transaction: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const t = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!t) return NextResponse.json({ error: 'not found' }, { status: 404 });
  // 취소 기록을 지우면 원거래를 되살립니다.
  if (t.canceledLinkId) {
    await prisma.transaction.updateMany({
      where: { id: t.canceledLinkId, status: 'CANCELED' },
      data: { status: 'APPROVED' },
    });
  }
  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
