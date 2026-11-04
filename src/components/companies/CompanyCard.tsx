import { ArrowRight, CheckCircle2, Globe } from 'lucide-react';
import type { Profile } from '@/types';
import type { CompanyProjectSummary } from '@/services/api';
import { Avatar } from '@/components/shared/ui/Avatar';
import { badgeAccentColors } from '@/design-system/tokens/colors';

interface Props {
  company: Profile;
  summary?: CompanyProjectSummary;
  glow: boolean;
  onHover: (id: string | null) => void;
  onOpen: (handle: string) => void;
}

const badgeBg = (b: string) => (b === 'Hiring' ? badgeAccentColors.hiring : b === 'New' ? badgeAccentColors.new : undefined);

export function CompanyCard({ company: c, summary, glow, onHover, onOpen }: Props) {
  const hue = c.accent_hue ?? 200;
  const people = summary?.people ?? [];
  const shown = people.slice(0, 3);
  const more = Math.max(0, people.length - shown.length);
  const count = summary?.count ?? 0;
  const where = c.is_remote ? `Remote${c.location?.includes('/') ? ' / ' + c.location.split('/')[1].trim() : ''}` : c.location;

  return (
    <article
      className={`cc${glow ? ' glow' : ''}`}
      tabIndex={0}
      role="link"
      aria-label={`${c.display_name} profile`}
      onPointerEnter={() => onHover(c.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(c.id)}
      onBlur={() => onHover(null)}
      onClick={() => onOpen(c.handle)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(c.handle); }}
      style={{ cursor: 'pointer' }}
    >
      <div
        className="banner"
        style={c.banner_url ? { backgroundImage: `url(${c.banner_url})` } : { background: `linear-gradient(135deg, hsl(${hue} 70% 38%), hsl(${hue + 40} 70% 52%))` }}
      >
        {c.badge && <span className="ft" style={{ background: badgeBg(c.badge) }}>{c.badge}</span>}
      </div>
      <div className="main">
        <div className="hd">
          <div className="logo-sq">
            {c.avatar_url ? <img src={c.avatar_url} alt={c.display_name} width={40} height={40} /> : <Avatar src={null} name={c.display_name} size="lg" />}
          </div>
          <div className="nm">
            <h3>{c.display_name}{c.verified && <CheckCircle2 size={16} className="vf" />}</h3>
          </div>
        </div>
        <div className="meta">
          <span className="ref-tag">Company</span>
          {where && <span className="ref-tag">{where}</span>}
          {c.company_size && <span className="ref-tag">{c.company_size}</span>}
        </div>
        {c.bio && <p className="line-clamp-2">{c.bio}</p>}
        {c.website_url && <span className="url"><Globe size={14} /> {c.website_url.replace(/^https?:\/\//, '')}</span>}
        <div className="foot">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {shown.length > 0 && (
              <span className="ref-avs">
                {shown.map((p) => <img key={p.id} src={p.avatar_url ?? ''} alt={p.display_name} />)}
                {more > 0 && <span style={{ display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600 }}>+{more}</span>}
              </span>
            )}
            <small>{count} published project{count === 1 ? '' : 's'}</small>
          </div>
          <span className="go" aria-hidden="true"><ArrowRight size={16} /></span>
        </div>
      </div>
    </article>
  );
}
