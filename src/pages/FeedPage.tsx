import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { WAvatar, WPageHeader } from '@/components/app/ui';
import { projectDot, useWorkspaceMaybe } from '@/components/app/workspaceContext';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { fetchProjects } from '@/services/api';
import { statusLabel } from '@/utils/labels';
import { cn } from '@/utils/cn';
import type { Project } from '@/types';
import type { FeedPostType } from '@/features/feed/types';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthPrompt } from '@/components/auth/AuthPrompt';
import { Button } from '@/components/shared/ui/Button';
import { PostCard } from '@/features/feed/components/PostCard';
import { FeedSidebar } from '@/features/feed/components/FeedSidebar';
import { FeedMobileBar } from '@/features/feed/components/FeedMobileBar';
import { SkeletonFeed } from '@/features/feed/components/SkeletonCard';
import { InterestPicker } from '@/features/feed/components/InterestPicker';
import { PostComposer } from '@/features/feed/components/PostComposer';
import { GuestFadeWrapper, GuestJoinGate } from '@/features/feed/components/GuestJoinGate';
import { checkIsAdmin, fetchFeed, fetchGuestFeed, fetchUserInterests } from '@/features/feed/services/feedApi';
import { DEFAULT_FEED_FILTERS, type Post } from '@/features/feed/types';
import type { FeedTag } from '@/features/feed/constants';
import { LAST_FEED_VISIT_KEY } from '@/features/feed/constants';

const FEED_TYPES: { value: FeedPostType; label: string }[] = [
  { value: 'all', label: 'For you' },
  { value: 'guide', label: 'Guides' },
  { value: 'pictures', label: 'Pictures' },
  { value: 'text', label: 'Text' },
];

