import { supabase } from '@/lib/supabase';

const BUCKET = 'profile-media';

export class UploadError extends Error {}

function extFor(file: File): string {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Uploads an avatar or banner image to the user's own folder in the
 * `profile-media` bucket and returns its public URL. Storage RLS only
 * allows writes under `profile-media/{auth.uid()}/...`.
 */
export async function uploadProfileImage(
  userId: string,
  kind: 'avatar' | 'banner',
  file: File,
): Promise<string> {
  const path = `${userId}/${kind}.${extFor(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw new UploadError(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Bust any CDN/browser cache for this fixed path so a re-upload shows immediately.
  return `${data.publicUrl}?v=${Date.now()}`;
}
