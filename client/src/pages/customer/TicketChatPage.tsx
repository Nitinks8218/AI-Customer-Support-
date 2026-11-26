import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bot,
  Send,
  User as UserIcon,
  ShieldCheck,
  Terminal,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { apiRequest, ApiError, formatDateTime, formatINR } from '../../lib/api';
import type { Message, Refund, Ticket } from '../../types/api';
import {
  Button,
  Card,
  CategoryBadge,
  ErrorState,
  PriorityBadge,
  Skeleton,
  StatusBadge
} from '../../components/ui/Primitives';
import { useToast } from '../../components/ui/Toast';

interface TicketDetailResponse {
  ticket: Ticket;
  messages: Message[];
  refunds: Refund[];
  escalations: Array<{
    id: string;
    decision: string;
    priority: string;
    requestedInfo: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }>;
}

const QUICK_PROMPTS = [
  'Check my refund eligibility for this order',
  'What is the 14-day return and shipping fee policy?',
  'Please escalate this case to human support'
];

export function TicketChatPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [draft, setDraft] = useState('');
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer-ticket', ticketId],
    queryFn: async () => (await apiRequest<TicketDetailResponse>(`/tickets/${ticketId}`)).data,
    enabled: Boolean(ticketId)
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) =>
      apiRequest<{ customerMessage: Message; aiMessage: Message }>(`/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content })
      }),
    onSuccess: () => {
      setDraft('');
      void queryClient.invalidateQueries({ queryKey: ['customer-ticket', ticketId] });
      void queryClient.invalidateQueries({ queryKey: ['customer-tickets'] });
      void queryClient.invalidateQueries({ queryKey: ['customer-refunds'] });
      void queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
    },
    onError: (err) => {
      pushToast({
        type: 'error',
        title: 'Message failed',
        description: err instanceof ApiError ? err.message : 'Unable to send message'
      });
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages.length]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-[460px] lg:col-span-8" />
          <Skeleton className="h-72 lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message={(error as Error)?.message ?? 'Ticket not found'} onRetry={() => void refetch()} />;
  }

  const { ticket, messages, refunds } = data;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const contextSidebar = (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">Ticket Context</h2>
        <dl className="mt-3 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Ticket #</dt>
            <dd className="font-mono font-semibold text-ink">{ticket.ticketNumber}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Status</dt>
            <dd><StatusBadge status={ticket.status} /></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Priority</dt>
            <dd><PriorityBadge priority={ticket.priority} /></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Category</dt>
            <dd><CategoryBadge category={ticket.category} /></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Assigned Agent</dt>
            <dd className="font-medium text-ink">{ticket.assignedTo?.name ?? 'AI Triage Queue'}</dd>
          </div>
        </dl>
      </Card>

      {ticket.order && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">Linked Order</h2>
            <Link
              to={`/app/orders/${ticket.order.id}`}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Inspect →
            </Link>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-ink">{ticket.order.orderNumber}</span>
              <StatusBadge status={ticket.order.status} />
            </div>
            <p className="font-mono text-base font-bold tabular-nums text-ink">
              {formatINR(ticket.order.totalAmount)}
            </p>
            <ul className="space-y-1 text-xs text-ink-muted">
              {ticket.order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.productName} ({item.category})
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {refunds.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
              Refund Activity (Simulated)
            </h2>
          </div>
          <div className="mt-3 space-y-3">
            {refunds.map((ref) => (
              <div key={ref.id} className="rounded-xl border border-border bg-subtle/40 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-ink">{ref.refundNumber}</span>
                  <StatusBadge status={ref.status} />
                </div>
                <p className="mt-1 font-mono text-sm font-bold tabular-nums text-ink">
                  {formatINR(ref.amount)}
                </p>
                {ref.simulatedTxnRef && (
                  <p className="mt-1 font-mono text-[11px] text-emerald-ops">
                    Demo Ref: {ref.simulatedTxnRef}
                  </p>
                )}
                {ref.reviewComment && (
                  <p className="mt-1.5 text-ink-muted">Staff note: {ref.reviewComment}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Tickets
        </Link>

        <button
          type="button"
          onClick={() => setMobileContextOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink lg:hidden"
        >
          <Info className="h-3.5 w-3.5 text-accent" />
          Case Context
          {mobileContextOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {mobileContextOpen && <div className="lg:hidden">{contextSidebar}</div>}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Conversation Panel */}
        <div className="lg:col-span-8">
          <Card className="flex flex-col overflow-hidden">
            {/* Ticket Header */}
            <div className="border-b border-border bg-surface px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-ink-muted">{ticket.ticketNumber}</span>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
              <h1 className="mt-1.5 font-display text-xl font-bold text-ink">{ticket.subject}</h1>
            </div>

            {/* Messages Stream */}
            <div className="max-h-[540px] space-y-4 overflow-y-auto bg-canvas/55 p-5">
              {messages.map((msg) => {
                const isCustomer = msg.senderType === 'CUSTOMER';
                const isAi = msg.senderType === 'AI';
                const isSystem = msg.senderType === 'SYSTEM';

                if (isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="mx-auto max-w-xl rounded-xl border border-border bg-surface px-4 py-2.5 text-center text-xs text-ink-muted"
                    >
                      <p className="font-medium text-ink">{msg.content}</p>
                      <p className="mt-1 font-mono text-[10px]">{formatDateTime(msg.createdAt)}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isCustomer && (
                      <div
                        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          isAi ? 'bg-ink-rail text-white' : 'bg-emerald-ops text-white'
                        }`}
                      >
                        {isAi ? <Bot className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isCustomer
                          ? 'bg-accent text-white'
                          : 'border border-border bg-surface text-ink shadow-sm'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-4 text-[11px]">
                        <span className={`font-semibold ${isCustomer ? 'text-blue-100' : 'text-ink-muted'}`}>
                          {msg.senderName}
                        </span>
                        <span className={`font-mono ${isCustomer ? 'text-blue-100/80' : 'text-ink-muted'}`}>
                          {formatDateTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-line">{msg.content}</p>

                      {msg.metadata?.toolEvents && msg.metadata.toolEvents.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-border pt-2.5">
                          <p className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                            <Terminal className="h-3 w-3" />
                            Backend Tool Activity
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.metadata.toolEvents.map((ev, idx) => (
                              <span
                                key={`${ev.tool}-${idx}`}
                                title={ev.summary}
                                className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-medium ${
                                  ev.status === 'ok'
                                    ? 'bg-emerald-soft text-emerald-ops'
                                    : ev.status === 'denied'
                                      ? 'bg-ochre-soft text-ochre-ops'
                                      : 'bg-crimson-soft text-crimson-ops'
                                }`}
                              >
                                {ev.tool}: {ev.summary}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {isCustomer && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Quick Prompts & Composer */}
            <div className="border-t border-border bg-surface p-4">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={sendMutation.isPending}
                    onClick={() => setDraft(prompt)}
                    className="rounded-full border border-border bg-subtle/60 px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSend} className="flex items-end gap-2.5">
                <label htmlFor="chat-composer" className="sr-only">
                  Reply to support ticket
                </label>
                <textarea
                  id="chat-composer"
                  rows={2}
                  placeholder="Write your message to Kestrel AI or support staff..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  className="flex-1 resize-none rounded-xl border border-border bg-canvas/50 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <Button type="submit" loading={sendMutation.isPending} disabled={!draft.trim()}>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Desktop Context Sidebar */}
        <aside className="hidden lg:col-span-4 lg:block">{contextSidebar}</aside>
      </div>
    </div>
  );
}
