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
  Code2,
  Trophy,
  Zap,
  GitPullRequest,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { HeroScene } from '@/components/home/HeroScene';
import { fetchFeaturedProjects, fetchPortfolioGallery } from '@/lib/api';
import type { Project, PortfolioItem } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';

export function HomePage() {
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
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <HeroScene />
        </div>
        <div className="container-page relative pt-20 pb-24 sm:pt-28 sm:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="label-overline">Student Project Collaboration & Talent Marketplace</span>
            <h1 className="mt-4 font-display text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.05]">
              Build real projects.
              <br />
              <span className="bg-gradient-to-r from-accent-300 via-accent-400 to-signal-violet bg-clip-text text-transparent">
                Find your team. Prove your skills.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300 leading-relaxed">
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
              <Link to="/join">
                <Button variant="secondary" className="text-base px-5 py-3">
                  <Sparkles size={16} /> Join as a Student
                </Button>
              </Link>
              <Link to="/join" className="link-accent text-sm ml-1">
                Join as a Company →
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400">
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
        </div>
      </section>

      {/* Featured projects */}
      <section className="container-page py-14">
        <SectionHeader
          overline="Featured"
          title="Live projects you can join right now"
          subtitle="Student ideas, company opportunities, and university capstones — all recruiting contributors."
          actionTo="/explore"
          actionLabel="Browse all projects"
        />
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[16/10] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* How contributions become career evidence */}
      <section className="container-page py-14">
        <div className="surface-raised overflow-hidden">
          <div className="grid lg:grid-cols-[1.2fr_1fr]">
            <div className="p-8 sm:p-12">
              <span className="label-overline">Why WebLoop</span>
              <h2 className="mt-3 font-display text-3xl font-bold text-white">
                Contributions become career evidence.
              </h2>
              <p className="mt-4 text-slate-300 leading-relaxed">
                Every task you complete is reviewed by a project owner and recorded as a verified
                contribution. Companies hire from demonstrated work, not self-reported skills.
              </p>
              <div className="mt-8 space-y-4">
                <StepRow
                  icon={<Code2 size={18} />}
                  title="Ship real work"
                  desc="Join projects, get assigned tasks with acceptance criteria, and submit evidence."
                />
                <StepRow
                  icon={<GitPullRequest size={18} />}
                  title="Get reviewed"
                  desc="Project owners review your submissions and record verified contributions."
                />
                <StepRow
                  icon={<Trophy size={18} />}
                  title="Get discovered"
                  desc="Companies find you through your verified contribution history and portfolio."
                />
              </div>
            </div>
            <div className="relative border-t border-white/5 lg:border-l lg:border-t-0 bg-ink-850/40 p-8 sm:p-12 flex flex-col justify-center gap-3">
              <ContributionCard
                title="Implemented spaced-repetition scheduler"
                project="Studyflow"
                status="Accepted"
                tech={['React', 'TypeScript']}
                rating={5}
              />
              <ContributionCard
                title="Designed emissions data model"
                project="Carbon Ledger"
                status="Accepted"
                tech={['PostgreSQL', 'TypeScript']}
                rating={5}
              />
              <ContributionCard
                title="Authored Node scaffolding template"
                project="Northstack CLI"
                status="Accepted"
                tech={['Node.js', 'CLI']}
                rating={4}
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works — Students */}
      <section className="container-page py-14">
        <div className="grid lg:grid-cols-2 gap-8">
          <HowItWorksCard
            icon={<Users size={20} />}
            overline="For Students"
            title="Build a portfolio that proves what you can do"
            steps={[
              'Create a profile with your skills, interests, and goals.',
              'Discover projects matching your stack, or publish your own idea.',
              'Apply to join, contribute to tasks, and submit work for review.',
              'Collect verified contributions and get approached by companies.',
            ]}
            ctaTo="/join"
            ctaLabel="Join as a Student"
          />
          <HowItWorksCard
            icon={<Building2 size={20} />}
            overline="For Companies"
            title="Recruit contributors from real, demonstrated work"
            steps={[
              'Create a company profile and publish a scoped project.',
              'Review applications, compare portfolios, and shortlist candidates.',
              'Assign tasks, review submissions, and verify contributions.',
              'Hire from contributors with proven context, not cold resumes.',
            ]}
            ctaTo="/join"
            ctaLabel="Join as a Company"
          />
        </div>
      </section>

      {/* Student work gallery preview */}
      <section className="container-page py-14">
        <SectionHeader
          overline="Student Work"
          title="What students are shipping"
          subtitle="Public portfolio pieces from student builders."
          actionTo="/gallery"
          actionLabel="Explore the gallery"
        />
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {portfolio.map((item) => (
              <Link
                key={item.id}
                to={`/creators/${item.profile?.handle}`}
                className="group surface overflow-hidden hover:border-accent-400/30 transition-all"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-ink-700 to-ink-850" />
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
            ))}
          </div>
        )}
      </section>

      {/* University partnerships */}
      <section className="container-page py-14">
        <div className="surface relative overflow-hidden p-8 sm:p-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-signal-violet/10 blur-3xl" />
          <div className="relative grid lg:grid-cols-[1.5fr_1fr] gap-8 items-center">
            <div>
              <span className="label-overline">University Partnerships</span>
              <h2 className="mt-3 font-display text-3xl font-bold text-white">
                Connect coursework with real projects.
              </h2>
              <p className="mt-4 text-slate-300 leading-relaxed max-w-xl">
                Universities can run capstone programs, form student teams, mentor projects, and track
                participation. Students gain real experience; faculty get visibility into outcomes.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Badge tone="accent"><GraduationCap size={13} /> Capstone programs</Badge>
                <Badge><Users size={13} /> Team formation</Badge>
                <Badge><Trophy size={13} /> Completion records</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-ink-900/60 p-5">
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
      </section>

      {/* Trust & safety */}
      <section className="container-page py-14">
        <div className="grid sm:grid-cols-3 gap-4">
          <TrustCard
            icon={<ShieldCheck size={20} />}
            title="Verified contributions only"
            desc="Reviews require verified project participation. Self-reported skills are clearly labeled."
          />
          <TrustCard
            icon={<Zap size={20} />}
            title="Fair, transparent reputation"
            desc="Review counts always show next to ratings. New members aren't penalized for starting out."
          />
          <TrustCard
            icon={<Building2 size={20} />}
            title="Responsible opportunities"
            desc="Paid, unpaid educational, and open-source work is clearly classified — no disguised labor."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-page py-14">
        <div className="relative overflow-hidden rounded-3xl border border-accent-400/20 bg-gradient-to-br from-ink-850 to-ink-900 p-10 sm:p-16 text-center">
          <div className="absolute inset-0 bg-radial-glow opacity-60" />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Stop polishing your resume.
              <br />
              Start shipping proof.
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-slate-300">
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
      </section>
    </div>
  );
}

