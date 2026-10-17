import type { Bucket, Direction } from './types';

// 가맹점/텍스트 키워드 → 기본 카테고리/버킷. 사용자가 CategoryRule로 재정의 가능.
interface Rule {
  keyword: RegExp;
  category: string;
  bucket: Bucket;
  direction: Direction;
}

const DEFAULT_RULES: Rule[] = [
  // 공과금 / 통신 / 전기 / 가스 / 수도
  { keyword: /한국전력|한전/, category: '전기', bucket: 'UTILITY', direction: 'EXPENSE' },
  { keyword: /도시가스|지역난방/, category: '가스', bucket: 'UTILITY', direction: 'EXPENSE' },
  { keyword: /상수도|수도/, category: '수도', bucket: 'UTILITY', direction: 'EXPENSE' },
  { keyword: /SKT|KT\b|LGU\+|SK텔레콤|KT통신|엘지유플러스|알뜰폰/, category: '통신', bucket: 'UTILITY', direction: 'EXPENSE' },
  { keyword: /관리비|아파트관리/, category: '관리비', bucket: 'UTILITY', direction: 'EXPENSE' },
  // 세금
  { keyword: /국세청|홈택스|소득세|부가세|지방세|자동차세|재산세|주민세|종합소득세/, category: '세금', bucket: 'TAX', direction: 'EXPENSE' },
  // 투자
  { keyword: /한국투자증권|키움증권|미래에셋|NH투자|삼성증권|증권계좌|주식매수|해외주식/, category: '주식', bucket: 'INVESTMENT', direction: 'INVESTMENT' },
  // 식비 / 카페
  { keyword: /스타벅스|투썸|이디야|메가커피|빽다방|커피빈|할리스/, category: '카페', bucket: 'CARD_SPEND', direction: 'EXPENSE' },
  { keyword: /맥도날드|버거킹|롯데리아|KFC|서브웨이|배달의민족|쿠팡이츠|요기요/, category: '외식', bucket: 'CARD_SPEND', direction: 'EXPENSE' },
  // 편의점 / 마트
  { keyword: /GS25|CU\b|세븐일레븐|이마트24|미니스톱/, category: '편의점', bucket: 'CARD_SPEND', direction: 'EXPENSE' },
  { keyword: /이마트|홈플러스|롯데마트|코스트코|트레이더스/, category: '마트', bucket: 'CARD_SPEND', direction: 'EXPENSE' },
  // 교통
  { keyword: /지하철|티머니|서울교통|코레일|SRT|KTX|고속버스|택시|카카오T|우버/, category: '교통', bucket: 'CARD_SPEND', direction: 'EXPENSE' },
  { keyword: /GS칼텍스|SK에너지|S-OIL|현대오일뱅크|주유|LPG충전/, category: '주유', bucket: 'CARD_SPEND', direction: 'EXPENSE' },
  // 쇼핑
  { keyword: /쿠팡|11번가|G마켓|옥션|SSG|롯데온|무신사|지그재그|오늘의집/, category: '쇼핑', bucket: 'CARD_SPEND', direction: 'EXPENSE' },
  // 수입 공통
  { keyword: /급여|월급|상여|보너스/, category: '급여', bucket: 'INCOME', direction: 'INCOME' },
  { keyword: /이자|예금이자/, category: '이자수입', bucket: 'INCOME', direction: 'INCOME' },
];

export interface Categorized {
  category: string;
  bucket: Bucket;
  direction: Direction;
}

export function categorize(
  text: string,
  fallback: { bucket: Bucket; direction: Direction },
): Categorized {
  for (const rule of DEFAULT_RULES) {
    if (rule.keyword.test(text)) {
      return { category: rule.category, bucket: rule.bucket, direction: rule.direction };
    }
  }
  return { category: '기타', bucket: fallback.bucket, direction: fallback.direction };
}
