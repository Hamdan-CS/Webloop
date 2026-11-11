import { supabase } from '@/integrations/supabase/client';
import type { Comment, FeedFiltersState, GuideStep, ModerationQueueItem, Post, PostVisibility } from '../types';
import type { FeedTag } from '../constants';

const POST_SELECT = '*, author:profiles!posts_author_id_fkey(*), images:post_images(*)';

function overlapCount(post: Post, interests: Set<string>): number {
  return post.tags.filter((t) => interests.has(t)).length;
}

export interface FetchFeedParams {
  filters: FeedFiltersState;
  viewerProfileId: string | null;
  limit?: number;
}

export async function fetchFeed({ filters, viewerProfileId, limit = 24 }: FetchFeedParams): Promise<Post[]> {
  let bookmarkedIds: string[] | null = null;
  if (filters.savedOnly) {
    if (!viewerProfileId) return [];
    const { data } = await supabase.from('bookmarks').select('post_id').eq('profile_id', viewerProfileId);
    bookmarkedIds = (data ?? []).map((r) => r.post_id as string);
    if (bookmarkedIds.length === 0) return [];
  }

  let q = supabase.from('posts').select(POST_SELECT);
  if (filters.postType !== 'all') q = q.eq('post_type', filters.postType);
  if (filters.tags.length > 0) q = q.overlaps('tags', filters.tags);
  if (filters.search.trim()) {
    const term = filters.search.trim().replace(/[%,]/g, '');
    q = q.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  }
  if (bookmarkedIds) q = q.in('id', bookmarkedIds);
  q = q.order('created_at', { ascending: false }).limit(limit);
  if (filters.sort === 'most_liked') q = q.order('like_count', { ascending: false });

  const { data, error } = await q;
  if (error) throw error;
  let posts = (data ?? []) as unknown as Post[];

  if (filters.postedBy !== 'all') {
    posts = posts.filter((p) => p.author?.creator_type === filters.postedBy);
  }

  if (filters.sort === 'for_you' && viewerProfileId) {
    const interests = new Set(await fetchUserInterests(viewerProfileId));
    posts = [...posts].sort((a, b) => overlapCount(b, interests) - overlapCount(a, interests));
  }

  if (viewerProfileId && posts.length > 0) {
    const ids = posts.map((p) => p.id);
    const [{ data: likes }, { data: notHelpful }, { data: bookmarks }, { data: tries }] = await Promise.all([
      supabase.from('reactions').select('post_id').eq('profile_id', viewerProfileId).eq('type', 'like').in('post_id', ids),
      supabase.from('reactions').select('post_id').eq('profile_id', viewerProfileId).eq('type', 'not_helpful').in('post_id', ids),
      supabase.from('bookmarks').select('post_id').eq('profile_id', viewerProfileId).in('post_id', ids),
      supabase.from('tries').select('post_id').eq('profile_id', viewerProfileId).in('post_id', ids),
    ]);
    const likeSet = new Set((likes ?? []).map((r) => r.post_id));
    const nhSet = new Set((notHelpful ?? []).map((r) => r.post_id));
    const bmSet = new Set((bookmarks ?? []).map((r) => r.post_id));
    const trySet = new Set((tries ?? []).map((r) => r.post_id));
    posts = posts.map((p) => ({
      ...p,
      viewer_liked: likeSet.has(p.id),
      viewer_not_helpful: nhSet.has(p.id),
      viewer_bookmarked: bmSet.has(p.id),
      viewer_tried: trySet.has(p.id),
    }));
  }

  if (posts.length > 0) {
    const ids = posts.map((p) => p.id);
    const { data: comments } = await supabase
      .from('comments')
      .select('*, author:profiles!comments_author_id_fkey(*)')
      .in('post_id', ids)
      .order('created_at', { ascending: false });
    const topByPost = new Map<string, Comment>();
    for (const c of (comments ?? []) as unknown as Comment[]) {
      if (!topByPost.has(c.post_id)) topByPost.set(c.post_id, c);
    }
    posts = posts.map((p) => ({ ...p, top_comment: topByPost.get(p.id) ?? null }));
  }

  posts.forEach((p) => p.images?.sort((a, b) => a.position - b.position));
  return posts;
}

/** Latest post's created_at, for the nav loop's "newer than my last visit"
 * indicator. Only needs the single newest timestamp, not the content. */
export async function fetchLatestPostTimestamp(): Promise<string | null> {
  const { data, error } = await supabase.from('posts').select('created_at').order('created_at', { ascending: false }).limit(1);
  if (error) return null;
  return data?.[0]?.created_at ?? null;
}

export async function fetchGuestFeed(): Promise<Post[]> {
  const { data, error } = await supabase.rpc('get_guest_feed');
  if (error) throw error;
  return (data ?? []) as unknown as Post[];
}

export interface CreatePostInput {
  author_id: string;
  post_type: Post['post_type'];
  visibility: PostVisibility;
  title: string;
  body: string | null;
  steps: GuideStep[];
  tags: FeedTag[];
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const { data, error } = await supabase.from('posts').insert(input).select(POST_SELECT).single();
  if (error) throw error;
  return data as unknown as Post;
}

