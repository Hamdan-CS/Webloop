/* Companies grid — the card list below the 3D city scene in the
 * prototype's #companies section (ported from its `coGrid`/`pcCard`-style
 * markup). All 6 demonstration companies, real illustrated logos.
 * Demonstration data only — see src/data/homeDemo.ts. */
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { COMPANIES, personOf, companyProjectCount } from '@/data/homeDemo';
import { logoArt } from '@/data/homeArt';
import { IllustratedAvatar } from '../shared/IllustratedAvatar';
import { Reveal } from '@/components/ui/Reveal';

export function CompaniesGrid({ hoveredId, onHover }: { hoveredId?: string | null; onHover?: (id: string | null) => void } = {}) {
  return (
    <>
      <div className="result-line" style={{ marginTop: -6 }}>
        <span>{COMPANIES.length} companies</span>
        <span className="demo-note">Fictional companies &middot; verification badges are demo UI</span>
      </div>
      <div className="grid3">
        {COMPANIES.map((c, i) => {
          const projectCount = companyProjectCount(c.id);
          const shown = c.people.slice(0, 3).map((k) => personOf(k));
          return (
            <Reveal key={c.id} delay={i * 0.06}>
              <article
                className={`cc${hoveredId === c.id ? ' glow' : ''}`}
                tabIndex={0}
                onPointerEnter={() => onHover?.(c.id)}
                onPointerLeave={() => onHover?.(null)}
                onFocus={() => onHover?.(c.id)}
                onBlur={() => onHover?.(null)}
              >
                <div className="banner" style={{ background: `linear-gradient(135deg, hsl(${c.hue} 70% 38%), hsl(${c.hue + 40} 70% 52%))` }}>
                  {c.tag && <span className="ft">{c.tag}</span>}
                </div>
                <div className="main">
                  <div className="hd">
                    <div className="logo-sq"><img src={logoArt(c.logo)} alt={c.name} width={40} height={40} /></div>
                    <div className="nm">
                      <h3>{c.name}<CheckCircle2 size={16} className="vf" /></h3>
                    </div>
                  </div>
                  <div className="meta">
                    <span className="ref-tag">Company</span>
                    <span className="ref-tag">{c.location}</span>
                    <span className="ref-tag">{c.size}</span>
                  </div>
                  <p className="line-clamp-2">{c.desc}</p>
                  <span className="url">{c.url}</span>
                  <div className="foot">
                    <span className="ref-avs">
                      {shown.map((p) => <IllustratedAvatar key={p.key} personKey={p.key} name={p.name} female={p.female} size={28} />)}
                      {c.more > 0 && <span>+{c.more}</span>}
                    </span>
                    <small>{projectCount} published project{projectCount === 1 ? '' : 's'}</small>
                    <button type="button" className="go" aria-label={`Open ${c.name}`}>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}

export default CompaniesGrid;