function SectionHeader({
  overline,
  title,
  subtitle,
  actionTo,
  actionLabel,
}: {
  overline: string;
  title: string;
  subtitle?: string;
  actionTo: string;
  actionLabel: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="label-overline">{overline}</span>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white">{title}</h2>
        {subtitle && <p className="mt-2 text-slate-400 max-w-xl">{subtitle}</p>}
      </div>
      <Link to={actionTo} className="link-accent text-sm whitespace-nowrap">
        {actionLabel} →
      </Link>
    </div>
  );
}

function StepRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-300">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-sm text-slate-400">{desc}</p>
      </div>
    </div>
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
    <div className="rounded-xl border border-white/8 bg-ink-900/70 p-3.5">
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
  icon,
  overline,
  title,
  steps,
  ctaTo,
  ctaLabel,
}: {
  icon: React.ReactNode;
  overline: string;
  title: string;
  steps: string[];
  ctaTo: string;
  ctaLabel: string;
}) {
  return (
    <div className="surface-raised p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/15 text-accent-300">
          {icon}
        </div>
        <span className="label-overline">{overline}</span>
      </div>
      <h3 className="mt-4 font-display text-2xl font-bold text-white">{title}</h3>
      <ol className="mt-5 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-accent-300">
              {i + 1}
            </span>
            <span className="text-sm text-slate-300">{s}</span>
          </li>
        ))}
      </ol>
      <Link to={ctaTo} className="mt-6 block">
        <Button variant="secondary" className="w-full">{ctaLabel} <ArrowRight size={15} /></Button>
      </Link>
    </div>
  );
}

function TrustCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="surface p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-accent-300">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
