import type { Transaction } from '@prisma/client';
import { prisma } from './db';
import { parseMessage, type ParseResult } from './parser';

const CANCEL_LOOKBACK_MS = 60 * 24 * 60 * 60 * 1000;

async function applyUserRules(r: ParseResult): Promise<ParseResult> {
  const rules = await prisma.categoryRule.findMany({
    where: { active: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
  for (const rule of rules) {
    const target =
      rule.matchType === 'account' ? r.account : rule.matchType === 'rawText' ? r.rawText : r.merchant;
    if (target && target.includes(rule.keyword)) {
      // 입금을 지출로 바꾸는 식의 방향 뒤집기는 하지 않습니다.
      if ((r.direction === 'INCOME') !== (rule.direction === 'INCOME')) continue;
      return { ...r, category: rule.category, bucket: rule.bucket as ParseResult['bucket'], direction: rule.direction as ParseResult['direction'] };
    }
  }
  return r;
}

async function findOriginalForCancel(r: ParseResult) {
  return prisma.transaction.findFirst({
    where: {
      status: 'APPROVED',
      amount: r.amount,
      direction: { not: 'INCOME' },
      ...(r.account ? { account: r.account } : {}),
      ...(r.merchant ? { merchant: r.merchant } : {}),
      occurredAt: { gte: new Date(r.occurredAt.getTime() - CANCEL_LOOKBACK_MS), lte: r.occurredAt },
    },
    orderBy: { occurredAt: 'desc' },
  });
}

export type IngestOutcome =
  | { status: 'created'; transaction: Transaction }
  | { status: 'duplicate'; transaction: Transaction }
  | { status: 'ignored'; reason: string };

export async function ingestMessage(
  text: string,
  opts: { receivedAt?: Date; hint?: string; source?: 'NOTIFICATION' | 'SMS' | 'MANUAL' } = {},
): Promise<IngestOutcome> {
  const parsed = parseMessage(text, opts);
  if (!parsed) return { status: 'ignored', reason: '금액을 찾지 못한 메시지(광고/안내 등)' };

  const existing = await prisma.transaction.findUnique({ where: { dedupeKey: parsed.dedupeKey } });
  if (existing) return { status: 'duplicate', transaction: existing };

  const r = await applyUserRules(parsed);

  let canceledLinkId: string | undefined;
  if (r.kind === 'CARD_CANCEL') {
    const original = await findOriginalForCancel(r);
    if (original) {
      canceledLinkId = original.id;
      await prisma.transaction.update({ where: { id: original.id }, data: { status: 'CANCELED' } });
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      occurredAt: r.occurredAt,
      amount: r.amount,
      direction: r.direction,
      bucket: r.bucket,
      category: r.category,
      merchant: r.merchant,
      account: r.account,
      installment: r.installment,
      status: r.status,
      source: opts.source ?? 'NOTIFICATION',
      rawText: r.rawText,
      dedupeKey: r.dedupeKey,
      canceledLinkId,
    },
  });
  return { status: 'created', transaction };
}
