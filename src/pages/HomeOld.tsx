import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Users,
  Building2,
  GraduationCap,
  ShieldCheck,
  Trophy,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ParticleStage } from '@/components/home/ParticleStage';
import { Reveal } from '@/components/ui/Reveal';
import { fetchFeaturedProjects, fetchPortfolioGallery } from '@/lib/api';
import type { Project, PortfolioItem } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/components/auth/AuthContext';
import { getDashboardPath } from '@/lib/roles';

export function HomePage() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetchFeaturedProjects(6), fetchPortfolioGallery(4)])
      .then(([p, pf]) => {
        if (!active) return;
        setProjects(p);
        setPortfolio(pf);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="home-page">
      <ParticleStage />

      {/* Hero */}
      <section id="heroSec" className="relative overflow-hidden lg:min-h-[calc(100dvh-4rem)] lg:flex lg:items-center">
        <div id="anchorHero" className="hidden lg:block absolute right-[2%] top-[6%] bottom-[16%] w-[46%]" />
        <div className="container-page relative pt-20 pb-16 sm:pt-28 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl lg:max-w-2xl"
          >
            <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.05]">
              Build real projects.
              <br />
              <span className="text-accent-500">Prove your skills.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-200 leading-relaxed">
              A platform where computer science students ship real software, find teammates, build
              verified portfolios, and get discovered by startups hiring from actual contributions —
              not just resumes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/explore">
                <Button className="text-base px-5 py-3">
                  Explore Projects <ArrowRight size={16} />
                </Button>
              </Link>
              {user && profile ? (
                <Link to={getDashboardPath(profile.creator_type)}>
                  <Button variant="secondary" className="text-base px-5 py-3">
                    <Sparkles size={16} /> Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/join">
                    <Button variant="secondary" className="text-base px-5 py-3">
                      <Sparkles size={16} /> Join as a Student
                    </Button>
                  </Link>
                  <Link to="/join" className="link-accent text-sm ml-1">
                    Join as a Company →
                  </Link>
                </>
              )}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={15} className="text-signal-green" /> Verified contributions
              </span>
              <span className="inline-flex items-center gap-2">
                <Users size={15} className="text-accent-300" /> Real team workflows
              </span>
              <span className="inline-flex items-center gap-2">
                <Trophy size={15} className="text-signal-amber" /> Portfolio that proves skills
              </span>
            </div>
          </motion.div>
          <div id="anchorHeroMobile" className="lg:hidden mt-6 h-[360px]" />
        </div>
      </section>

      {/* Featured projects */}
      <section className="container-page py-14" id="featured">
        <SectionHeader
          title="Live projects you can join right now"
          subtitle="Student ideas, company opportunities, and university capstones — all recruiting contributors."
          actionTo="/explore"
          actionLabel="Browse all projects"
        />
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[16/10] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.08}>
                <ProjectCard project={p} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* How contributions become career evidence */}
      <section className="container-page py-14" id="whySec">
        <Reveal>
        <div className="surface-raised overflow-hidden">
          <div className="grid lg:grid-cols-[1.2fr_1fr]">
            <div className="p-8 sm:p-12">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Contributions become career evidence.
              </h2>
              <p className="mt-4 text-slate-200 leading-relaxed">
                Every task you complete is reviewed by a project owner and recorded as a verified
                contribution. Companies hire from demonstrated work, not self-reported skills.
              </p>
              <ol className="mt-8 space-y-4 list-decimal list-outside pl-5 marker:font-semibold marker:text-accent-400">
                <StepRow
                  title="Ship real work"
                  desc="Join projects, get assigned tasks with acceptance criteria, and submit evidence."
                />
                <StepRow
                  title="Get reviewed"
                  desc="Project owners review your submissions and record verified contributions."
                />
                <StepRow
                  title="Get discovered"
                  desc="Companies find you through your verified contribution history and portfolio."
                />
              </ol>
            </div>
            <div id="anchorCV" className="relative min-h-[420px] lg:min-h-[520px]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 bg-ink-900/60 p-6 sm:p-8">
            <ContributionCard title="Implemented spaced-repetition scheduler" project="Studyflow" status="Accepted" tech={['React', 'TypeScript']} rating={5} />
            <ContributionCard title="Designed emissions data model" project="Carbon Ledger" status="Accepted" tech={['PostgreSQL', 'TypeScript']} rating={5} />
            <ContributionCard title="Authored Node scaffolding template" project="Northstack CLI" status="Accepted" tech={['Node.js', 'CLI']} rating={4} />
          </div>
        </div>
        </Reveal>
      </section>

      {/* The loop */}
      <section className="container-page py-14" id="loop">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <Reveal>
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-white">
              Students build. Companies hire. Universities teach.
            </h2>
            <p className="mt-4 text-slate-200 leading-relaxed max-w-xl">
              Everyone on WebLoop moves the same loop forward: students ship work, companies and universities
              review it, and every review feeds back into someone&apos;s career.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Badge tone="accent"><Users size={13} /> Students</Badge>
              <Badge><Building2 size={13} /> Companies</Badge>
              <Badge tone="violet"><GraduationCap size={13} /> Universities</Badge>
            </div>
          </Reveal>
          <div id="anchorLoop" className="h-[340px] sm:h-[440px]" />
        </div>
      </section>

      {/* Finale — the WebL∞p reveal. Sits right after the loop so the particle shape
          morphs straight from the ring into the wordmark, with room to hold centred. */}
      <section id="finaleSec" className="relative">
        <div id="anchorLogo" className="h-[58vh] sm:h-[68vh] max-h-[620px] w-full" />
      </section>

      {/* How it works — Students and Companies */}
      <section className="container-page py-14">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white max-w-xl">
          Two sides, one proof of work.
        </h2>
        <div className="mt-8 grid lg:grid-cols-2 gap-x-10 gap-y-10">
          <Reveal><HowItWorksCard
            title="Build a portfolio that proves what you can do"
            steps={[
              'Create a profile with your skills, interests, and goals.',
              'Discover projects matching your stack, or publish your own idea.',
              'Apply to join, contribute to tasks, and submit work for review.',
              'Collect verified contributions and get approached by companies.',
            ]}
            ctaTo="/join"
            ctaLabel="Join as a Student"
          /></Reveal>
          <Reveal delay={0.1}><HowItWorksCard
            title="Recruit contributors from real, demonstrated work"
            steps={[
              'Create a company profile and publish a scoped project.',
              'Review applications, compare portfolios, and shortlist candidates.',
              'Assign tasks, review submissions, and verify contributions.',
              'Hire from contributors with proven context, not cold resumes.',
            ]}
            ctaTo="/join"
            ctaLabel="Join as a Company"
          /></Reveal>
        </div>
      </section>

      {/* Student work gallery preview */}
      <section className="container-page py-14">
        <SectionHeader
          title="What students are shipping"
          subtitle="Public portfolio pieces from student builders."
          actionTo="/gallery"
          actionLabel="Explore the gallery"
        />
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/3] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {portfolio.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.07}>
              <Link
                to={`/creators/${item.profile?.handle}`}
                className="group surface overflow-hidden hover:border-accent-400/30 transition-colors"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-ink-800">
                  {item.cover_image_url && (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
                  <span className="absolute left-2.5 top-2.5">
                    <Badge tone="violet">{item.category}</Badge>
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="font-display text-sm font-semibold text-white line-clamp-1">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                  {item.profile && (
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <Avatar src={item.profile.avatar_url} name={item.profile.display_name} size="sm" />
                      <span className="text-[11px] text-slate-400 truncate">{item.profile.display_name}</span>
                    </div>
                  )}
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* University partnerships */}
      <section className="container-page py-14">
        <Reveal>
        <div className="surface p-8 sm:p-12">
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 items-center">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Connect coursework with real projects.
              </h2>
              <p className="mt-4 text-slate-200 leading-relaxed max-w-xl">
                Universities can run capstone programs, form student teams, mentor projects, and track
                participation. Students gain real experience; faculty get visibility into outcomes.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Badge tone="accent"><GraduationCap size={13} /> Capstone programs</Badge>
                <Badge><Users size={13} /> Team formation</Badge>
                <Badge><Trophy size={13} /> Completion records</Badge>
              </div>
            </div>
            <div className="rounded-xl bg-ink-900/70 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal-violet/15 text-signal-violet">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <p className="font-semibold text-white">Riverford University</p>
                  <p className="text-xs text-slate-400">Capstone 2026 · Campus Navigation</p>
                </div>
              </div>
              <Link to="/projects/riverford-capstone-nav" className="mt-4 btn-secondary w-full text-xs">
                View capstone project <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
        </Reveal>
      </section>

      {/* Trust & safety */}
      <section className="container-page py-14">
        <Reveal className="max-w-xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Built so the record stays honest.
          </h2>
        </Reveal>
        <div className="mt-9 grid gap-8 sm:grid-cols-3">
          <TrustItem
            title="Verified contributions only"
            desc="Reviews require verified project participation. Self-reported skills are clearly labeled."
          />
          <TrustItem
            title="Fair, transparent reputation"
            desc="Review counts always show next to ratings. New members aren't penalized for starting out."
          />
          <TrustItem
            title="Responsible opportunities"
            desc="Paid, unpaid educational, and open-source work is clearly classified — no disguised labor."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-page py-14">
        <Reveal>
        <div className="relative overflow-hidden rounded-xl bg-ink-900/70 p-8 sm:p-16 text-center">
          <div className="relative">
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-white">
              Stop polishing your resume.
              <br />
              Start shipping proof.
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-slate-200">
              Join WebLoop, find a project that excites you, and build a portfolio backed by verified
              contributions.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/join">
                <Button className="text-base px-6 py-3">
                  <Sparkles size={16} /> Join the Platform
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="secondary" className="text-base px-6 py-3">
                  Browse Projects <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        </Reveal>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  actionTo,
  actionLabel,
}: {
  title: string;
  subtitle?: string;
  actionTo: string;
  actionLabel: string;
}) {
  return (
    <Reveal className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">{title}</h2>
        {subtitle && <p className="mt-2 text-slate-300 max-w-xl">{subtitle}</p>}
      </div>
      <Link to={actionTo} className="link-accent text-sm whitespace-nowrap">
        {actionLabel} →
      </Link>
    </Reveal>
  );
}

