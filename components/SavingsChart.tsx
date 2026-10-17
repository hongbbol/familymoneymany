'use client';

import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compactWon, won } from '@/lib/format';

// SVG 속성에서는 CSS 변수가 안 먹으므로 계산된 색을 읽어 넘깁니다.
function useTokens() {
  const read = () => {
    if (typeof window === 'undefined') return null;
    const cs = getComputedStyle(document.documentElement);
    const c = (n: string) => `rgb(${cs.getPropertyValue(n).trim().split(/\s+/).join(',')})`;
    return { accent: c('--accent'), axis: c('--axis'), grid: c('--border'), card: c('--card'), fg: c('--fg'), muted: c('--muted') };
  };
  const [t, setT] = useState<ReturnType<typeof read>>(null);
  useEffect(() => {
    setT(read());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setT(read());
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return t;
}

export interface SavingsPoint {
  month: number;
  actual: number | null;
  target: number;
}

export function SavingsChart({ data }: { data: SavingsPoint[] }) {
  const t = useTokens();
  if (!t) return <div className="h-52" />;

  return (
    <figure>
      <div className="mb-2 flex gap-4 text-xs text-muted" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: t.accent }} /> 실제 누적 저축
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: t.axis }} /> 목표 페이스
        </span>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={t.grid} strokeWidth={1} />
            <XAxis
              dataKey="month"
              tickFormatter={(m) => `${m}월`}
              tick={{ fill: t.axis, fontSize: 11 }}
              axisLine={{ stroke: t.grid }}
              tickLine={false}
              interval={1}
            />
            <YAxis
              tickFormatter={compactWon}
              tick={{ fill: t.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ stroke: t.axis, strokeWidth: 1 }}
              contentStyle={{ background: t.card, border: `1px solid ${t.grid}`, borderRadius: 10, fontSize: 12, color: t.fg }}
              labelFormatter={(m) => `${m}월까지`}
              formatter={(v: number, name) => [won(v), name === 'actual' ? '실제 누적' : '목표 페이스']}
            />
            <Line
              dataKey="target"
              stroke={t.axis}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="actual"
              stroke={t.accent}
              strokeWidth={2}
              dot={{ r: 3, fill: t.accent, stroke: t.card, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: t.accent, stroke: t.card, strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        월별 누적 저축:{' '}
        {data
          .filter((d) => d.actual !== null)
          .map((d) => `${d.month}월 ${won(d.actual!)}`)
          .join(', ')}
      </figcaption>
    </figure>
  );
}
