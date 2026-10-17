export type Direction = 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'TRANSFER';
export type Bucket =
  | 'INCOME'
  | 'CARD_SPEND'
  | 'UTILITY'
  | 'TAX'
  | 'INVESTMENT'
  | 'OTHER';
export type ParseKind =
  | 'CARD_APPROVAL'
  | 'CARD_CANCEL'
  | 'BANK_DEPOSIT'
  | 'BANK_WITHDRAWAL'
  | 'UNKNOWN';

export interface ParseResult {
  kind: ParseKind;
  amount: number;
  occurredAt: Date;
  account?: string;    // 카드명 또는 계좌명
  merchant?: string;   // 가맹점 또는 거래 상대
  installment: number; // 0 = 일시불, N = N개월
  category: string;
  bucket: Bucket;
  direction: Direction;
  status: 'APPROVED' | 'CANCELED' | 'NEEDS_REVIEW';
  dedupeKey: string;
  rawText: string;
}
