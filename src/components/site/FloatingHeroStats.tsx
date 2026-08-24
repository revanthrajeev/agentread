import CountUp from "@/components/site/CountUp";
import Reveal from "@/components/site/Reveal";

/**
 * Small floating stat cards around the hero terminal — real numbers only, same
 * MIN_DISPLAY_STATS gate as the stat strip below (see src/lib/stats.ts). Positioned, not
 * decorative: each one names a real metric this site's own engine produces.
 */
export default function FloatingHeroStats({
  totalReads,
  avgReadScore,
  sitesScanned,
}: {
  totalReads: number;
  avgReadScore: number | null;
  sitesScanned: number;
}) {
  return (
    <>
      <Reveal delay={3} className="float-stat float-stat-a">
        <div className="glass float-card">
          <div className="float-label">Reads processed</div>
          <div className="float-value">
            <CountUp value={totalReads} />
          </div>
        </div>
      </Reveal>
      {avgReadScore !== null && (
        <Reveal delay={4} className="float-stat float-stat-b">
          <div className="glass float-card">
            <div className="float-label">Avg ReadScore</div>
            <div className="float-value">
              <CountUp value={avgReadScore} />
              <span className="float-unit">/100</span>
            </div>
          </div>
        </Reveal>
      )}
      <Reveal delay={5} className="float-stat float-stat-c">
        <div className="glass float-card">
          <div className="float-label">Sites scanned</div>
          <div className="float-value">
            <CountUp value={sitesScanned} />
          </div>
        </div>
      </Reveal>
    </>
  );
}
