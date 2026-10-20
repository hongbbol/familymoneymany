import { describe, expect, it } from 'vitest';
import { parseMessage } from './index';

// 2026-11-27 10:00 KST
const received = new Date('2026-11-27T01:00:00Z');
const kst = (iso: string) => new Date(`${iso}+09:00`);

describe('parseMessage', () => {
  it('신한카드 멀티라인 승인 문자', () => {
    const r = parseMessage(
      '[Web발신]\n신한카드(1234)승인\n홍길동님 13,500원 일시불\n11/27 08:30\n스타벅스강남점\n누적123,456원',
      { receivedAt: received },
    )!;
    expect(r.kind).toBe('CARD_APPROVAL');
    expect(r.amount).toBe(13500);
    expect(r.account).toBe('신한카드');
    expect(r.merchant).toBe('스타벅스강남점');
    expect(r.occurredAt).toEqual(kst('2026-11-27T08:30'));
    expect(r.category).toBe('카페');
    expect(r.bucket).toBe('CARD_SPEND');
    expect(r.installment).toBe(0);
  });

  it('삼성카드 한 줄 승인', () => {
    const r = parseMessage('삼성카드 15,000원 승인 11/27 09:12 CU편의점', { receivedAt: received })!;
    expect(r.amount).toBe(15000);
    expect(r.account).toBe('삼성카드');
    expect(r.merchant).toBe('CU편의점');
    expect(r.category).toBe('편의점');
  });

  it('현대카드 연도 포함 + 할부', () => {
    const r = parseMessage(
      '현대카드\n[승인] 230,000원\n2026-11-25 14:22\n이마트성수점\n3개월',
      { receivedAt: received },
    )!;
    expect(r.amount).toBe(230000);
    expect(r.merchant).toBe('이마트성수점');
    expect(r.installment).toBe(3);
    expect(r.occurredAt).toEqual(kst('2026-11-25T14:22'));
    expect(r.category).toBe('마트');
  });

  it('KB국민 한 줄, 이름 포함', () => {
    const r = parseMessage('KB국민카드(5678) 승인 홍길동 2,500원 일시불 11.27 09:15 지하철', {
      receivedAt: received,
    })!;
    expect(r.account).toBe('KB국민카드');
    expect(r.amount).toBe(2500);
    expect(r.merchant).toBe('지하철');
    expect(r.category).toBe('교통');
  });

  it('승인취소는 CANCELED', () => {
    const r = parseMessage('하나카드 승인취소 13,500원 11/27 08:40 스타벅스강남점', {
      receivedAt: received,
    })!;
    expect(r.kind).toBe('CARD_CANCEL');
    expect(r.status).toBe('CANCELED');
    expect(r.amount).toBe(13500);
  });

  it('은행 입금은 수입', () => {
    const r = parseMessage('[카카오뱅크] 입금 3,200,000원 (주)OO회사 급여', { receivedAt: received })!;
    expect(r.kind).toBe('BANK_DEPOSIT');
    expect(r.direction).toBe('INCOME');
    expect(r.bucket).toBe('INCOME');
    expect(r.category).toBe('급여');
    expect(r.amount).toBe(3200000);
    expect(r.account).toBe('카카오뱅크');
    expect(r.merchant).toBe('(주)OO회사 급여');
    expect(r.occurredAt).toEqual(received);
  });

  it('자동이체 공과금', () => {
    const r = parseMessage('토스뱅크 자동이체 출금 45,200원 한국전력공사', { receivedAt: received })!;
    expect(r.bucket).toBe('UTILITY');
    expect(r.category).toBe('전기');
  });

  it('증권 이체는 투자', () => {
    const r = parseMessage('카카오뱅크 이체 1,000,000원 한국투자증권', { receivedAt: received })!;
    expect(r.bucket).toBe('INVESTMENT');
    expect(r.direction).toBe('INVESTMENT');
  });

  it('누적 금액은 결제 금액으로 오인하지 않음', () => {
    const r = parseMessage('롯데카드 누적 500,000원 승인 7,800원 11/27 20:03 쿠팡', {
      receivedAt: received,
    })!;
    expect(r.amount).toBe(7800);
  });

  it('연말 메시지를 연초에 받으면 전년도로', () => {
    const jan = new Date('2027-01-01T00:30:00Z');
    const r = parseMessage('삼성카드 5,000원 승인 12/31 23:50 GS25', { receivedAt: jan })!;
    expect(r.occurredAt).toEqual(kst('2026-12-31T23:50'));
  });

  it('같은 메시지는 같은 dedupeKey, 취소는 다른 키', () => {
    const a = parseMessage('삼성카드 15,000원 승인 11/27 09:12 CU편의점', { receivedAt: received })!;
    const b = parseMessage('[Web발신] 삼성카드 15,000원 승인 11/27 09:12 CU편의점', {
      receivedAt: received,
    })!;
    const c = parseMessage('삼성카드 15,000원 승인취소 11/27 09:12 CU편의점', { receivedAt: received })!;
    expect(a.dedupeKey).toBe(b.dedupeKey);
    expect(a.dedupeKey).not.toBe(c.dedupeKey);
  });

  it('앱 이름 힌트로 카드사 식별', () => {
    const r = parseMessage('12,000원 결제 완료 11/27 12:00 맥도날드', {
      receivedAt: received,
      hint: '신한카드',
    })!;
    expect(r.account).toBe('신한카드');
    expect(r.category).toBe('외식');
  });

  it('금액이 없으면 null', () => {
    expect(parseMessage('신한카드 이벤트 안내입니다', { receivedAt: received })).toBeNull();
  });
});
