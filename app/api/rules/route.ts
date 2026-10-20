import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BUCKET_VALUES, directionForBucket } from '@/lib/constants';
import { prisma } from '@/lib/db';

const Body = z.object({
  keyword: z.string().trim().min(1).max(50),
  matchType: z.enum(['merchant', 'rawText', 'account']).default('merchant'),
  category: z.string().trim().min(1).max(30),
  bucket: z.enum(BUCKET_VALUES),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '입력값을 확인하세요.' }, { status: 400 });
  const rule = await prisma.categoryRule.create({
    data: { ...parsed.data, direction: directionForBucket(parsed.data.bucket), priority: 10 },
  });
  return NextResponse.json({ rule });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.categoryRule.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
