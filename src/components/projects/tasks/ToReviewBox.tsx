import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { WBox } from '@/components/app/ui';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { ReviewInbox } from './ReviewInbox';

/** Dashboard "To review": submitted tasks on your projects (moved out of the bell). Hidden when nothing waits. */
export function ToReviewBox() {
  const { profile, pendingReviews, refreshCounts } = useAuth();
  if (!profile || pendingReviews === 0) return null;
  return (
    <div id="to-review">
      <WBox title="To review" meta={`${pendingReviews} waiting`}>
        <ToReviewList profileId={profile.id} onChange={() => { void refreshCounts(); }} />
      </WBox>
    </div>
  );
}

function ToReviewList({ profileId, onChange }: { profileId: string; onChange: () => void }) {
  const { projects, loading } = useTasks(profileId);
  if (loading) return <div className="flex justify-center py-3"><LoopLoader size={20} /></div>;
  return <ReviewInbox projects={projects} profileId={profileId} compact onChange={onChange} />;
}
