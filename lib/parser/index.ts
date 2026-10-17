import { createHash } from 'node:crypto';
import { fromKst, kstParts } from '../kst';
import { categorize } from './categorize';
import { detectIssuer, ISSUERS } from './issuers';
import type { Bucket, Direction, ParseKind, ParseResult } from './types';

export type { ParseResult } from './types';

const AMOUNT_RE = /(\d{1,3}(?:,\d{3})+|\d+)\s*원/g;
const SKIP_AMOUNT_PREFIX = /(누적|잔액|한도|잔여|총액)[^\d]{0,6}$/;

function extractAmount(text: string): { value: number; raw: string } | undefined {
  for (const m of text.matchAll(AMOUNT_RE)) {
    const before = text.slice(Math.max(0, m.index! - 8), m.index!);
    if (SKIP_AMOUNT_PREFIX.test(before)) continue;
    const value = Number(m[1].replace(/,/g, ''));
    if (value > 0) return { value, raw: m[0] };
  }
  return undefined;
}

const DATETIME_PATTERNS: { re: RegExp; hasYear: boolean }[] = [
  { re: /(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\.?(?:\s+(\d{1,2}):(\d{2}))?/, hasYear: true },
  { re: /(?<!\d)(\d{1,2})[/.-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?(?![\d,])/, hasYear: false },
];

function extractDate(
  text: string,
  receivedAt: Date,
): { date: Date; index: number; length: number } | undefined {
  const now = kstParts(receivedAt);
  for (const { re, hasYear } of DATETIME_PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    let y: number, mo: number, d: number, h: number | undefined, mi: number | undefined;
    if (hasYear) {
      [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
      h = m[4] ? Number(m[4]) : undefined;
      mi = m[5] ? Number(m[5]) : undefined;
    } else {
      [mo, d] = [Number(m[1]), Number(m[2])];
      h = m[3] ? Number(m[3]) : undefined;
      mi = m[4] ? Number(m[4]) : undefined;
      y = now.y;
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    if (h !== undefined && (h > 23 || mi! > 59)) continue;
    let date = fromKst(y, mo, d, h ?? now.h, mi ?? now.min);
    // 연도가 없는 12월 메시지를 1월에 받은 경우 등: 미래로 가면 전년도로.
    if (!hasYear && date.getTime() - receivedAt.getTime() > 24 * 60 * 60 * 1000) {
      date = fromKst(y - 1, mo, d, h ?? now.h, mi ?? now.min);
    }
    return { date, index: m.index, length: m[0].length };
  }
  return undefined;
}

function extractInstallment(text: string): number {
  const m = /(\d{1,2})\s*개월/.exec(text);
  if (m && !/일시불/.test(text)) return Number(m[1]);
  return 0;
}

function detectKind(text: string): ParseKind {
  if (/취소/.test(text)) return 'CARD_CANCEL';
  if (/입금/.test(text)) return 'BANK_DEPOSIT';
  if (/출금|이체|자동납부|자동이체/.test(text)) return 'BANK_WITHDRAWAL';
  if (/승인|결제|사용|일시불|할부|체크/.test(text)) return 'CARD_APPROVAL';
  return 'UNKNOWN';
}

const NOISE_PATTERNS: RegExp[] = [
  /\[?Web발신\]?/g,
  /\[(?:승인|취소|결제)\]/g,
  /(누적|잔액|한도|잔여)\s*:?\s*[\d,]+\s*원?/g,
  /(\d{1,3}(?:,\d{3})+|\d+)\s*원/g,
  /\(\s*\d{3,4}\s*\)|\*{2,}\d*|\d{4}\*+/g,
  /\(?\s*(일시불|\d{1,2}\s*개월(?:\s*할부)?)\s*\)?/g,
  /승인\s*취소|승인|취소|결제|사용|입금|출금|이체|자동납부|자동이체|체크카드|체크|신용/g,
  /[가-힣]{2,4}\s*님/g,
  ...ISSUERS.flatMap((i) => i.patterns.map((p) => new RegExp(p.source, 'gi'))),
];

function clean(segment: string): string {
  let s = segment;
  for (const p of NOISE_PATTERNS) s = s.replace(p, ' ');
  return s
    .replace(/\[\s*\]|\(\s*\)|<\s*>/g, ' ')
    .replace(/[|·,:]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function firstMeaningfulLine(text: string): string | undefined {
  return text
    .split('\n')
    .map(clean)
    .find((l) => l.length > 0 && !/^\d[\d\s/.:-]*$/.test(l));
}

function lastMeaningfulLine(text: string): string | undefined {
  return text
    .split('\n')
    .map(clean)
    .filter((l) => l.length > 0 && !/^\d[\d\s/.:-]*$/.test(l))
    .pop();
}

function extractMerchant(text: string, dateMatch?: { index: number; length: number }) {
  if (dateMatch) {
    const after = text.slice(dateMatch.index + dateMatch.length);
    const m = firstMeaningfulLine(after);
    if (m) return m;
  }
  return lastMeaningfulLine(text);
}

function makeDedupeKey(p: {
  kind: ParseKind;
  account?: string;
  amount: number;
  merchant?: string;
  occurredAt: Date;
}) {
  const t = kstParts(p.occurredAt);
  const minute = `${t.y}${t.m}${t.d}${t.h}${t.min}`;
  const merchant = (p.merchant ?? '').replace(/\s+/g, '');
  return createHash('sha256')
    .update([p.kind, p.account ?? '', p.amount, merchant, minute].join('|'))
    .digest('hex')
    .slice(0, 32);
}

export interface ParseOptions {
  receivedAt?: Date;
  /** 알림을 보낸 앱 이름 등. 카드사 식별에만 사용합니다. */
  hint?: string;
}

export function parseMessage(input: string, opts: ParseOptions = {}): ParseResult | null {
  const receivedAt = opts.receivedAt ?? new Date();
  const text = input.replace(/\r\n?/g, '\n').trim();
  if (!text) return null;

  const amount = extractAmount(text);
  if (!amount) return null;

  const kind = detectKind(text);
  const account = detectIssuer(text) ?? (opts.hint ? detectIssuer(opts.hint) : undefined);
  const dateMatch = extractDate(text, receivedAt);
  const occurredAt = dateMatch?.date ?? receivedAt;
  const merchant = extractMerchant(text, dateMatch) || undefined;
  const installment = extractInstallment(text);

  const catText = `${merchant ?? ''} ${text}`;
  let bucket: Bucket;
  let direction: Direction;
  let category: string;
  let status: ParseResult['status'] = 'APPROVED';

  switch (kind) {
    case 'BANK_DEPOSIT': {
      const c = categorize(catText, { bucket: 'INCOME', direction: 'INCOME' });
      bucket = 'INCOME';
      direction = 'INCOME';
      category = c.bucket === 'INCOME' ? c.category : '입금';
      break;
    }
    case 'BANK_WITHDRAWAL': {
      const c = categorize(catText, { bucket: 'OTHER', direction: 'TRANSFER' });
      ({ bucket, direction, category } = c);
      if (category === '기타') category = '출금';
      break;
    }
    case 'CARD_CANCEL':
    case 'CARD_APPROVAL': {
      const c = categorize(catText, { bucket: 'CARD_SPEND', direction: 'EXPENSE' });
      ({ bucket, direction, category } = c);
      if (bucket === 'INCOME') {
        bucket = 'CARD_SPEND';
        direction = 'EXPENSE';
        category = '기타';
      }
      if (kind === 'CARD_CANCEL') status = 'CANCELED';
      break;
    }
    default: {
      bucket = 'OTHER';
      direction = 'EXPENSE';
      category = '기타';
      status = 'NEEDS_REVIEW';
    }
  }

  return {
    kind,
    amount: amount.value,
    occurredAt,
    account,
    merchant,
    installment,
    category,
    bucket,
    direction,
    status,
    dedupeKey: makeDedupeKey({ kind, account, amount: amount.value, merchant, occurredAt }),
    rawText: text,
  };
}
