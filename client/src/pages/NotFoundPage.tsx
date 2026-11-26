import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card } from '../components/ui/Primitives';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <Card className="max-w-md p-8 text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-accent">
          404 · Route Not Found
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/" className="mt-6 inline-block">
          <Button variant="primary">
            <ArrowLeft className="h-4 w-4" />
            Return Home
          </Button>
        </Link>
      </Card>
    </div>
  );
}
