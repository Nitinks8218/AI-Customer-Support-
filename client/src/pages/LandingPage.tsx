import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  ShieldCheck,
  Scale,
  Clock,
  FileText,
  Lock
} from 'lucide-react';
import { Button, Card } from '../components/ui/Primitives';
import { useAuth } from '../app/AuthContext';

export function LandingPage() {
  const { user } = useAuth();
  const dashboardPath = user ? (user.role === 'CUSTOMER' ? '/app' : '/staff') : '/login';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top Bar */}
      <header className="border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-rail font-display text-sm font-bold text-white">
              K
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Kestrel Care</span>
          </div>
          <div className="flex items-center gap-2.5">
            {user ? (
              <Link to={dashboardPath}>
                <Button variant="primary" size="sm">
                  Open Workspace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Editorial Hero */}
      <section className="bg-editorial-grid border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:items-center lg:px-8">
          <div className="animate-rise lg:col-span-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-ink-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-ops" />
              Policy-grounded AI support & human escalation ops
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Customer resolution with verifiable policy guardrails.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
              Kestrel Care pairs a conversational AI support assistant with strict backend refund
              validation, automated demo transactions up to ₹5,000, and audited human escalation for
              high-value claims.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={user ? dashboardPath : '/login'}>
                <Button variant="primary" size="lg">
                  {user ? 'Go to Dashboard' : 'Sign In to Portal'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {!user && (
                <Link to="/register">
                  <Button variant="outline" size="lg">
                    Register Customer Account
                  </Button>
                </Link>
              )}
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              Local demo environment: seeded customer and staff accounts are listed in{' '}
              <span className="font-mono font-semibold text-ink">README.md</span>. All refunds are
              simulated.
            </p>
          </div>

          {/* Asymmetric Architectural Ops Preview Card */}
          <div className="animate-rise-delay-1 lg:col-span-5">
            <Card dark className="relative overflow-hidden p-6 sm:p-7">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                    Policy Engine · Live Rules
                  </p>
                  <p className="mt-0.5 font-display text-lg font-semibold text-white">
                    Server-Enforced Boundaries
                  </p>
                </div>
                <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-300">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-3.5 text-sm">
                <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                  <div>
                    <p className="font-semibold text-white">14-Day Inclusive Return Window</p>
                    <p className="text-xs text-slate-300">
                      Calculated server-side from delivery UTC date; non-returnable categories blocked.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                  <Scale className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <div>
                    <p className="font-semibold text-white">₹5,000.00 Escalation Threshold</p>
                    <p className="text-xs text-slate-300">
                      Eligible claims ≤ ₹5,000 simulate immediately; claims above ₹5,000 route to staff review.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <div>
                    <p className="font-semibold text-white">Zero-Trust AI Tooling</p>
                    <p className="text-xs text-slate-300">
                      Allowlisted backend tools only. Prompt injections cannot alter limits or ownership.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Capabilities Strip */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="animate-rise p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Bot className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold">Transparent AI Triage</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              Every order lookup, policy citation, and refund validation step is logged as a visible
              activity badge in your ticket thread.
            </p>
          </Card>

          <Card className="animate-rise-delay-1 p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-soft text-emerald-ops">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold">Inspectable Demo Policy</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              Policy retrieval queries the committed local Markdown specification with idempotent
              refund keys and decimal-safe currency math.
            </p>
          </Card>

          <Card className="animate-rise-delay-2 p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-soft text-ochre-ops">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold">Audited Staff Operations</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              Support staff review escalated cases with private internal notes, revalidated approvals,
              and immutable audit timelines.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
