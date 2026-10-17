import { headers } from 'next/headers';
import Link from 'next/link';
import { LogoutButton, PlanForm, RulesEditor } from '@/components/SettingsForms';
import { prisma } from '@/lib/db';
import { kstParts } from '@/lib/kst';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const year = kstParts(new Date()).y;
  const [plan, rules] = await Promise.all([
    prisma.savingsPlan.findUnique({ where: { year } }),
    prisma.categoryRule.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const ingestUrl = `${proto}://${host}/api/ingest`;

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-2">
        <Link href="/" className="rounded-lg px-2 py-1 text-xl text-muted" aria-label="뒤로">
          ‹
        </Link>
        <h1 className="text-xl font-bold">설정</h1>
      </header>

      <section id="plan" className="rounded-2xl bg-card p-4">
        <h2 className="mb-3 font-semibold">연간 저축 목표</h2>
        <PlanForm
          year={year}
          targetAmount={plan?.targetAmount ?? null}
          includeInvestmentAsSaving={plan?.includeInvestmentAsSaving ?? false}
        />
      </section>

      <section className="rounded-2xl bg-card p-4">
        <h2 className="mb-1 font-semibold">자동 분류 규칙</h2>
        <p className="mb-3 text-xs text-muted">알림/문자에 이 문구가 있으면 지정한 분류로 저장합니다. 기본 규칙보다 우선합니다.</p>
        <RulesEditor
          rules={rules.map((r) => ({ id: r.id, keyword: r.keyword, matchType: r.matchType, category: r.category, bucket: r.bucket }))}
        />
      </section>

      <section className="rounded-2xl bg-card p-4 text-sm">
        <h2 className="mb-2 font-semibold">카드 알림 자동 입력 (MacroDroid)</h2>
        <p className="mb-2 text-muted">MacroDroid의 HTTP 요청 액션에 아래 주소를 넣으세요. 토큰은 서버의 INGEST_SECRET 값입니다.</p>
        <code className="block break-all rounded-lg bg-bg p-3 text-xs">{ingestUrl}?token=INGEST_SECRET값</code>
        <p className="mt-2 text-xs text-muted">자세한 설정 방법은 저장소의 docs/MACRODROID.md를 참고하세요.</p>
      </section>

      <LogoutButton />
    </main>
  );
}