function StepRow({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="pl-1">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-sm text-slate-300">{desc}</p>
    </li>
  );
}

function ContributionCard({
  title,
  project,
  status,
  tech,
  rating,
}: {
  title: string;
  project: string;
  status: string;
  tech: string[];
  rating: number;
}) {
  return (
    <div className="rounded-xl bg-ink-900/90 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-white">{title}</p>
        <Badge tone="green">{status}</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-400">{project}</p>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {tech.map((t) => (
            <span key={t} className="chip text-[10px] px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={11}
              className={i < rating ? 'fill-signal-amber text-signal-amber' : 'text-white/15'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HowItWorksCard({
  title,
  steps,
  ctaTo,
  ctaLabel,
}: {
  title: string;
  steps: string[];
  ctaTo: string;
  ctaLabel: string;
}) {
  return (
    <div className="surface-raised p-8">
      <h3 className="font-display text-xl sm:text-2xl font-bold text-white">{title}</h3>
      <ol className="mt-5 space-y-3 list-decimal list-outside pl-5 marker:font-semibold marker:text-accent-400">
        {steps.map((s, i) => (
          <li key={i} className="pl-1 text-[15px] text-slate-200 leading-relaxed">{s}</li>
        ))}
      </ol>
      <Link to={ctaTo} className="mt-6 block">
        <Button variant="secondary" className="w-full">{ctaLabel} <ArrowRight size={15} /></Button>
      </Link>
    </div>
  );
}

function TrustItem({ title, desc }: { title: string; desc: string }) {
  return (
    <Reveal>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-[15px] text-slate-200 leading-relaxed">{desc}</p>
    </Reveal>
  );
}
