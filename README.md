# familymoneymany — 혼자 쓰는 자동 가계부

휴대폰 브라우저에서 쓰는 개인 가계부 웹앱(PWA)입니다.

- **한 페이지 대시보드**: 이번 달 수입·지출·저축·투자, 카드/공과금/세금/투자 구분별 합계, 카테고리별 지출, 전체 내역
- **연간 'n만원 모으기' 플랜**: 목표 대비 누적 저축, 목표 페이스보다 앞서는지/뒤처지는지, 남은 달 월 필요액, 연말 예상액, 월별 추이 그래프
- **카드 알림 자동 입력**: 안드로이드 MacroDroid가 카드사/은행 알림을 서버로 전달 → 자동 파싱·분류 (승인취소 상계, 푸시+문자 중복 제거, 광고 무시)
- **수동 입력 / 문자 붙여넣기**, 내역 수정 시 "앞으로 항상 이 분류로" 규칙 학습
- 홈 화면에 추가하면 앱처럼 실행, 라이트/다크 모드

## 로컬에서 실행

Node.js 18.17 이상이 필요합니다.

```bash
npm install
cp .env.example .env      # 값 채우기 (APP_PASSWORD, AUTH_SECRET, INGEST_SECRET)
npx prisma db push        # prisma/dev.db 생성
npm run dev               # http://localhost:3000
```

```bash
npm test                  # 카드 문자 파서·저축 계산 테스트
npm run typecheck
```

## 휴대폰에서 쓰기 (배포)

MacroDroid가 서버로 알림을 보내려면 인터넷에서 접속 가능한 주소가 필요합니다.

**SQLite 그대로 쓰기 (가장 간단)** — 디스크가 유지되는 서버(Fly.io 볼륨, Railway 볼륨, 집 PC/NAS + Cloudflare Tunnel 등)에서 `npm run build && npm start`. `DATABASE_URL`을 영구 디스크 경로로 지정하세요.

**Vercel + Neon(무료 Postgres)** — Vercel은 파일이 유지되지 않으므로 DB를 Postgres로 바꿉니다.
1. [Neon](https://neon.tech)에서 DB 생성 후 연결 문자열 복사
2. `prisma/schema.prisma`의 `provider = "sqlite"`를 `"postgresql"`로 변경
3. Vercel에 저장소를 연결하고 환경변수 `DATABASE_URL`, `APP_PASSWORD`, `AUTH_SECRET`, `INGEST_SECRET` 설정
4. Build Command: `prisma generate && prisma db push && next build`

배포 후 폰 크롬에서 주소를 열고 메뉴 → **홈 화면에 추가**. 이어서 [docs/MACRODROID.md](docs/MACRODROID.md)대로 자동 입력을 설정하세요.

## 보안

- 로그인 비밀번호는 `APP_PASSWORD` 하나, 세션은 서명된 httpOnly 쿠키(30일)
- `/api/ingest`는 `INGEST_SECRET` 토큰이 맞아야만 기록
- 금융 내역이 담기므로 반드시 HTTPS로 배포하고, 비밀값은 길고 무작위로 정하세요

## 구조

```
app/page.tsx              대시보드 (한 페이지)
app/settings/page.tsx     저축 목표, 자동 분류 규칙, MacroDroid 주소
app/api/ingest            MacroDroid 웹훅 (토큰 인증)
app/api/transactions      내역 CRUD, 문자 붙여넣기
lib/parser/               카드/은행 메시지 파서 + 기본 분류 규칙
lib/ingest.ts             파싱 → 사용자 규칙 → 취소 상계 → 저장
lib/summary.ts            월 집계, 저축 플랜 진행 계산
prisma/schema.prisma      Transaction, CategoryRule, SavingsPlan
```

## 다음에 할 만한 것

- 은행·카드사 엑셀/CSV 내보내기 파일 가져오기 (과거 내역 채우기)
- 한국투자증권 등 증권사 Open API로 보유 주식 평가금 자동 반영
- 공과금·세금 납부일 알림
