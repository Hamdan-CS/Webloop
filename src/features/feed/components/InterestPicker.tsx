import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/shared/ui/Button';
import { FEED_TAGS, MIN_ONBOARDING_INTERESTS, type FeedTag } from '../constants';
import { saveUserInterests } from '../services/feedApi';

interface InterestPickerProps {
  profileId: string;
  initial: FeedTag[];
  onDone: (tags: FeedTag[]) => void;
  onSkip?: () => void;
}

export function InterestPicker({ profileId, initial, onDone, onSkip }: InterestPickerProps) {
  const [selected, setSelected] = useState<FeedTag[]>(initial);
  const [saving, setSaving] = useState(false);

  function toggle(tag: FeedTag) {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function save() {
    setSaving(true);
    try {
      await saveUserInterests(profileId, selected);
      onDone(selected);
    } finally {
      setSaving(false);
    }
  }

  const canSave = selected.length >= MIN_ONBOARDING_INTERESTS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="surface-raised w-full max-w-md p-7 shadow-card animate-fade-in-up">
        <h3 className="heading text-lg">What are you into?</h3>
        <p className="mt-1.5 text-sm text-slate-400">
          Pick at least {MIN_ONBOARDING_INTERESTS} topics — the "For you" feed sort uses these to show you relevant posts first.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {FEED_TAGS.map((tag) => {
            const on = selected.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={cn(
                  'chip transition-colors',
                  on && 'border-accent-400/50 bg-accent-500/15 text-accent-200',
                )}
              >
                {on && <Check size={12} />}
                {tag}
              </button>
            );
          })}
        </div>
        <Button className="mt-6 w-full" disabled={!canSave || saving} onClick={save}>
          {canSave ? 'Save and continue' : `Pick ${MIN_ONBOARDING_INTERESTS - selected.length} more`}
        </Button>
        {onSkip && (
          <button type="button" onClick={onSkip} className="mt-3 block w-full text-center text-xs text-slate-500 hover:text-slate-300">
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
