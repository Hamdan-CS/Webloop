import { useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getPostImageUrl } from '../services/feedApi';
import { DOUBLE_TAP_WINDOW_MS, MEDIA_BOX_HEIGHT } from '../constants';
import type { PostImage } from '../types';

interface PictureCarouselProps {
  images: PostImage[];
  liked: boolean;
  onDoubleTapLike: () => void;
}

export function PictureCarousel({ images, liked, onDoubleTapLike }: PictureCarouselProps) {
  const [active, setActive] = useState(0);
  const [bursts, setBursts] = useState<number[]>([]);
  const lastTap = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function onPointerUp() {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_WINDOW_MS) {
      if (!liked) onDoubleTapLike();
      const id = now;
      setBursts((b) => [...b, id]);
      setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 850);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  if (images.length === 0) return null;

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-xl bg-ink-900"
        style={{ height: MEDIA_BOX_HEIGHT }}
        onPointerUp={onPointerUp}
      >
        <div ref={trackRef} onScroll={onScroll} className="feed-track h-full w-full">
          {images.map((img) => (
            <img key={img.id} src={getPostImageUrl(img.path)} alt={img.caption ?? ''} className="h-full w-full object-cover" />
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={cn('feed-dot', i === active && 'on')} />
            ))}
          </div>
        )}
        {bursts.map((id) => (
          <Heart
            key={id}
            size={90}
            className="feed-burst pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-lg"
          />
        ))}
      </div>
      {images[active]?.caption && <p className="mt-2 text-sm text-slate-400">{images[active].caption}</p>}
    </div>
  );
}
