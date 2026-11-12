import { Marquee } from '@/components/shared/ui/Marquee';
import { QUOTES, TONES } from './homeContent';

const Quote = ({ q }: { q: [string, string, string] }) => (
  <figure className="gh-q">
    <p>“{q[0]}”</p>
    <figcaption className="by">
      <span className="g-av" style={{ background: TONES[q[1].length % 5] }}>{q[1].split(' ').map((s) => s[0]).join('').slice(0, 2)}</span>
      <div><b>{q[1]}</b><small>{q[2]}</small></div>
    </figcaption>
  </figure>
);

/** 9 · Testimonials: two marquee rows in opposite directions, paused on hover. */
export function Testimonials() {
  const rowB = [...QUOTES.slice(3), ...QUOTES.slice(0, 3)];
  return (
    <section className="gh-tst" aria-labelledby="gh-tst-h">
      <div className="gh-wrap gh-sechd" style={{ marginBottom: 24 }}>
        <span className="gh-mono">Voices</span>
        <h2 id="gh-tst-h" className="gh-display" style={{ marginTop: 14 }}>Made for builders, trusted by teams</h2>
      </div>
      <Marquee speed={60} fade={false}>{QUOTES.map((q) => <Quote key={q[1]} q={q} />)}</Marquee>
      <Marquee speed={70} reverse fade={false}>{rowB.map((q) => <Quote key={q[1]} q={q} />)}</Marquee>
      <span className="gh-sample">Sample quotes for the demo</span>
    </section>
  );
}
