import { useMemo, useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '@/design-system/animations/gsap.config';
import { useScrollScene } from '@/design-system/motion/useScrollScene';
import { VerifyRow } from '@/components/shared/ui/VerifyRow';
import { AvatarStack } from '@/components/shared/ui/AvatarStack';
import { seeded, level } from './homeContent';

/**
 * 6 · "There's more" bento: GitHub-style contribution graph (hover counts),
 * collaboration, Baselayer verification rows and a self-updating portfolio,
 * each a tiny live UI on a pastel Genie tile. Tiles rise in as they enter.
 */
export function FeatureCards() {
  const ref = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cells = useMemo(() => { const r = seeded(5); return Array.from({ length: 210 }, (_, i) => level(r, (Math.floor(i / 7) / 30) * 0.45)); }, []);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  useScrollScene(ref, (mm) => {
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      ScrollTrigger.batch(gsap.utils.toArray<HTMLElement>('.gh-reveal'), {
        start: 'top 88%',
        onEnter: (els) => gsap.fromTo(els, { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 1, ease: 'expo.out', overwrite: true }),
      });
      gsap.set('.gh-ghgrid i', { scale: 0, opacity: 0 });
      ScrollTrigger.create({
        trigger: gridRef.current, start: 'top 85%', once: true,
        onEnter: () => gsap.to('.gh-ghgrid i', { scale: 1, opacity: 1, stagger: { each: 0.003, from: 'start' }, duration: 0.35, ease: 'back.out(2)' }),
      });
    });
  });

  const onOver = (e: React.PointerEvent) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('i[data-i]');
    if (!c) return;
    const i = Number(c.dataset.i);
    const v = cells[i];
    setTip({ text: `${v ? v * 3 + 1 : 'No'} verified contributions · week ${Math.floor(i / 7) + 1}`, x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop });
  };

  return (
    <section ref={ref} className="gh-more" id="projects" aria-labelledby="gh-more-h">
      <div className="gh-wrap">
        <div className="gh-sechd">
          <span className="gh-mono">There's more</span>
          <h2 id="gh-more-h" className="gh-display" style={{ marginTop: 14 }}>Everything to take a brief all the way to <span className="acc">proof.</span></h2>
        </div>
        <div className="gh-bento">
          <div className="gh-tile t-blue gh-reveal">
            <h3>Contributions you can actually see</h3>
            <p>A contribution graph for real teamwork: commits, designs and reviews, each one verified.</p>
            <div className="gh-card">
              <div className="gh-gh-top"><b>Maya Patel</b><span>412 verified · last 30 weeks</span></div>
              <div ref={gridRef} className="gh-ghgrid" onPointerOver={onOver} onPointerLeave={() => setTip(null)} role="img" aria-label="Contribution graph, 30 weeks">
                {cells.map((v, i) => <i key={i} className={`l${v}`} data-i={i} />)}
                <span className="gh-tip" style={{ left: tip?.x, top: tip?.y, opacity: tip ? 1 : 0 }}>{tip?.text}</span>
              </div>
              <div className="gh-ghleg">
                <span>Learn how we count</span>
                <span>Less <i style={{ background: '#ebf0f6' }} /><i style={{ background: '#bcd8ff' }} /><i style={{ background: '#7cb5ff' }} /><i style={{ background: '#3d8ef5' }} /><i style={{ background: '#0060cc' }} /> More</span>
              </div>
            </div>
            <div className="gh-repo"><span>Carbon Ledger · 128</span><span>Studyflow · 96</span><span>CityMind · 74</span><span>Pixel Realm · 114</span></div>
          </div>

          <div className="gh-tile t-lav gh-reveal">
            <h3>Collaborate with your team</h3>
            <p>Invite by skill, leave feedback in context.</p>
            <div className="gh-card">
              <div className="gh-collab-top">
                <AvatarStack people={[{ name: 'Alex Chen' }, { name: 'Maya Patel' }, { name: 'Daniel Kim' }]} />
                <span className="gh-chip" style={{ background: '#f1e6ff', color: '#6d4cc2' }}>+4 invited</span>
                <span className="gh-share">Share</span>
              </div>
              <div className="gh-cmt"><span className="g-av" style={{ background: '#ffd1b8' }}>SA</span><p>Moved the export to a worker, it's 3× faster now. Mind reviewing?</p></div>
            </div>
          </div>

          <div className="gh-tile t-mint gh-reveal">
            <h3>Verified by whoever posted the brief</h3>
            <p>No self-reported skills. Every line has a source.</p>
            <div className="gh-card gh-verify">
              <VerifyRow status="verified" label="Commit linked" source="a91f3c2" time="2 min" />
              <VerifyRow status="verified" label="Reviewed by GreenLeaf Studios" time="1 h" />
              <VerifyRow status="pending" label="Mentor sign-off" />
            </div>
          </div>

          <div className="gh-tile t-solar gh-reveal">
            <h3>A portfolio that updates itself</h3>
            <div className="gh-card gh-pfc">
              <span className="g-av" style={{ background: '#cce7ff' }}>MP</span>
              <div><b>Maya Patel</b><small>Backend · 4 projects</small></div>
              <div className="pc">96%<small>verified</small></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
