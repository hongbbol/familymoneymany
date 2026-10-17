import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const Body = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  targetAmount: z.coerce.number().int().min(0).max(100_000_000_000),
  includeInvestmentAsSaving: z.boolean().default(false),
  note: z.string().trim().max(200).optional(),
});

export async function PUT(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '입력값을 확인하세요.' }, { status: 400 });
  const { year, ...data } = parsed.data;
  const plan = await prisma.savingsPlan.upsert({
    where: { year },
    create: { year, ...data },
    update: data,
  });
  return NextResponse.json({ plan });
}
