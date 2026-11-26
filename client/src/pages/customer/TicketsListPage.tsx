import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, MessageSquareText, ArrowRight } from 'lucide-react';
import { apiRequest, formatDateTime } from '../../lib/api';
import type { Ticket } from '../../types/api';
import {
  Button,
  Card,
  CategoryBadge,
  EmptyState,
  ErrorState,
  PageHeader,
  PriorityBadge,
  Skeleton,
  StatusBadge
} from '../../components/ui/Primitives';

export function TicketsListPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer-tickets'],
    queryFn: async () => (await apiRequest<Ticket[]>('/tickets?limit=25')).data
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message={(error as Error)?.message ?? 'Failed to load tickets'} onRetry={() => void refetch()} />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Support Conversations"
        title="Your Support Tickets"
        description="Continue any conversation with Kestrel AI or our human support specialists."
        actions={
          <Link to="/app/tickets/new">
            <Button variant="primary">
              <PlusCircle className="h-4 w-4" />
              New Ticket
            </Button>
          </Link>
        }
      />

      {data.length === 0 ? (
        <EmptyState
          title="No support tickets yet"
          description="Create your first support ticket to chat with our AI assistant or request help with an order."
          action={
            <Link to="/app/tickets/new">
              <Button>Create Ticket</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.map((ticket) => (
            <Link key={ticket.id} to={`/app/tickets/${ticket.id}`} className="block">
              <Card className="p-5 transition-shadow hover:shadow-elevated">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-ink-muted">
                        <MessageSquareText className="h-3.5 w-3.5 text-accent" />
                        {ticket.ticketNumber}
                      </span>
                      <CategoryBadge category={ticket.category} />
                      {ticket.order && (
                        <span className="rounded bg-subtle px-2 py-0.5 font-mono text-[11px] font-medium text-ink">
                          {ticket.order.orderNumber}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-ink">{ticket.subject}</h2>
                    <p className="line-clamp-1 text-sm text-ink-muted">{ticket.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      <span>Updated {formatDateTime(ticket.updatedAt)}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-accent" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
