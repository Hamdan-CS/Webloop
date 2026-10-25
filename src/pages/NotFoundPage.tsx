import { Link } from 'react-router-dom';
import { Compass, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="container-page py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-300">
        <Compass size={28} />
      </div>
      <h1 className="mt-6 font-display text-3xl sm:text-4xl font-bold text-white">Page not found</h1>
      <p className="mt-3 text-slate-400 max-w-md mx-auto">
        The page you're looking for doesn't exist or may have moved. Try browsing the platform instead.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/"><Button className="px-5 py-3">Back to Home <ArrowRight size={15} /></Button></Link>
        <Link to="/explore"><Button variant="secondary" className="px-5 py-3">Explore Projects</Button></Link>
      </div>
    </div>
  );
}
