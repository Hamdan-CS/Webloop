const TONES = ['#cce7ff', '#ffd1b8', '#d3f6e3', '#e4ccff', '#fff2be'];
const QS: [string, string, string][] = [
  ['I joined a company brief in week two of term. By the end I had three merged PRs a recruiter could click on.', 'Tomás Rivera', 'Student, Software Eng.'],
  ['We stopped reading CVs for our internship. We read verified contributions instead.', 'Lena Novak', 'CTO, GreenLeaf Studios'],
  ['Grading group work finally shows who did what, without the awkward peer reviews.', 'Dr. Amira Haddad', 'Lecturer, Stellar University'],
  ['The team matching found a designer two time zones away who was free exactly when we were.', 'Kofi Mensah', 'Student, CS'],
  ['Our briefs get shipped by students who actually want them. It beats a hackathon.', 'Jonas Weber', 'Founder, Fennel Labs'],
  ['My portfolio updates itself. I just keep building.', 'Yuki Tanaka', 'Student, Design']];

const Q = ({ q, hidden }: { q: [string, string, string]; hidden?: boolean }) => (
  <div className="gh-q" aria-hidden={hidden || undefined}>
    <p>“{q[0]}”</p>
    <div className="gh-by"><span className="gh-av" style={{ background: TONES[q[1].length % 5] }}>{q[1].split(' ').map((s) => s[0]).join('').slice(0, 2)}</span><div><b>{q[1]}</b><small>{q[2]}</small></div></div>
  </div>
);

/** 9 · Testimonials: two endless rows in opposite directions, paused on hover (demo sample quotes). */
export function Testimonials() {
  const rowB = [...QS.slice(3), ...QS.slice(0, 3)];
  return (
    <section className="gh-tst">
      <div className="gh-wrap gh-sec-hd" style={{ marginBottom: 24 }}><span className="gh-mono">Voices</span><h2 className="gh-h-display" style={{ marginTop: 14 }}>Made for builders, trusted by teams</h2></div>
      <div className="gh-tst-row gh-a">{[...QS, ...QS].map((q, i) => <Q key={i} q={q} hidden={i >= QS.length} />)}</div>
      <div className="gh-tst-row gh-b">{[...rowB, ...rowB].map((q, i) => <Q key={i} q={q} hidden={i >= rowB.length} />)}</div>
      <span className="gh-sample">Sample quotes for the demo</span>
    </section>
  );
}
