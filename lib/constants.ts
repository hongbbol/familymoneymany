import type { Bucket, Direction } from './parser/types';

export const BUCKETS: { value: Bucket; label: string; direction: Direction }[] = [
  { value: 'INCOME', label: '수입', direction: 'INCOME' },
  { value: 'CARD_SPEND', label: '카드·생활지출', direction: 'EXPENSE' },
  { value: 'UTILITY', label: '공과금', direction: 'EXPENSE' },
  { value: 'TAX', label: '세금', direction: 'EXPENSE' },
  { value: 'INVESTMENT', label: '주식·투자', direction: 'INVESTMENT' },
  { value: 'OTHER', label: '기타', direction: 'EXPENSE' },
];

export const BUCKET_VALUES = BUCKETS.map((b) => b.value) as [Bucket, ...Bucket[]];
export const DIRECTION_VALUES = ['INCOME', 'EXPENSE', 'INVESTMENT', 'TRANSFER'] as const;
export const STATUS_VALUES = ['APPROVED', 'CANCELED', 'NEEDS_REVIEW'] as const;

export const bucketLabel = (b: string) => BUCKETS.find((x) => x.value === b)?.label ?? b;
export const directionForBucket = (b: string): Direction =>
  BUCKETS.find((x) => x.value === b)?.direction ?? 'EXPENSE';

export const DIRECTION_LABELS: Record<string, string> = {
  INCOME: '수입',
  EXPENSE: '지출',
  INVESTMENT: '투자',
  TRANSFER: '이체(집계 제외)',
};

export const CATEGORY_SUGGESTIONS = [
  '급여', '부수입', '이자수입', '입금',
  '식비', '외식', '카페', '편의점', '마트', '쇼핑', '교통', '주유', '의료', '문화', '경조사',
  '전기', '가스', '수도', '통신', '관리비',
  '세금',
  '주식', '적금', '연금',
  '기타',
];
