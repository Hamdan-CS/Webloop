import type { Profile } from '@/types';
import type { FeedTag } from './constants';

export type PostType = 'guide' | 'pictures' | 'text';
export type PostVisibility = 'everyone' | 'students_only';

export type GuideStep =
  | { type: 'terminal'; title: string; cmd: string; out: string[] }
  | { type: 'code'; title: string; code: string; highlightLines?: number[] }
  | { type: 'tip'; title: string; text: string }
  | { type: 'screenshot'; title: string; imagePath: string; hotspot?: { x: number; y: number }; callout?: string };

export interface PostImage {
  id: string;
  post_id: string;
  path: string;
  position: number;
  caption: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  edited_at: string | null;
  created_at: string;
  author?: Profile;
}

export interface Post {
  id: string;
  author_id: string;
  post_type: PostType;
  visibility: PostVisibility;
  title: string;
  body: string | null;
  steps: GuideStep[];
  tags: FeedTag[];
  like_count: number;
  comment_count: number;
  bookmark_count: number;
  view_count: number;
  try_count: number;
  is_verified: boolean;
  removed_at: string | null;
  removed_reason: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
  images?: PostImage[];
  /** Populated client-side for the signed-in viewer only; absent for guest reads. */
  viewer_liked?: boolean;
  viewer_bookmarked?: boolean;
  viewer_not_helpful?: boolean;
  viewer_tried?: boolean;
  top_comment?: Comment | null;
}

export type FeedPostType = 'all' | PostType;
export type FeedSort = 'for_you' | 'newest' | 'most_liked';
/** No 'admin' option here on purpose — admin status is never exposed to the
 * client (admin_roles has no client SELECT grant at all), so it can't be
 * filtered on. */
export type FeedPostedBy = 'all' | 'student' | 'team' | 'company' | 'university';

export interface FeedFiltersState {
  search: string;
  postType: FeedPostType;
  tags: FeedTag[];
  postedBy: FeedPostedBy;
  sort: FeedSort;
  savedOnly: boolean;
}

export const DEFAULT_FEED_FILTERS: FeedFiltersState = {
  search: '',
  postType: 'all',
  tags: [],
  postedBy: 'all',
  sort: 'for_you',
  savedOnly: false,
};

export interface ModerationQueueItem {
  id: string;
  title: string;
  author_id: string;
  author_name: string;
  report_count: number;
  not_helpful_count: number;
  is_verified: boolean;
  removed_at: string | null;
  removed_reason: string | null;
  created_at: string;
}
