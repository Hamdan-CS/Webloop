import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BadgeCheck, ThumbsUp } from 'lucide-react';
import type { Profile } from '@/types';
import { isVerifiedIndependent, type SkillEndorsement } from '@/services/api';
import { EndorseSkillDialog, RecommendStudentDialog, ReportButton } from './IndependentDialogs';

/** "Verified Independent" badge. */
export function VerifiedIndependentBadge({ profile }: { profile: Profile }) {
  if (!isVerifiedIndependent(profile)) return null;
  return (
    <span className="ref-tag inline-flex items-center gap-1" title="Approved by WebLoop">
      <BadgeCheck size={12} className="text-accent-400" /> Verified Independent
    </span>
  );
}

export function EndorsementList({ list }: { list: SkillEndorsement[] }) {
  if (list.length === 0) return null;
  const bySkill = new Map<string, SkillEndorsement[]>();
  for (const e of list) bySkill.set(e.skill, [...(bySkill.get(e.skill) ?? []), e]);
  return (
    <ul className="space-y-2">
      {[...bySkill.entries()].map(([skill, items]) => (
        <li key={skill} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="ref-tag inline-flex items-center gap-1"><Award size={12} /> {skill}</span>
          <span className="text-xs text-slate-500">
            by {items.slice(0, 3).map((e, i) => (
              <span key={e.id}>{i > 0 && ', '}{e.from ? <Link to={`/creators/${e.from.handle}`} className="link-accent">{e.from.display_name}</Link> : 'someone'}</span>
            ))}{items.length > 3 ? ` +${items.length - 3}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Buttons on someone else's profile: Independents endorse/recommend students; anyone can report an Independent. */
export function ProfileIndependentActions({ viewed, viewer, endorsedByMe, onEndorsed, buttonClass = 'w-btn-l' }: {
  viewed: Profile; viewer: Profile | null; endorsedByMe: string[]; onEndorsed: () => void; buttonClass?: string;
}) {
  const [endorseOpen, setEndorseOpen] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);
  if (!viewer || viewer.id === viewed.id) return null;
  const independentViewingStudent = viewer.creator_type === 'independent' && viewed.creator_type === 'student';
  return (
    <>
      {independentViewingStudent && (
        <>
          <button type="button" className={buttonClass} onClick={() => setEndorseOpen(true)}><Award size={14} /> Endorse a skill</button>
          <button type="button" className={buttonClass} onClick={() => setRecommendOpen(true)}><ThumbsUp size={14} /> Recommend to a company</button>
        </>
      )}
      {viewed.creator_type === 'independent' && <ReportButton reporterId={viewer.id} target={{ profileId: viewed.id }} />}
      {endorseOpen && <EndorseSkillDialog fromId={viewer.id} student={viewed} already={endorsedByMe} onClose={() => setEndorseOpen(false)} onDone={onEndorsed} />}
      {recommendOpen && <RecommendStudentDialog fromId={viewer.id} student={viewed} onClose={() => setRecommendOpen(false)} />}
    </>
  );
}
