/* Section 6 — Explore Projects preview. The fan visual (SkillSync, Pixel
 * Realm, StudyFlow — matches the prototype's fixed `feat` picks) + the top
 * 3 remaining projects by stars, plus one link to the real Explore page.
 * Demonstration data only — see src/data/homeDemo.ts. */
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Star, Users } from 'lucide-react';
import { PROJECTS, BY_ID, projectOwnerName, projectOwnerRole, personOf, STATUS_LABEL, COMPANIES, type DemoProject } from '@/data/homeDemo';
import { art, logoArt } from '@/data/homeArt';
import { IllustratedAvatar } from '../shared/IllustratedAvatar';
import { Reveal } from '@/components/ui/Reveal';

const FAN = [BY_ID.skillsync, BY_ID.pixel, BY_ID.studyflow];
const FAN_IDS = new Set(FAN.map((p) => p.id));
const GRID = PROJECTS.filter((p) => !FAN_IDS.has(p.id)).sort((a, b) => b.stars - a.stars).slice(0, 3);
const STATUS_BADGE_CLASS: Record<string, string> = { rec: 'rb-rec', prog: 'rb-prog', done: 'rb-done' };

function OwnerAvatar({ p, size }: { p: DemoProject; size: number }) {
  if (p.type === 'student') {
    const owner = personOf(p.owner);
    return <IllustratedAvatar personKey={owner.key} name={owner.name} female={owner.female} size={size} />;
  }
  const company = p.co ? COMPANIES.find((c) => c.id === p.co) : undefined;
  if (company) return <img src={logoArt(company.logo)} alt={company.name} width={size} height={size} style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover' }} />;
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }}>
      {projectOwnerName(p)[0]}
    </span>
  );
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 3) + '…' : s; }

export function ExplorePreview() {
  const navigate = useNavigate();
  const openProject = (id: string) => navigate(`/projects/demo-${id}`);

  return (
    <section id="explore-preview" className="ws-scene home-sec" aria-labelledby="h-ex">
      <div className="wrap">
        <div className="ex-hero">
          <Reveal>
            <div className="sec-hd">
              <h2 id="h-ex" className="hr-h2">Discover real projects built by <span className="hl">students, companies</span> and <span className="hl">universities.</span></h2>
              <p className="hr-lead" style={{ marginTop: 14 }}>Student ideas, company opportunities, and university programmes, all open to browse and join.</p>
              <Link to="/explore" className="hr-btn" style={{ marginTop: 18 }}>
                Explore all projects <ArrowRight size={15} />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="fan">
              <div className="fp f0" aria-hidden="true" style={{ backgroundImage: `url("${art(...FAN[0].art)}")` }} />
              <div
                className="fp f1"
                style={{ backgroundImage: `url("${art(...FAN[1].art)}")`, cursor: 'pointer' }}
                role="link"
                tabIndex={0}
                aria-label={`Open ${FAN[1].name} project details`}
                onClick={() => openProject(FAN[1].id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(FAN[1].id); } }}
              >
                <div className="corner">
                  <span className={`ref-badge ${STATUS_BADGE_CLASS[FAN[1].status]}`}>{STATUS_LABEL[FAN[1].status]}</span>
                  <span className="ref-badge" style={{ background: 'rgba(10,20,40,.6)', color: '#fff' }}>{projectOwnerRole(FAN[1])} project</span>
                </div>
                <div className="ov-txt"><h3>{FAN[1].name}</h3><p>{FAN[1].tagline}</p></div>
              </div>
              <div className="fp f2" aria-hidden="true" style={{ backgroundImage: `url("${art(...FAN[2].art)}")` }} />
            </div>
          </Reveal>
        </div>

        <div className="result-line"><span className="demo-note">Demonstration data</span></div>

        <div className="grid3">
          {GRID.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <article
                className="pc"
                role="link"
                tabIndex={0}
                aria-label={`Open ${p.name} project details`}
                style={{ cursor: 'pointer' }}
                onClick={() => openProject(p.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(p.id); } }}
              >
                <div className="thumb">
                  <span className="art" style={{ backgroundImage: `url("${art(...p.art)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="corner">
                    <div>
                      <span className={`ref-badge ${STATUS_BADGE_CLASS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                      {p.beginner && <span className="ref-badge" style={{ background: 'var(--chip)', color: 'var(--text-2)' }}>Beginner-friendly</span>}
                    </div>
                    <span className="ref-badge" style={{ background: 'rgba(10,20,40,.62)', color: '#fff' }}>{projectOwnerRole(p)} project</span>
                  </div>
                </div>
                <div className="body">
                  <h3>{p.name}</h3>
                  <p>{truncate(p.desc, 96)}</p>
                  <div className="ref-tags">
                    {p.tech.slice(0, 3).map((t) => <span key={t} className="ref-tag">{t}</span>)}
                  </div>
                  <div className="meta">
                    <div className="who">
                      <OwnerAvatar p={p} size={34} />
                      <div><b style={{ fontSize: 13.5 }}>{projectOwnerName(p)}</b><small>{projectOwnerRole(p)}</small></div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Users size={14} />{p.team.length}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Star size={14} style={{ color: '#f5b301' }} fill="#f5b301" /><b style={{ color: 'var(--text)' }}>{p.stars}</b></span>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ExplorePreview;
