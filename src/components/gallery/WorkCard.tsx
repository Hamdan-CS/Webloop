import { useTilt } from '@/hooks/useTilt';
import { ArrowUpRight } from 'lucide-react';
import type { PortfolioItem } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { MiniHeat } from './MiniHeat';
import { hashS } from '@/utils/heat';
import { categoryColors, categoryColorDefault } from '@/design-system/tokens/colors';

export const catColor = (c: string | null | undefined) => categoryColors[c ?? ''] ?? categoryColorDefault;

interface Props {
  item: PortfolioItem;
  onOpen: (item: PortfolioItem) => void;
  onOpenStudent: (profileId: string) => void;
}

export function WorkCard({ item, onOpen, onOpenStudent }: Props) {
  const { ref, onPointerMove, onPointerLeave } = useTilt<HTMLElement>(4);
  const p = item.profile;
  const tech = item.tech ?? [];

  return (
    <article
      ref={ref}
      className="gc gal-card"
      tabIndex={0}
      role="button"
      aria-label={`Open ${item.title}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item);
        }
      }}
    >
      <div className="thumb">
        {item.cover_image_url && <img src={item.cover_image_url} alt="" loading="lazy" width={600} height={400} />}
        {item.is_verified && <span className="vbadge">&#10003; Verified contribution</span>}
        {item.category && (
          <span className="cat" style={{ background: `${catColor(item.category)}cc` }}>
            {item.category}
          </span>
        )}
      </div>
      <div className="gloss" />
      <div className="body">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        {tech.length > 0 && (
          <div className="ref-tags">
            {tech.slice(0, 3).map((t) => (
              <span key={t} className="ref-tag">{t}</span>
            ))}
          </div>
        )}
        {p && (
          <div className="stu">
            <div
              className="who"
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onOpenStudent(p.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  onOpenStudent(p.id);
                }
              }}
            >
              <Avatar src={p.avatar_url} name={p.display_name} className="!h-[38px] !w-[38px]" />
              <div>
                <b>
                  {p.display_name} <ArrowUpRight size={12} style={{ display: 'inline', verticalAlign: '-1px' }} />
                </b>
                <small>{item.role ?? p.headline}</small>
              </div>
            </div>
            <MiniHeat seed={hashS(item.id) % 1000} intensity={item.activity ?? 0.5} />
          </div>
        )}
      </div>
    </article>
  );
}
