import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  /** Called with the number of posts once they load (the page hides the box for visitors at 0). */
  onLoaded?: (count: number) => void;
}

export function MyPostsSection({ profileId, isOwner, viewerProfileId, isAdmin, onRequireAuth, onLoaded }: MyPostsSectionProps) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [playingGuideId, setPlayingGuideId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  // a failed request must not leave the placeholder up forever
  const load = useCallback(() => {
    let live = true;
    setFailed(false);
    setPosts(null);
    fetchMyPosts(profileId)
      .then((list) => { if (!live) return; setPosts(list); onLoaded?.(list.length); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [profileId, onLoaded]);

  useEffect(() => load(), [load]);

  function updatePostInList(postId: string, patch: Partial<Post>) {
    setPosts((prev) => (prev ? prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)) : prev));
  }

  async function handleDelete(post: Post) {
    if (!window.confirm('Delete this post? This also removes its comments, reactions and images. This can\'t be undone.')) return;
    await deletePost(post.id);
    setPosts((prev) => (prev ? prev.filter((p) => p.id !== post.id) : prev));
  }

  if (failed) {
    return (
      <div className="flex items-center justify-between gap-3 py-2 text-sm text-slate-500">
        <span>Couldn't load posts.</span>
        <button type="button" className="font-medium text-accent-500 hover:underline" onClick={load}>Try again</button>
      </div>
    );
  }
  if (posts === null) return <SkeletonFeed count={1} compact />;
  if (posts.length === 0) {
    // visitors: the page hides the whole box (onLoaded(0)); owners get a way to post
    if (!isOwner) return null;
    return (
      <div className="flex items-center justify-between gap-3 py-2 text-sm text-slate-500">
        <span>No posts yet.</span>
        <button type="button" className="font-medium text-accent-500 hover:underline" onClick={() => navigate('/feed', { state: { compose: true } })}>Write a post</button>
      </div>
    );
  }

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
