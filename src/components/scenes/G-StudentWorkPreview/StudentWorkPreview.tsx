/* Section 5 — Student Work preview. The 3 most active demo portfolio
 * pieces (matches the prototype's default "most active" sort), each with
 * a "Verified contribution" tag, plus one link to the real Student Work
 * (gallery) page. Demonstration data only — see src/data/homeDemo.ts. */
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { WORKS, personOf } from '@/data/homeDemo';
import { art } from '@/data/homeArt';
import { IllustratedAvatar } from '../shared/IllustratedAvatar';
import { Reveal } from '@/components/ui/Reveal';

const FEATURED = [...WORKS].sort((a, b) => b.activity - a.activity).slice(0, 3);

export function StudentWorkPreview() {
  return (
    <section id="gallery" className="ws-scene home-sec" aria-labelledby="h-gal">
      <div className="wrap">
        <Reveal>
          <div className="sec-hd">
            <span className="eyebrow-link"><span className="dot" />Student work gallery</span>
            <h2 id="h-gal" className="hr-h2">Student work <span className="hl">gallery</span></h2>
            <p className="hr-lead" style={{ maxWidth: '62ch', marginTop: 14 }}>
              Every task you finish is reviewed by a project owner and becomes verified career evidence.
              Companies hire from demonstrated work, not self-reported skills.
            </p>
            <Link to="/gallery" className="hr-btn" style={{ marginTop: 18 }}>
              View all student work <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>

        <div className="grid3" style={{ marginTop: 28 }}>
          {FEATURED.map((w, i) => {
            const author = personOf(w.by);
            return (
              <Reveal key={w.id} delay={i * 0.08}>
                <article className="gc">
                  <div className="thumb">
                    <img src={art(...w.art)} alt="" loading="lazy" width={600} height={400} />
                    <span className="vbadge">&#10003; Verified contribution</span>
                    <span className="cat">{w.category}</span>
                  </div>
                  <div className="body">
                    <h3>{w.title}</h3>
                    <p>{w.desc}</p>
                    <div className="ref-tags">
                      {w.tech.slice(0, 3).map((t) => <span key={t} className="ref-tag">{t}</span>)}
                    </div>
                    <div className="stu">
                      <div className="who">
                        <IllustratedAvatar personKey={author.key} name={author.name} female={author.female} size={38} />
                        <div><b>{author.name}</b><small>{author.role}</small></div>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default StudentWorkPreview;
