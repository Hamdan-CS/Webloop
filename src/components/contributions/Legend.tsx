export function Legend() {
  return (
    <div className="pf-heat-leg">
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((l) => (
        <span key={l} className="hc" style={{ background: `var(--h${l})` }} />
      ))}
      <span>More</span>
    </div>
  );
}
