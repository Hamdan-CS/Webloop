import { Link2, SquareTerminal } from 'lucide-react';
import { domainOf, linkError, MAX_COMMAND_LEN, MAX_LINK_LABEL_LEN, MAX_LINK_LEN, type ImageDetailsDraft } from '../imageDetails';

const INPUT =
  'w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent-400/40 focus:outline-none';

/** Fields for one picture: caption, terminal command, link (+ optional label). */
export function ImageDetailsEditor({
  value,
  onChange,
  previewUrl,
  index,
  showLinkError,
}: {
  value: ImageDetailsDraft;
  onChange: (next: ImageDetailsDraft) => void;
  previewUrl: string;
  index: number;
  showLinkError?: boolean;
}) {
  const set = (k: keyof ImageDetailsDraft, v: string) => onChange({ ...value, [k]: v });
  const err = linkError(value.link_url);
  const domain = domainOf(value.link_url.trim());

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2.5 flex items-center gap-2.5">
        <img src={previewUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
        <p className="text-sm font-medium text-white">Image {index + 1} details</p>
      </div>
      <div className="space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Caption</span>
          <input value={value.caption} onChange={(e) => set('caption', e.target.value)} placeholder="Optional caption" className={INPUT} maxLength={300} />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400"><SquareTerminal size={13} /> Terminal command</span>
          <textarea
            value={value.command}
            onChange={(e) => set('command', e.target.value)}
            rows={3}
            maxLength={MAX_COMMAND_LEN}
            spellCheck={false}
            placeholder="$ git clone https://github.com/..."
            className={`${INPUT} resize-y font-mono text-[13px]`}
          />
          <span className="mt-0.5 block text-[11px] text-slate-500">One command per line. Readers can open it in a terminal and copy it.</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400"><Link2 size={13} /> Link</span>
            <input
              type="url"
              inputMode="url"
              value={value.link_url}
              onChange={(e) => set('link_url', e.target.value)}
              placeholder="https://github.com/..."
              maxLength={MAX_LINK_LEN}
              className={INPUT}
              aria-invalid={!!(showLinkError && err)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Label</span>
            <input
              value={value.link_label}
              onChange={(e) => set('link_label', e.target.value)}
              placeholder={domain || 'github.com'}
              maxLength={MAX_LINK_LABEL_LEN}
              className={INPUT}
            />
          </label>
        </div>
        {err && value.link_url.trim() && <p className="text-xs text-signal-rose">{err}</p>}
      </div>
    </div>
  );
}
