import { VerifiedBadge } from '@/components/shared/ui/VerifiedBadge';
import { useIsOfficial } from '@/hooks/useOfficialIds';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { fetchProfileProjects, fetchProjectMembers } from '@/services/api';
import type { Profile, Project } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';

/** "New message": pick a teammate from one of your projects. */
export function ComposePicker({
  profileId,
  onBack,
  onPick,
}: {
  profileId: string;
  onBack: () => void;
  onPick: (profile: Profile, projectId?: string, projectTitle?: string) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Record<string, { profile: Profile; role: string | null }[]>>({});
  const [loading, setLoading] = useState(true);
  const isOfficial = useIsOfficial();

  useEffect(() => {
    (async () => {
      const prs = await fetchProfileProjects(profileId, { includeDrafts: true });
      setProjects(prs);
      const m: Record<string, { profile: Profile; role: string | null }[]> = {};
      await Promise.all(
        prs.map(async (p) => {
          const mem = await fetchProjectMembers(p.id);
          m[p.id] = mem
            .filter((x) => x.profile_id !== profileId && x.profile)
            .map((x) => ({ profile: x.profile as Profile, role: x.role }));
        }),
      );
      setMembers(m);
      setLoading(false);
    })();
  }, [profileId]);

  const hasMembers = Object.values(members).some((m) => m.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <p className="text-xs font-medium text-white">New message</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoopLoader size={18} />
          </div>
        ) : !hasMembers ? (
          <p className="py-8 text-center text-xs text-slate-500">
            No team members yet. Accept join requests on your projects first.
          </p>
        ) : (
          projects.map((p) => {
            const m = members[p.id] ?? [];
            if (m.length === 0) return null;
            return (
              <div key={p.id}>
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-500">{p.title}</p>
                <div className="flex flex-wrap gap-2">
                  {m.map(({ profile, role }) => (
                    <button
                      key={profile.id}
                      onClick={() => onPick(profile, p.id, p.title)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300 hover:border-accent-400/30 hover:text-white transition-colors"
                    >
                      <Avatar src={profile.avatar_url} name={profile.display_name} size="xs" official={isOfficial(profile.id)} />
                      {profile.display_name}
                      {isOfficial(profile.id) && <VerifiedBadge size={12} />}
                      {role && <span className="text-slate-500">· {role}</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
