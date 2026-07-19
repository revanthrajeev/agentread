"use client";

interface ReadRow {
  created_at: string;
}

const DAYS = 14;

/** Real per-user reads bucketed by day — single series (magnitude), so one hue, no legend needed. */
export default function ReadsChart({ reads }: { reads: ReadRow[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    return { date: d, count: 0 };
  });

  for (const r of reads) {
    const d = new Date(r.created_at);
    d.setHours(0, 0, 0, 0);
    const idx = buckets.findIndex((b) => b.date.getTime() === d.getTime());
    if (idx !== -1) buckets[idx].count += 1;
  }

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const w = 640;
  const h = 160;
  const padBottom = 22;
  const barGap = 4;
  const barW = (w - barGap * (DAYS - 1)) / DAYS;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="Reads per day, last 14 days">
      {buckets.map((b, i) => {
        const barH = Math.max(2, ((h - padBottom) * b.count) / max);
        const x = i * (barW + barGap);
        const y = h - padBottom - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill="var(--viz-s1)" opacity={b.count ? 1 : 0.18}>
              <title>
                {b.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}: {b.count} read
                {b.count === 1 ? "" : "s"}
              </title>
            </rect>
            {(i === 0 || i === DAYS - 1 || i === Math.floor(DAYS / 2)) && (
              <text
                x={x + barW / 2}
                y={h - 6}
                textAnchor="middle"
                fontSize="9"
                fill="var(--muted)"
              >
                {b.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