export async function addPostImages(
  postId: string,
  images: { path: string; position: number; caption: string | null }[],
): Promise<void> {
  if (images.length === 0) return;
  const { error } = await supabase.from('post_images').insert(images.map((img) => ({ post_id: postId, ...img })));
  if (error) throw error;
}

export interface UpdatePostInput {
  title?: string;
  body?: string | null;
  steps?: GuideStep[];
  tags?: FeedTag[];
  visibility?: PostVisibility;
}

export async function updatePost(id: string, patch: UpdatePostInput): Promise<void> {
  const { error } = await supabase.from('posts').update({ ...patch, edited_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  const { data: images } = await supabase.from('post_images').select('path').eq('post_id', id);
  const paths = (images ?? []).map((i) => i.path as string);
  if (paths.length > 0) await supabase.storage.from('post-media').remove(paths);
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchMyPosts(profileId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('author_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const posts = (data ?? []) as unknown as Post[];
  posts.forEach((p) => p.images?.sort((a, b) => a.position - b.position));
  return posts;
}

export async function setReaction(postId: string, profileId: string, type: 'like' | 'not_helpful', on: boolean): Promise<void> {
  if (on) {
    const { error } = await supabase.from('reactions').upsert(
      { post_id: postId, profile_id: profileId, type },
      { onConflict: 'post_id,profile_id,type', ignoreDuplicates: true },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase.from('reactions').delete().eq('post_id', postId).eq('profile_id', profileId).eq('type', type);
    if (error) throw error;
  }
}

export async function setBookmark(postId: string, profileId: string, on: boolean): Promise<void> {
  if (on) {
    const { error } = await supabase.from('bookmarks').upsert(
      { post_id: postId, profile_id: profileId },
      { onConflict: 'post_id,profile_id', ignoreDuplicates: true },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase.from('bookmarks').delete().eq('post_id', postId).eq('profile_id', profileId);
    if (error) throw error;
  }
}

export async function recordGuideView(postId: string, profileId: string): Promise<void> {
  const { error } = await supabase.from('post_views').upsert(
    { post_id: postId, profile_id: profileId },
    { onConflict: 'post_id,profile_id,viewed_on', ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function recordTry(postId: string, profileId: string, projectId: string | null): Promise<void> {
  const { error } = await supabase.from('tries').upsert(
    { post_id: postId, profile_id: profileId, project_id: projectId },
    { onConflict: 'post_id,profile_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function linkTryToProject(postId: string, profileId: string, projectId: string | null): Promise<void> {
  const { error } = await supabase.from('tries').update({ project_id: projectId }).eq('post_id', postId).eq('profile_id', profileId);
  if (error) throw error;
}

export async function reportPost(postId: string, reporterId: string, reason: string | null): Promise<void> {
  const { error } = await supabase.from('reports').upsert(
    { post_id: postId, reporter_id: reporterId, reason },
    { onConflict: 'post_id,reporter_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:profiles!comments_author_id_fkey(*)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(postId: string, authorId: string, body: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: authorId, body })
    .select('*, author:profiles!comments_author_id_fkey(*)')
    .single();
  if (error) throw error;
  return data as unknown as Comment;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchUserInterests(profileId: string): Promise<FeedTag[]> {
  const { data, error } = await supabase.from('user_interests').select('tag').eq('profile_id', profileId);
  if (error) throw error;
  return (data ?? []).map((r) => r.tag as FeedTag);
}

export async function saveUserInterests(profileId: string, tags: FeedTag[]): Promise<void> {
  await supabase.from('user_interests').delete().eq('profile_id', profileId);
  if (tags.length === 0) return;
  const { error } = await supabase.from('user_interests').insert(tags.map((tag) => ({ profile_id: profileId, tag })));
  if (error) throw error;
}

export async function fetchMyWarningCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('warnings')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId);
  if (error) throw error;
  return count ?? 0;
}

export function getPostImageUrl(path: string): string {
  return supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
}

export async function uploadPostImage(authUserId: string, postId: string, index: number, blob: Blob): Promise<string> {
  const path = `${authUserId}/${postId}/${index}.webp`;
  const { error } = await supabase.storage.from('post-media').upload(path, blob, {
    upsert: true,
    contentType: 'image/webp',
    cacheControl: '3600',
  });
  if (error) throw error;
  return path;
}

// ---- Admin -----------------------------------------------------------

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return Boolean(data);
}

export async function adminRemovePost(postId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('admin_remove_post', { p_post_id: postId, p_reason: reason });
  if (error) throw error;
}

export async function adminRestorePost(postId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_restore_post', { p_post_id: postId });
  if (error) throw error;
}

export async function adminVerifyPost(postId: string, verified: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_verify_post', { p_post_id: postId, p_verified: verified });
  if (error) throw error;
}

export async function adminWarnUser(profileId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('admin_warn_user', { p_profile_id: profileId, p_reason: reason });
  if (error) throw error;
}

export async function fetchModerationQueue(): Promise<ModerationQueueItem[]> {
  const { data, error } = await supabase.rpc('admin_list_moderation_queue');
  if (error) throw error;
  return (data ?? []) as unknown as ModerationQueueItem[];
}
