import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CloudBank } from '@/design-system/illustrations/CloudBank';
import { LoopMark } from '@/design-system/illustrations/LoopMark';
import { ClayObject } from '@/design-system/illustrations/ClayObject';

/** 404 — a quiet cloud scene with the loop and one way back (F8). */
export function NotFoundPage() {
  return (
    <div className="nf">
      <ClayObject kind="spark" size={46} style={{ position: 'absolute', left: '18%', top: '18%' }} />
      <ClayObject kind="star" size={54} style={{ position: 'absolute', right: '17%', top: '26%' }} />
      <div>
        <LoopMark variant="glossy" pulse width={150} />
        <h1>This loop is <span className="acc">open.</span></h1>
        <p>The page you're looking for doesn't exist or may have moved. Try browsing the platform instead.</p>
        <div className="actions">
          <Link to="/" className="btn-primary">Back to Home <ArrowRight size={15} /></Link>
          <Link to="/explore" className="btn-secondary">Explore Projects</Link>
        </div>
      </div>
      <CloudBank side="bottom" density={5} parallax />
    </div>
  );
}
