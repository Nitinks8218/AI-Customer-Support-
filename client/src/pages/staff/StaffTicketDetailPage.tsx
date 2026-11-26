import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Lock,
  Send,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { apiRequest, ApiError, formatDateTime, formatINR } from '../../lib/api';
import type {
  AuditEvent,
  Escalation,
  InternalNote,
  Message,
  Refund,
  Ticket,
  TicketPriority,
  TicketStatus
} from '../../types/api';
import {
  Button,
  Card,
  ConfirmDialog,
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

interface StaffTicketDetail {
  ticket: Ticket;
  messages: Message[];
  internalNotes: InternalNote[];
  refunds: Refund[];
  escalations: Escalation[];
  auditEvents: AuditEvent[];
  staffAgents: Array<{ id: string; name: string; email: string; role: string }>;
}

export function StaffTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [status, setStatus] = useState<TicketStatus>('OPEN');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [publicReply, setPublicReply] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const [decisionDialog, setDecisionDialog] = useState<{
    refundId: string;
    refundNumber: string;
    amount: string;
    decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO';
  } | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [decisionInternalNote, setDecisionInternalNote] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff-ticket', ticketId],
    queryFn: async () => (await apiRequest<StaffTicketDetail>(`/staff/tickets/${ticketId}`)).data,
    enabled: Boolean(ticketId)
  });

  useEffect(() => {
    if (data?.ticket) {
      setStatus(data.ticket.status);
      setPriority(data.ticket.priority);
      setAssignedToId(data.ticket.assignedToId ?? '');
    }
  }, [data?.ticket]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff-ticket', ticketId] });
    void queryClient.invalidateQueries({ queryKey: ['staff-tickets'] });
    void queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['staff-refunds'] });
    void queryClient.invalidateQueries({ queryKey: ['staff-escalations'] });
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string | null;
      publicReply?: string;
    }) =>
      apiRequest<Ticket>(`/staff/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      setPublicReply('');
      invalidateAll();
      pushToast({ type: 'success', title: 'Ticket updated' });
    },
    onError: (err) => {
      pushToast({
        type: 'error',
        title: 'Update rejected',
        description: err instanceof ApiError ? err.message : 'Unable to update ticket'
      });
    }
  });

  const noteMutation = useMutation({
    mutationFn: async (content: string) =>
      apiRequest<InternalNote>(`/staff/tickets/${ticketId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content })
      }),
    onSuccess: () => {
      setNoteContent('');
      invalidateAll();
      pushToast({ type: 'success', title: 'Internal staff note saved' });
    },
    onError: (err) => {
      pushToast({
        type: 'error',
        title: 'Note failed',
        description: err instanceof ApiError ? err.message : 'Unable to save note'
      });
    }
  });

  const decisionMutation = useMutation({
    mutationFn: async () => {
      if (!decisionDialog) throw new Error('Missing decision target');
      return apiRequest(`/staff/refunds/${decisionDialog.refundId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: decisionDialog.decision,
          comment: decisionComment.trim(),
          ...(decisionInternalNote.trim() ? { internalNote: decisionInternalNote.trim() } : {})
        })
      });
    },
    onSuccess: () => {
      setDecisionDialog(null);
      setDecisionComment('');
      setDecisionInternalNote('');
      invalidateAll();
      pushToast({ type: 'success', title: 'Refund decision recorded' });
    },
    onError: (err) => {
      pushToast({
        type: 'error',
        title: 'Decision failed',
        description: err instanceof ApiError ? err.message : 'Unable to submit decision'
      });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message={(error as Error)?.message ?? 'Unable to load ticket'} onRetry={() => void refetch()} />;
  }

  const { ticket, messages, internalNotes, refunds, auditEvents, staffAgents } = data;

  return (
    <div className="space-y-6">
      <Link
        to="/staff/tickets"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Ticket Queue
      </Link>

      <PageHeader
        eyebrow={`${ticket.ticketNumber} · ${ticket.customer?.name} (${ticket.customer?.email})`}
        title={ticket.subject}
        actions={
          <div className="flex items-center gap-2">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Conversation + Staff Public Reply + Private Internal Notes */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
                Customer-Visible Conversation
              </h2>
            </div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto bg-canvas/50 p-5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl border p-3.5 text-sm ${
                    m.senderType === 'CUSTOMER'
                      ? 'border-accent/20 bg-accent-soft/40'
                      : m.senderType === 'STAFF'
                        ? 'border-emerald-ops/20 bg-emerald-soft/40'
                        : 'border-border bg-surface'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">
                      {m.senderName} ({m.senderType})
                    </span>
                    <span className="font-mono text-ink-muted">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-line text-ink">{m.content}</p>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!publicReply.trim()) return;
                updateMutation.mutate({ publicReply: publicReply.trim() });
              }}
              className="border-t border-border bg-surface p-4"
            >
              <FormField label="Send Public Reply to Customer" htmlFor="staff-public-reply">
                <Textarea
                  id="staff-public-reply"
                  rows={2}
                  placeholder="Write a customer-facing reply..."
                  value={publicReply}
                  onChange={(e) => setPublicReply(e.target.value)}
                />
              </FormField>
              <div className="mt-3 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  loading={updateMutation.isPending}
                  disabled={!publicReply.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Public Reply
                </Button>
              </div>
            </form>
          </Card>

          {/* Staff-only Private Internal Notes */}
          <Card className="border border-amber-300/70 bg-amber-50/40 p-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-ochre-ops px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                <Lock className="h-3 w-3" />
                Staff Only · Private
              </span>
              <h2 className="text-base font-bold text-ink">Internal Notes</h2>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Never returned to customer APIs or visible in the customer portal.
            </p>

            <div className="mt-4 space-y-2.5">
              {internalNotes.length === 0 ? (
                <p className="text-xs italic text-ink-muted">No internal notes recorded yet.</p>
              ) : (
                internalNotes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-amber-200 bg-surface p-3.5 text-sm">
                    <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
                      <span className="font-semibold text-ink">{note.authorName}</span>
                      <span className="font-mono">{formatDateTime(note.createdAt)}</span>
                    </div>
                    <p className="text-ink">{note.content}</p>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (noteContent.trim().length < 2) return;
                noteMutation.mutate(noteContent.trim());
              }}
              className="mt-4 space-y-2.5"
            >
              <Textarea
                aria-label="Add private internal note"
                rows={2}
                placeholder="Add private investigation context for fellow staff..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                loading={noteMutation.isPending}
                disabled={noteContent.trim().length < 2}
              >
                <Lock className="h-3.5 w-3.5" />
                Save Internal Note
              </Button>
            </form>
          </Card>
        </div>

        {/* Right: Ticket Controls + Refund/Escalation Review + Audit Log */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="p-5">
            <h2 className="text-base font-bold text-ink">Case Controls</h2>
            <div className="mt-4 space-y-3.5">
              <FormField label="Status" htmlFor="staff-status">
                <Select
                  id="staff-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TicketStatus)}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </Select>
              </FormField>

              <FormField label="Priority" htmlFor="staff-priority">
                <Select
                  id="staff-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </FormField>

              <FormField label="Assigned Agent" htmlFor="staff-assignee">
                <Select
                  id="staff-assignee"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {staffAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.role})
                    </option>
                  ))}
                </Select>
              </FormField>

              <Button
                className="w-full"
                loading={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    status,
                    priority,
                    assignedToId: assignedToId || null
                  })
                }
              >
                Save Case Changes
              </Button>
            </div>
          </Card>

          {ticket.order && (
            <Card className="p-5">
              <h2 className="text-base font-bold text-ink">Order Context · {ticket.order.orderNumber}</h2>
              <div className="mt-2 flex items-center justify-between text-sm">
                <StatusBadge status={ticket.order.status} />
                <span className="font-mono font-bold tabular-nums">{formatINR(ticket.order.totalAmount)}</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-ink-muted">
                {ticket.order.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.quantity}× {item.productName} ({item.category})
                    </span>
                    <span className="font-mono">{formatINR(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {refunds.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-crimson-ops" />
                <h2 className="text-base font-bold text-ink">Refund & Escalation Review</h2>
              </div>
              <div className="mt-3 space-y-3">
                {refunds.map((ref) => (
                  <div key={ref.id} className="rounded-xl border border-border bg-subtle/40 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-ink">{ref.refundNumber}</span>
                      <StatusBadge status={ref.status} />
                    </div>
                    <p className="mt-1 font-mono text-lg font-bold tabular-nums text-ink">
                      {formatINR(ref.amount)}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">{ref.reason}</p>

                    {(ref.status === 'PENDING_REVIEW' || ref.status === 'REQUESTED') && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="emerald"
                          size="sm"
                          onClick={() =>
                            setDecisionDialog({
                              refundId: ref.id,
                              refundNumber: ref.refundNumber,
                              amount: ref.amount,
                              decision: 'APPROVED'
                            })
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            setDecisionDialog({
                              refundId: ref.id,
                              refundNumber: ref.refundNumber,
                              amount: ref.amount,
                              decision: 'REJECTED'
                            })
                          }
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDecisionDialog({
                              refundId: ref.id,
                              refundNumber: ref.refundNumber,
                              amount: ref.amount,
                              decision: 'MORE_INFO'
                            })
                          }
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                          Request Info
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Audit Timeline */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <h2 className="text-base font-bold text-ink">Audit Trail</h2>
            </div>
            <div className="mt-3 space-y-2.5">
              {auditEvents.length === 0 ? (
                <p className="text-xs text-ink-muted">No audit events recorded yet.</p>
              ) : (
                auditEvents.map((ev) => (
                  <div key={ev.id} className="border-l-2 border-accent/40 pl-3 text-xs">
                    <p className="font-mono font-semibold text-ink">{ev.eventType}</p>
                    <p className="text-ink-muted">
                      By {ev.actorName} · {formatDateTime(ev.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(decisionDialog)}
        title={
          decisionDialog
            ? `${decisionDialog.decision === 'APPROVED' ? 'Approve' : decisionDialog.decision === 'REJECTED' ? 'Reject' : 'Request Info for'} ${decisionDialog.refundNumber}`
            : ''
        }
        description={
          decisionDialog
            ? `Amount: ${formatINR(decisionDialog.amount)} (Simulated). Approvals revalidate policy eligibility and remaining balance before completing.`
            : ''
        }
        confirmLabel="Submit Decision"
        confirmVariant={
          decisionDialog?.decision === 'APPROVED'
            ? 'emerald'
            : decisionDialog?.decision === 'REJECTED'
              ? 'danger'
              : 'primary'
        }
        loading={decisionMutation.isPending}
        onCancel={() => setDecisionDialog(null)}
        onConfirm={() => {
          if (decisionComment.trim().length < 3) {
            pushToast({ type: 'error', title: 'Comment required', description: 'Enter at least 3 characters.' });
            return;
          }
          decisionMutation.mutate();
        }}
      >
        <div className="space-y-3">
          <FormField label="Customer-Visible Reason / Comment" htmlFor="decision-comment" required>
            <Textarea
              id="decision-comment"
              rows={3}
              placeholder="Provide the policy or investigation reason..."
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
            />
          </FormField>
          <FormField label="Optional Private Staff Note" htmlFor="decision-internal">
            <Textarea
              id="decision-internal"
              rows={2}
              placeholder="Optional internal audit context..."
              value={decisionInternalNote}
              onChange={(e) => setDecisionInternalNote(e.target.value)}
            />
          </FormField>
        </div>
      </ConfirmDialog>
    </div>
  );
}
