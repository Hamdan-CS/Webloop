export function Legend({ steps, grey }: { steps: string[]; grey: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: grey }} />
        <span className="inline-block h-4 w-2 rounded-sm" style={{ background: steps[3] }} />
        Height = points
      </span>
      <span className="inline-flex items-center gap-1.5">
        {steps.map((c, i) => (
          <span key={i} className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
        ))}
        Color = rating
      </span>
    </div>
  );
}
