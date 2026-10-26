import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  GraduationCap,
  ArrowRight,
  Code2,
  GitPullRequest,
  Trophy,
  ShieldCheck,
  Sparkles,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function HowItWorksPage() {
  return (
    <div className="container-page py-8">
      <div className="max-w-3xl">
        <span className="label-overline">How It Works</span>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">
          From browsing to verified contributions.
        </h1>
        <p className="mt-3 text-slate-400">
          WebLoop is built around one idea: students should get credit for what they actually build, and companies should hire from demonstrated work.
        </p>
      </div>

      {/* Roles */}
      <section className="mt-12 grid gap-5 lg:grid-cols-3">
        <RoleCard
          icon={<Users size={20} />}
          overline="Students"
          title="Build a portfolio that proves skills"
          points={[
            'Browse projects and creators as a guest.',
            'Join a project and get assigned real tasks.',
            'Submit work, get reviewed, earn verified contributions.',
            'Companies find you through your proven work.',
          ]}
        />
        <RoleCard
          icon={<Building2 size={20} />}
          overline="Companies"
          title="Recruit from demonstrated work"
          points={[
            'Publish a scoped project with clear deliverables.',
            'Review applications against public portfolios.',
            'Assign tasks, review submissions, verify contributions.',
            'Hire contributors with context, not cold resumes.',
          ]}
        />
        <RoleCard
          icon={<GraduationCap size={20} />}
          overline="Universities"
          title="Connect coursework with real projects"
          points={[
            'Run capstone programs with student teams.',
            'Mentor projects and track participation.',
            'Connect students with sponsoring companies.',
            'Showcase educational project outcomes.',
          ]}
        />
      </section>

      {/* Contribution pipeline */}
      <section className="mt-14 surface-raised p-8 sm:p-12">
        <span className="label-overline">The contribution pipeline</span>
        <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-white">
          How a task becomes career evidence.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <PipelineStep n={1} icon={<Search size={18} />} title="Discover" desc="Find a project matching your stack and apply to join." />
          <PipelineStep n={2} icon={<Code2 size={18} />} title="Contribute" desc="Get assigned a task with acceptance criteria and a reviewer." />
          <PipelineStep n={3} icon={<GitPullRequest size={18} />} title="Submit & review" desc="Submit evidence; the project owner reviews your work." />
          <PipelineStep n={4} icon={<Trophy size={18} />} title="Verified" desc="Accepted work is recorded as a verified contribution on your profile." />
        </div>
        <div className="mt-6 rounded-lg border border-signal-amber/20 bg-signal-amber/5 px-3 py-2 text-xs text-signal-amber/90 inline-flex items-center gap-2">
          <ShieldCheck size={13} /> Students cannot approve their own work. Only authorized reviewers verify contributions.
        </div>
      </section>

      {/* Project lifecycle */}
      <section className="mt-14">
        <span className="label-overline">Project lifecycle</span>
        <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-white">Every project has a clear stage.</h2>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          {['Draft', 'Published', 'Recruiting', 'In Progress', 'Completed', 'Archived'].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-2">
              <span className="rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-slate-300">{s}</span>
              {i < arr.length - 1 && <ArrowRight size={14} className="text-slate-600" />}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-400 max-w-2xl">Not every project passes through every stage — but each stage is clearly visible to visitors and collaborators.</p>
      </section>

      {/* Responsible projects */}
      <section className="mt-14 grid sm:grid-cols-3 gap-4">
        <PrincipleCard icon={<CheckCircle2 size={18} />} title="Clear classification" desc="Every project is labeled paid, unpaid educational, or open-source — no disguised labor." />
        <PrincipleCard icon={<ShieldCheck size={18} />} title="Fair reputation" desc="Review counts show alongside ratings. New members start neutral, never penalized." />
        <PrincipleCard icon={<Sparkles size={18} />} title="Evidence over claims" desc="Self-reported skills are clearly distinguished from verified contributions." />
      </section>

      {/* CTA */}
      <section className="mt-14 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">Ready to start?</h2>
        <p className="mt-3 text-slate-400">Browse as a guest, or join to start contributing.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/explore"><Button className="px-5 py-3">Explore Projects <ArrowRight size={16} /></Button></Link>
          <Link to="/join"><Button variant="secondary" className="px-5 py-3">Join the Platform</Button></Link>
        </div>
      </section>
    </div>
  );
}

function RoleCard({ icon, overline, title, points }: { icon: React.ReactNode; overline: string; title: string; points: string[] }) {
  return (
    <div className="surface-raised p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/15 text-accent-300">{icon}</div>
        <span className="label-overline">{overline}</span>
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
            <CheckCircle2 size={15} className="text-accent-400 mt-0.5 shrink-0" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PipelineStep({ n, icon, title, desc }: { n: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/15 text-accent-300">{icon}</div>
        <span className="font-mono text-xs text-accent-300">{String(n).padStart(2, '0')}</span>
      </div>
      <p className="mt-3 font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function PrincipleCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="surface p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-accent-300">{icon}</div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
