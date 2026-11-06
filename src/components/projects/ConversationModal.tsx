import type { Profile } from '@/types';
import { ConversationThread } from '@/components/messaging/ConversationThread';

interface Props {
  myProfile: Profile;
  otherProfile: Profile;
  projectId?: string;
  projectTitle?: string;
  onClose: () => void;
}

export function ConversationModal({ myProfile, otherProfile, projectId, projectTitle, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up">
      <div className="surface-raised shadow-card w-full max-w-lg p-0 flex flex-col max-h-[80vh]">
        <ConversationThread
          myProfile={myProfile}
          otherProfile={otherProfile}
          projectId={projectId}
          projectTitle={projectTitle}
          variant="modal"
          onClose={onClose}
          knownIsOwner={false}
        />
      </div>
    </div>
  );
}
