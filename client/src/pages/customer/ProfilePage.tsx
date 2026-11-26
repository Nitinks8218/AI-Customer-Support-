import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { apiRequest, formatDateOnly } from '../../lib/api';
import { Button, Card, PageHeader, Skeleton } from '../../components/ui/Primitives';

interface AgentStatus {
  provider: string;
  model: string;
  allowlistedTools: string[];
  refundAutoLimitINR: string;
  returnWindowDays: number;
  simulatedRefundsOnly: boolean;
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: agentStatus, isLoading } = useQuery({
    queryKey: ['agent-status'],
    queryFn: async () => (await apiRequest<AgentStatus>('/agent/status')).data
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Account & Diagnostics"
        title="Profile & Support Mode"
        description="Inspect your authenticated account details and the active AI policy engine configuration."
      />

      <Card className="p-6">
        <h2 className="text-base font-bold text-ink">Account Profile</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Full Name</dt>
            <dd className="mt-1 font-semibold text-ink">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Email</dt>
            <dd className="mt-1 font-mono text-ink">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Role</dt>
            <dd className="mt-1 font-mono font-semibold text-accent">{user?.role}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Member Since</dt>
            <dd className="mt-1 text-ink">{formatDateOnly(user?.createdAt)}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-border pt-4">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign Out of Session
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          <h2 className="text-base font-bold text-ink">AI Agent & Policy Guardrails</h2>
        </div>

        {isLoading ? (
          <Skeleton className="mt-4 h-24" />
        ) : agentStatus ? (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-subtle/60 px-4 py-3">
              <span className="text-ink-muted">Active Provider</span>
              <span className="font-mono font-semibold text-ink">
                {agentStatus.provider} ({agentStatus.model})
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-subtle/60 px-4 py-3">
              <span className="text-ink-muted">Auto-Simulated Refund Limit</span>
              <span className="font-mono font-semibold text-ink">₹{agentStatus.refundAutoLimitINR}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-subtle/60 px-4 py-3">
              <span className="text-ink-muted">Return Window</span>
              <span className="font-mono font-semibold text-ink">{agentStatus.returnWindowDays} calendar days</span>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Allowlisted Server Tools
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agentStatus.allowlistedTools.map((tool) => (
                  <span key={tool} className="rounded-md bg-emerald-soft px-2.5 py-1 font-mono text-xs text-emerald-ops">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 text-xs text-ink-muted">
              <ShieldCheck className="h-4 w-4 text-emerald-ops" />
              <span>Refunds are simulated locally; no real funds are moved.</span>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
