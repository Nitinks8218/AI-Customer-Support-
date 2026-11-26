import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { apiRequest, ApiError, formatDateTime, formatINR } from '../../lib/api';
import type { Escalation } from '../../types/api';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormField,
  PageHeader,
  PriorityBadge,
  Select,
  Skeleton,
  StatusBadge,
  Textarea
} from '../../components/ui/Primitives';
import { useToast } from '../../components/ui/Toast';

export function StaffEscalationsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [decisionFilter, setDecisionFilter] = useState('PENDING');
  const [selected, setSelected] = useState<{
    esc: Escalation;
    decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO';
  } | null>(null);
  const [comment, setComment] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const params = new URLSearchParams({ limit: '25' });
  if (decisionFilter) params.set('decision', decisionFilter);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff-escalations', decisionFilter],
    queryFn: async () => (await apiRequest<Escalation[]>(`/staff/escalations?${params.toString()}`)).data
  });

  const decisionMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('No escalation selected');
      return apiRequest(`/staff/escalations/${selected.esc.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: selected.decision,
          comment: comment.trim(),
          ...(internalNote.trim() ? { internalNote: internalNote.trim() } : {})
        })
      });
    },
    onSuccess: () => {
      setSelected(null);
      setComment('');
      setInternalNote('');
      void queryClient.invalidateQueries({ queryKey: ['staff-escalations'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-refunds'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-tickets'] });
      pushToast({ type: 'success', title: 'Escalation decision saved' });
    },
    onError: (err) => {
      pushToast({
        type: 'error',
        title: 'Action failed',
        description: err instanceof ApiError ? err.message : 'Unable to decide escalation'
      });
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Human Review Workbench"
        title="Escalations & High-Value Claims"
        description="Review refunds above ₹5,000.00 and customer-requested escalations. All approvals revalidate policy eligibility before simulating completion."
        actions={
          <Select
            aria-label="Filter escalation decision"
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="w-48"
          >
            <option value="">All Decisions</option>
            <option value="PENDING">Pending Review</option>
            <option value="MORE_INFO">More Info Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : isError || !data ? (
        <ErrorState message={(error as Error)?.message ?? 'Failed to load escalations'} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          title="No escalations in this view"
          description="Switch the filter to see resolved escalations or check back when new high-value claims arrive."
        />
      ) : (
        <div className="space-y-4">
          {data.map((esc) => (
            <Card key={esc.id} className="p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ink">{esc.ticketNumber}</span>
                    <PriorityBadge priority={esc.priority} />
                    <StatusBadge status={esc.decision} />
                  </div>
                  <p className="text-base font-bold text-ink">{esc.summary}</p>
                  <p className="text-xs text-ink-muted">
                    Customer: {esc.customer?.name} ({esc.customer?.email}) · Created{' '}
                    {formatDateTime(esc.createdAt)}
                  </p>
                  {esc.refund && (
                    <div className="inline-flex flex-wrap items-center gap-3 rounded-xl bg-subtle/60 px-3 py-2 text-xs">
                      <span className="font-mono font-bold text-ink">{esc.refund.refundNumber}</span>
                      <span className="font-mono font-bold tabular-nums text-crimson-ops">
                        {formatINR(esc.refund.amount)}
                      </span>
                      <span className="text-ink-muted">Reason: {esc.refund.reason}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(esc.decision === 'PENDING' || esc.decision === 'MORE_INFO') && (
                    <>
                      <Button
                        variant="emerald"
                        size="sm"
                        onClick={() => setSelected({ esc, decision: 'APPROVED' })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setSelected({ esc, decision: 'REJECTED' })}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected({ esc, decision: 'MORE_INFO' })}
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        Request Info
                      </Button>
                    </>
                  )}
                  <Link to={`/staff/tickets/${esc.ticketId}`}>
                    <Button variant="ghost" size="sm">
                      Open Case
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(selected)}
        title={
          selected
            ? `${selected.decision === 'APPROVED' ? 'Approve' : selected.decision === 'REJECTED' ? 'Reject' : 'Request More Info'} — ${selected.esc.ticketNumber}`
            : ''
        }
        description="A written comment is mandatory and will be recorded in the audit log and shared safely with the customer."
        confirmLabel="Confirm Decision"
        confirmVariant={
          selected?.decision === 'APPROVED'
            ? 'emerald'
            : selected?.decision === 'REJECTED'
              ? 'danger'
              : 'primary'
        }
        loading={decisionMutation.isPending}
        onCancel={() => setSelected(null)}
        onConfirm={() => {
          if (comment.trim().length < 3) {
            pushToast({ type: 'error', title: 'Reason required', description: 'Please enter at least 3 characters.' });
            return;
          }
          decisionMutation.mutate();
        }}
      >
        <div className="space-y-3">
          <FormField label="Decision Reason / Customer Message" htmlFor="esc-comment" required>
            <Textarea
              id="esc-comment"
              rows={3}
              placeholder="Explain why this escalation is approved, rejected, or requires additional details..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </FormField>
          <FormField label="Internal Note (Optional)" htmlFor="esc-note">
            <Textarea
              id="esc-note"
              rows={2}
              placeholder="Private staff note..."
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
            />
          </FormField>
        </div>
      </ConfirmDialog>
    </div>
  );
}
