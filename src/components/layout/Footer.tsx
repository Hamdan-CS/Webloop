import { Link } from 'react-router-dom';
import { Github, Linkedin } from 'lucide-react';
import { Wordmark } from '@/components/navigation/Wordmark';
import { useAuth } from '@/contexts/AuthContext';

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

/** Genie footer (F5): white band, loop wordmark, mono column heads, quiet links. */
export function Footer() {
  const { user } = useAuth();

  return (
    <footer className="site-footer">
      <div className="ft-wrap">
        <div className="ft">
          <div>
            <Link to="/" className="inline-flex items-center" aria-label="WebLoop home">
              <Wordmark />
            </Link>
            <p className="ft-blurb">
              Build real. Prove it. Students, companies and universities building verified projects together.
            </p>
            <div className="ft-social">
              <a href="https://github.com/Hamdan-CS" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <Github size={16} />
              </a>
              <a href="https://www.linkedin.com/in/abuhamdan-cs/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Linkedin size={16} />
              </a>
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              {col.links.filter((link) => link.to !== '/how-it-works' || !user).map((link) => (
                <Link key={link.label} to={link.to}>{link.label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div className="ft-bot">
          <span>© {new Date().getFullYear()} WebLoop · Demo platform — sample content is clearly labeled.</span>
          <span className="ft-legal">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Trust &amp; Safety</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
