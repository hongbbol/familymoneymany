// 주요 카드사/은행 식별 키워드. 가장 먼저 매치되는 것을 account 이름으로 삼습니다.
export const ISSUERS = [
  { key: 'SHINHAN', name: '신한카드', patterns: [/신한카드/, /신한\s*\(\d/, /SHINHAN/i] },
  { key: 'SAMSUNG', name: '삼성카드', patterns: [/삼성카드/, /SAMSUNG\s*CARD/i] },
  { key: 'HYUNDAI', name: '현대카드', patterns: [/현대카드/, /HYUNDAI\s*CARD/i] },
  { key: 'KB', name: 'KB국민카드', patterns: [/국민카드/, /KB\s*국민/, /KB카드/] },
  { key: 'LOTTE', name: '롯데카드', patterns: [/롯데카드/] },
  { key: 'WOORI', name: '우리카드', patterns: [/우리카드/] },
  { key: 'HANA', name: '하나카드', patterns: [/하나카드/, /하나1Q/] },
  { key: 'BC', name: 'BC카드', patterns: [/\bBC카드/, /비씨카드/] },
  { key: 'NH', name: 'NH농협카드', patterns: [/농협카드/, /NH카드/] },
  { key: 'KAKAO', name: '카카오뱅크', patterns: [/카카오뱅크/, /카뱅/] },
  { key: 'TOSS_BANK', name: '토스뱅크', patterns: [/토스뱅크/] },
  { key: 'TOSS', name: '토스', patterns: [/토스페이/, /\bTOSS\b/i] },
  { key: 'KAKAOPAY', name: '카카오페이', patterns: [/카카오페이/] },
  { key: 'SAMSUNGPAY', name: '삼성페이', patterns: [/삼성페이/] },
  { key: 'NAVERPAY', name: '네이버페이', patterns: [/네이버페이/] },
] as const;

export function detectIssuer(text: string): string | undefined {
  for (const issuer of ISSUERS) {
    if (issuer.patterns.some((p) => p.test(text))) return issuer.name;
  }
  return undefined;
}