export function FeedPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { prompt } = useAuthPrompt();
  const ws = useWorkspaceMaybe();
  const isGuest = !authLoading && !user;

  const [filters, setFilters] = useState(DEFAULT_FEED_FILTERS);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [playingGuideId, setPlayingGuideId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [interests, setInterests] = useState<FeedTag[] | null>(null);
  const [showInterestPicker, setShowInterestPicker] = useState(false);

  const requireAuth = useCallback(() => {
    prompt({
      title: 'Join to do more',
      reason: 'Create a free account to like, comment, save, post, and try what others share.',
    });
  }, [prompt]);

  const load = useCallback(async () => {
    if (isGuest) {
      setPosts(await fetchGuestFeed());
      return;
    }
    if (!profile) return;
    setPosts(await fetchFeed({ filters, viewerProfileId: profile.id }));
  }, [isGuest, profile, filters]);

  useEffect(() => {
    setPosts(null);
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    checkIsAdmin().then(setIsAdmin);
  }, [user]);

  useEffect(() => {
    if (!profile) return;
    fetchUserInterests(profile.id).then((tags) => {
      setInterests(tags);
      const seenKey = `wl_interests_prompted_${profile.id}`;
      if (tags.length === 0 && !localStorage.getItem(seenKey)) {
        setShowInterestPicker(true);
      }
    });
  }, [profile]);

  useEffect(() => {
    if (user) localStorage.setItem(LAST_FEED_VISIT_KEY, new Date().toISOString());
  }, [user]);

  const [trending, setTrending] = useState<Project[] | null>(null);
  useEffect(() => {
    if (!ws || !user) return;
    let alive = true;
    fetchProjects({ sort: 'most_active' }).then((r) => { if (alive) setTrending(r.slice(0, 4)); }).catch(() => { if (alive) setTrending([]); });
    return () => { alive = false; };
  }, [ws, user]);

  function updatePostInList(postId: string, patch: Partial<Post>) {
    setPosts((prev) => (prev ? prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)) : prev));
  }

  function dismissInterestPicker(profileId: string) {
    localStorage.setItem(`wl_interests_prompted_${profileId}`, '1');
    setShowInterestPicker(false);
  }

  const visiblePosts = isGuest ? (posts ?? []).slice(0, 2) : posts ?? [];

  const modals = (
    <>
      {showInterestPicker && profile && (
        <InterestPicker
          profileId={profile.id}
          initial={interests ?? []}
          onDone={(tags) => {
            setInterests(tags);
            dismissInterestPicker(profile.id);
          }}
          onSkip={() => dismissInterestPicker(profile.id)}
        />
      )}

      {composerOpen && (
        <PostComposer
          onClose={() => setComposerOpen(false)}
          onPublished={(post) => {
            setPosts((prev) => [post, ...(prev ?? [])]);
            setComposerOpen(false);
          }}
        />
      )}
    </>
  );

  const postList = posts === null ? (
    <SkeletonFeed />
  ) : visiblePosts.length === 0 ? (
    <p className="py-16 text-center text-sm text-slate-500">No posts match these filters yet.</p>
  ) : (
    <div className="mt-4 flex flex-col gap-4">
      {visiblePosts.map((post, i) => {
        const card = (
          <PostCard
            key={post.id}
            post={post}
            viewerProfileId={profile?.id ?? null}
            isGuest={isGuest}
            isAdmin={isAdmin}
            playingGuideId={playingGuideId}
            onPlayGuide={setPlayingGuideId}
            onRequireAuth={requireAuth}
            onChange={updatePostInList}
            onTagClick={(tag) => setFilters((f) => ({ ...f, tags: f.tags.includes(tag as FeedTag) ? f.tags : [...f.tags, tag as FeedTag] }))}
          />
        );
        return isGuest && i === visiblePosts.length - 1 ? <GuestFadeWrapper key={post.id}>{card}</GuestFadeWrapper> : card;
      })}
    </div>
  );

  /* Inside the workspace shell: the demo's Feed view (filter chips, inline
     composer, posts on the left; trending projects and topics on the right).
     The composer opens the existing PostComposer; filters drive the same state. */
  if (ws && profile) {
    return (
      <div className="container-page py-6">
        <WPageHeader title="Feed" subtitle="What people are building across WebLoop right now." />
        <div className="w-grid2 w-feedg">
          <div className="w-col">
            <div className="w-filters">
              {FEED_TYPES.map((t) => (
                <button key={t.value} type="button" className={cn('w-chip', filters.postType === t.value && 'on')} aria-pressed={filters.postType === t.value} onClick={() => setFilters((f) => ({ ...f, postType: t.value }))}>
                  {t.label}
                </button>
              ))}
              <button type="button" className={cn('w-chip', filters.savedOnly && 'on')} aria-pressed={filters.savedOnly} onClick={() => setFilters((f) => ({ ...f, savedOnly: !f.savedOnly }))}>Saved</button>
            </div>
            <div className="w-box w-composer">
              <div className="w-inner" style={{ padding: '14px 16px' }}>
                <div className="w-pc-row">
                  <WAvatar name={profile.display_name} src={profile.avatar_url} />
                  <button type="button" className="w-comp-fake" onClick={() => setComposerOpen(true)}>Share an update, a demo or a question…</button>
                </div>
                <div className="w-comp-row">
                  <button type="button" className="w-chip" onClick={() => setComposerOpen(true)}>+ Image</button>
                  <button type="button" className="w-chip" onClick={() => setComposerOpen(true)}>+ Guide</button>
                  <button type="button" className="w-chip" onClick={() => setComposerOpen(true)}>+ Text</button>
                  <button type="button" className="w-btn-d" onClick={() => setComposerOpen(true)}>Post</button>
                </div>
              </div>
            </div>
            {postList}
          </div>
          <div className="w-col w-side-col">
            <section className="w-box">
              <div className="w-box-h"><b>Trending projects</b><small>Most active</small></div>
              <div className="w-inner w-trend">
                {trending === null ? (
                  <div className="flex justify-center py-2"><LoopLoader size={20} /></div>
                ) : trending.length === 0 ? (
                  <p className="w-muted">No active projects yet.</p>
                ) : trending.map((p) => (
                  <Link key={p.id} to={`/projects/${p.slug}`} className="w-tr">
                    {p.cover_image_url ? <img alt="" src={p.cover_image_url} /> : <span className="w-tr-art" style={{ background: projectDot(p.id) }} />}
                    <span><b>{p.title}</b><small>{p.summary ?? statusLabel[p.status]}</small></span>
                  </Link>
                ))}
              </div>
            </section>
            <section className="w-box w-feed-side">
              <div className="w-box-h"><b>Search and topics</b></div>
              <FeedSidebar filters={filters} onChange={setFilters} onEditTopics={() => setShowInterestPicker(true)} canSort />
            </section>
          </div>
        </div>
        {modals}
      </div>
    );
  }

  return (
    <div className="container-page py-6">
      <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7">
        {!isGuest && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <FeedSidebar
                filters={filters}
                onChange={setFilters}
                onEditTopics={() => setShowInterestPicker(true)}
                canSort
              />
            </div>
          </aside>
        )}

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="heading text-2xl">Feed</h1>
            <Button size="sm" onClick={() => (isGuest ? requireAuth() : setComposerOpen(true))}>
              <Plus size={15} /> Share something
            </Button>
          </div>

          {!isGuest && <FeedMobileBar filters={filters} onChange={setFilters} onEditTopics={() => setShowInterestPicker(true)} />}

          {posts === null ? (
            <SkeletonFeed />
          ) : visiblePosts.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">No posts match these filters yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {visiblePosts.map((post, i) => {
                const card = (
                  <PostCard
                    key={post.id}
                    post={post}
                    viewerProfileId={profile?.id ?? null}
                    isGuest={isGuest}
                    isAdmin={isAdmin}
                    playingGuideId={playingGuideId}
                    onPlayGuide={setPlayingGuideId}
                    onRequireAuth={requireAuth}
                    onChange={updatePostInList}
                    onTagClick={(tag) => setFilters((f) => ({ ...f, tags: f.tags.includes(tag as FeedTag) ? f.tags : [...f.tags, tag as FeedTag] }))}
                  />
                );
                return isGuest && i === visiblePosts.length - 1 ? <GuestFadeWrapper key={post.id}>{card}</GuestFadeWrapper> : card;
              })}
            </div>
          )}

          {isGuest && posts !== null && posts.length > 0 && <GuestJoinGate />}
        </div>
      </div>

      {modals}
    </div>
  );
}
