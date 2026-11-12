import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Footer — the v4 demo's white footer with the soft #f5f9ff card
 * (styles in genie-shell.css, generated from the demo). Same structure and
 * copy as the demo; links point at the real routes.
 */
export function Footer() {
  const { user } = useAuth();
  return (
    <footer className="gh-footer">
      <div className="gh-wrap">
        <div className="gh-ft">
          <div>
            <Link className="gh-logo" to="/" aria-label="WebLoop home">
              WebL<svg width="26" height="14" aria-hidden="true"><use href="#loop" /></svg>p
            </Link>
            <p>Build real. Prove it. Students, companies and universities building verified projects together.</p>
          </div>
          <div>
            <h4>Platform</h4>
            <Link to="/explore">Explore projects</Link>
            {!user && <Link to="/how-it-works">How it works</Link>}
            <Link to="/companies">Companies</Link>
          </div>
          <div>
            <h4>Join</h4>
            <Link to="/join">As a student</Link>
            <Link to="/join">As a company</Link>
            <Link to="/join">As a university</Link>
          </div>
          <div>
            <h4>WebLoop</h4>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Trust &amp; safety</a>
          </div>
        </div>
        <div className="gh-ft-bot"><span>© {new Date().getFullYear()} WebLoop</span><span>Demo platform · sample content is clearly labeled</span></div>
      </div>
    </footer>
  );
}
