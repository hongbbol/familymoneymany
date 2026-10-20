# familymoneymany — 혼자 쓰는 자동 가계부

휴대폰 브라우저에서 쓰는 개인 가계부 웹앱(PWA)입니다.

- **한 페이지 대시보드**: 이번 달 수입·지출·저축·투자, 카드/공과금/세금/투자 구분별 합계, 카테고리별 지출, 전체 내역
- **연간 'n만원 모으기' 플랜**: 목표 대비 누적 저축, 목표 페이스보다 앞서는지/뒤처지는지, 남은 달 월 필요액, 연말 예상액, 월별 추이 그래프
- **카드 알림 자동 입력**: 안드로이드 MacroDroid가 카드사/은행 알림을 서버로 전달 → 자동 파싱·분류 (승인취소 상계, 푸시+문자 중복 제거, 광고 무시)
- **수동 입력 / 문자 붙여넣기**, 내역 수정 시 "앞으로 항상 이 분류로" 규칙 학습
- 홈 화면에 추가하면 앱처럼 실행, 라이트/다크 모드

## 로컬에서 실행

Node.js 18.17 이상과 Postgres DB가 필요합니다. 가장 쉬운 건 Neon에서 개발용 브랜치를 하나 만들어 그 주소를 쓰는 것이고, 로컬 Postgres도 됩니다.

```bash
npm install
cp .env.example .env      # DATABASE_URL, DATABASE_URL_UNPOOLED, 비밀값 3개 채우기
npx prisma db push        # 테이블 생성
npm run dev               # http://localhost:3000
```

```bash
npm test                  # 카드 문자 파서·저축 계산 테스트
npm run typecheck
```

## 휴대폰에서 쓰기 (배포)

MacroDroid가 서버로 알림을 보내려면 인터넷에서 접속 가능한 주소가 필요합니다. **Vercel(호스팅) + Neon(DB)** 둘 다 무료 플랜으로 충분합니다.

1. [vercel.com](https://vercel.com)에 GitHub 계정으로 가입 → **Add New… → Project** → 이 저장소(`familymoneymany`) **Import**
   - 이 단계에서 바로 Deploy 하지 말고, 먼저 아래 2~3을 하세요. (먼저 눌러서 실패해도 괜찮습니다. 2~3 후 다시 배포하면 됩니다.)
2. 프로젝트의 **Storage** 탭 → **Create Database** → **Neon**(Serverless Postgres) 선택 → 지역은 가까운 곳(예: Singapore) → 연결
   - `DATABASE_URL`, `DATABASE_URL_UNPOOLED`가 환경변수에 자동으로 들어갑니다.
3. **Settings → Environment Variables**에 세 개 추가
   - `APP_PASSWORD` — 로그인 비밀번호
   - `AUTH_SECRET` — 32자 이상 무작위 문자열
   - `INGEST_SECRET` — 무작위 문자열 (MacroDroid에 넣을 토큰)
   - 무작위 문자열은 비밀번호 생성기로 만들거나 `openssl rand -hex 24`
4. **Deployments → Redeploy**. 빌드 때 `vercel-build` 스크립트가 테이블까지 자동으로 만듭니다.
5. 폰 크롬에서 `https://<프로젝트>.vercel.app` 접속 → 메뉴 → **홈 화면에 추가**
6. [docs/MACRODROID.md](docs/MACRODROID.md)대로 자동 입력 설정. 보낼 주소는 앱 **설정** 화면 맨 아래에 나옵니다.

> 집 PC 같은 자체 서버에 SQLite로 올리고 싶다면 `prisma/schema.prisma`의 provider를 `"sqlite"`로 바꾸고 `directUrl` 줄을 지운 뒤 `DATABASE_URL="file:./dev.db"`로 쓰면 됩니다.

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
prisma/schema.prisma      Transaction, CategoryRule, SavingsPlan (Postgres)
```

## 다음에 할 만한 것

- 은행·카드사 엑셀/CSV 내보내기 파일 가져오기 (과거 내역 채우기)
- 한국투자증권 등 증권사 Open API로 보유 주식 평가금 자동 반영
- 공과금·세금 납부일 알림
