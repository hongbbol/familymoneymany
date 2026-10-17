import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

export const runtime = 'nodejs';

const Body = z.object({ password: z.string().min(1).max(200) });

const digest = (s: string) => createHash('sha256').update(s).digest();

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: '서버에 APP_PASSWORD가 설정되지 않았습니다.' }, { status: 500 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !timingSafeEqual(digest(parsed.data.password), digest(expected))) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
