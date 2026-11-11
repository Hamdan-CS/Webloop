/** Fixed tag taxonomy — must match the CHECK constraints in the feed migration
 * (posts.tags, user_interests.tag). Keep these two lists in sync by hand. */
export const FEED_TAGS = [
  'Claude',
  'AI tools',
  'React',
  'Supabase',
  'Design',
  'Python',
  'Hackathons',
  'Careers',
] as const;

export type FeedTag = (typeof FEED_TAGS)[number];

export const MAX_POST_TAGS = 3;
export const MIN_POST_TAGS = 1;
export const MIN_ONBOARDING_INTERESTS = 3;
export const MAX_POST_IMAGES = 8;
export const MIN_GUIDE_STEPS = 2;

/** Fixed height of the guide player / picture carousel box, in px — the whole
 * point is that this never changes across steps/images so swipe/keyboard nav
 * and surrounding card layout never jump. */
export const MEDIA_BOX_HEIGHT = 420;

export const SWIPE_THRESHOLD_PX = 50;
export const DOUBLE_TAP_WINDOW_MS = 320;

export const LAST_FEED_VISIT_KEY = 'wl_feed_last_visit';
