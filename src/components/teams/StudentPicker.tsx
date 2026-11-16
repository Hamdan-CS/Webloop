import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Profile } from '@/types';
import { searchStudents } from '@/services/api';
import { Avatar } from '@/components/shared/ui/Avatar';

/** Search students by name or @handle and collect a list (chips). */
export function StudentPicker({
  picked,
  onChange,
  excludeIds = [],
  placeholder = 'Search students by name or @handle',
}: {
  picked: Profile[];
  onChange: (next: Profile[]) => void;
  excludeIds?: string[];
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  // string key so a new array from the parent each render doesn't re-run the search
  const skip = [...excludeIds, ...picked.map((p) => p.id)].join(',');

  useEffect(() => {
    if (q.trim().replace(/^@/, '').length < 2) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      searchStudents(q, skip ? skip.split(',') : [])
        .then((r) => { if (!cancelled) setResults(r); })
        .catch(() => { if (!cancelled) setResults([]); });
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, skip]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="pub-in"
          style={{ paddingLeft: 32 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label="Search students"
        />
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-ink-900/95 p-1 shadow-card backdrop-blur-md" role="listbox">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                  onClick={() => { onChange([...picked, p]); setQ(''); setResults([]); }}
                >
                  <Avatar src={p.avatar_url} name={p.display_name} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{p.display_name}</span>
                  <span className="shrink-0 text-xs text-slate-500">@{p.handle}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {picked.length > 0 && (
        <div className="pub-chips">
          {picked.map((p) => (
            <span key={p.id} className="pub-skill">
              {p.display_name}
              <button type="button" aria-label={`Remove ${p.display_name}`} onClick={() => onChange(picked.filter((x) => x.id !== p.id))}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
