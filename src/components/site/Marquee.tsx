export default function Marquee({ label, items }: { label: string; items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <section className="marquee-wrap">
      <p className="marquee-label">{label}</p>
      <div className="marquee" aria-hidden="true">
        {doubled.map((item, i) => (
          <span key={i} className="marquee-item">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
