/**
 * Quadruples the item list rather than doubling it. With only 2 copies, a container wider
 * than one copy's natural width (common on wide desktop viewports for a short list like
 * this) shows a visible blank gap right before the loop wraps, because there's nothing left
 * to fill the remaining track. 4 copies + a -25% shift covers any realistic viewport width
 * while still moving exactly one copy's width per loop, so the scroll speed is unchanged.
 */
export default function Marquee({ label, items }: { label: string; items: string[] }) {
  const quadrupled = [...items, ...items, ...items, ...items];
  return (
    <section className="marquee-wrap">
      <p className="marquee-label">{label}</p>
      <div className="marquee" aria-hidden="true" style={{ "--marquee-shift": "-25%" } as React.CSSProperties}>
        {quadrupled.map((item, i) => (
          <span key={i} className="marquee-item">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
