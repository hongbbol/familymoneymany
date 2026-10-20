import { jwtVerify, SignJWT } from 'jose';

// Edge(middleware)와 Node 양쪽에서 쓰이므로 Node 전용 API는 쓰지 않습니다.
export const SESSION_COOKIE = 'fm_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error('AUTH_SECRET 환경변수를 16자 이상으로 설정하세요.');
  return new TextEncoder().encode(s);
}

export async function createSessionToken() {
  return new SignJWT({ sub: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}
