import { useEffect, useState } from 'react';
import { PostCard } from './PostCard';
import { EditPostModal } from './EditPostModal';
import { SkeletonFeed } from './SkeletonCard';
import { deletePost, fetchMyPosts } from '../services/feedApi';
import type { Post } from '../types';

interface MyPostsSectionProps {
  profileId: string;
  isOwner: boolean;
  viewerProfileId: string | null;
  isAdmin: boolean;
  onRequireAuth: () => void;
}

export function MyPostsSection({ profileId, isOwner, viewerProfileId, isAdmin, onRequireAuth }: MyPostsSectionProps) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [playingGuideId, setPlayingGuideId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyPosts(profileId).then(setPosts);
  }, [profileId]);

  function updatePostInList(postId: string, patch: Partial<Post>) {
    setPosts((prev) => (prev ? prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)) : prev));
  }

  async function handleDelete(post: Post) {
    if (!window.confirm('Delete this post? This also removes its comments, reactions and images. This can\'t be undone.')) return;
    await deletePost(post.id);
    setPosts((prev) => (prev ? prev.filter((p) => p.id !== post.id) : prev));
  }

  if (posts === null) return <SkeletonFeed count={2} />;
  if (posts.length === 0) return <p className="py-6 text-center text-sm text-slate-500">No posts yet.</p>;

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          viewerProfileId={viewerProfileId}
          isGuest={!viewerProfileId}
          isAdmin={isAdmin}
          playingGuideId={playingGuideId}
          onPlayGuide={setPlayingGuideId}
          onRequireAuth={onRequireAuth}
          onChange={updatePostInList}
          onEdit={isOwner ? setEditing : undefined}
          onDelete={isOwner ? handleDelete : undefined}
        />
      ))}
      {editing && (
        <EditPostModal
          post={editing}
          onClose={() => setEditing(null)}
          onSaved={(patch) => {
            updatePostInList(editing.id, patch);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
