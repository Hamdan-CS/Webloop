import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { MAX_HIGHLIGHTS, MAX_HIGHLIGHT_LEN, MAX_SKILLS } from '@/utils/projectLists';

/* Shared list inputs for the Publish page and the project edit modal:
   the Technologies chip picker and the "What we built" points list.
   Styling reuses the publish form classes (pub-*, global in index.css). */

const SUGGEST = ['React', 'TypeScript', 'Node.js', 'Python', 'Supabase', 'Tailwind', 'PostgreSQL', 'Figma', 'Swift', 'Go'];

export function SkillsField({
  skills,
  onChange,
  inputClassName = 'pub-in',
  onFocus,
  onBlur,
}: {
  skills: string[];
  onChange: (next: string[]) => void;
  inputClassName?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [input, setInput] = useState('');
  const full = skills.length >= MAX_SKILLS;
  const has = (s: string) => skills.some((x) => x.toLowerCase() === s.toLowerCase());

  const add = (v?: string) => {
    const s = (v ?? input).trim().slice(0, 40);
    if (s && !full && !has(s)) onChange([...skills, s]);
    setInput('');
  };

  return (
    <div>
      <div className="pub-add">
        <input
          className={inputClassName}
          value={input}
          disabled={full}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              add();
            }
          }}
          placeholder={full ? `Max ${MAX_SKILLS} technologies` : 'Type a technology…'}
          aria-label="Add a technology"
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => add()} disabled={full}>
          <Plus size={14} /> Add
        </button>
      </div>
      {skills.length > 0 && (
        <div className="pub-chips">
          {skills.map((s) => (
            <span key={s} className="pub-skill">
              {s}
              <button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(skills.filter((x) => x !== s))}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {!full && (
        <div className="pub-sugg">
          {SUGGEST.filter((s) => !has(s)).slice(0, 8).map((s) => (
            <button type="button" key={s} onClick={() => add(s)}>+ {s}</button>
          ))}
        </div>
      )}
      <p className="pub-count">{skills.length}/{MAX_SKILLS}</p>
    </div>
  );
}

export function HighlightsField({
  rows,
  onChange,
  inputClassName = 'pub-in',
}: {
  rows: string[];
  onChange: (next: string[]) => void;
  inputClassName?: string;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const setRow = (i: number, v: string) => onChange(rows.map((r, idx) => (idx === i ? v.slice(0, MAX_HIGHLIGHT_LEN) : r)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      {rows.length > 0 && (
        <ol className="pub-hl">
          {rows.map((r, i) => (
            <li
              key={i}
              className="pub-hl-row"
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); }}
              onDragEnd={() => setDragFrom(null)}
            >
              <span className="pub-hl-n" aria-hidden="true">{i + 1}</span>
              <input
                className={inputClassName}
                value={r}
                maxLength={MAX_HIGHLIGHT_LEN}
                onChange={(e) => setRow(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                placeholder="e.g. Realtime chat with typing indicators"
                aria-label={`Point ${i + 1}`}
              />
              <span className="pub-hl-ctl">
                <button type="button" className="pub-x sm" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={14} /></button>
                <button type="button" className="pub-x sm" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={14} /></button>
                <button type="button" className="pub-x sm" aria-label="Remove point" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}><X size={14} /></button>
              </span>
              {r.length > MAX_HIGHLIGHT_LEN - 30 && <span className="pub-hl-len">{r.length}/{MAX_HIGHLIGHT_LEN}</span>}
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => onChange([...rows, ''])}
        disabled={rows.length >= MAX_HIGHLIGHTS}
      >
        <Plus size={14} /> Add point
      </button>
      <span className="pub-count inline">{rows.length}/{MAX_HIGHLIGHTS}</span>
    </div>
  );
}
