import { Link } from 'react-router-dom';
import { Github, Linkedin } from 'lucide-react';
import { Wordmark } from '@/components/layout/Wordmark';
import { useAuth } from '@/components/auth/AuthContext';

const columns = [
  {
    title: 'Platform',
    links: [
      { label: 'Explore Projects', to: '/explore' },
      { label: 'Student Work', to: '/gallery' },
      { label: 'Companies', to: '/companies' },
      { label: 'How It Works', to: '/how-it-works' },
    ],
  },
  {
    title: 'For Students',
    links: [
      { label: 'Join as a Student', to: '/join' },
      { label: 'Find Teammates', to: '/explore' },
      { label: 'Build a Portfolio', to: '/gallery' },
    ],
  },
  {
    title: 'For Companies',
    links: [
      { label: 'Join as a Company', to: '/join' },
      { label: 'Publish a Project', to: '/join' },
      { label: 'Discover Talent', to: '/companies' },
    ],
  },
];

export function Footer() {
  const { user } = useAuth();

  return (
    <footer className="relative z-[2] mt-24 border-t border-white/5 bg-ink-950/60 backdrop-blur-md">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="inline-flex items-center" aria-label="WebLoop home">
              <Wordmark />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Build real projects. Find your team. Prove your skills. Get discovered by companies
              hiring from real contributions.
            </p>
            <div className="mt-5 flex items-center gap-3 text-slate-400">
              <a
                href="https://github.com/Hamdan-CS"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 p-2 hover:text-accent-300 hover:border-accent-400/30 transition-colors"
                aria-label="GitHub"
              >
                <Github size={16} />
              </a>
              <a
                href="https://www.linkedin.com/in/abuhamdan-cs/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 p-2 hover:text-accent-300 hover:border-accent-400/30 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="label-overline mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.filter((link) => link.to !== '/how-it-works' || !user).map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} WebLoop. Demo platform — sample content is clearly labeled.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-300">Terms</a>
            <a href="#" className="hover:text-slate-300">Privacy</a>
            <a href="#" className="hover:text-slate-300">Trust & Safety</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
