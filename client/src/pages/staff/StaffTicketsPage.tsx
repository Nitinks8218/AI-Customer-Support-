import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight } from 'lucide-react';
import { apiRequest, formatDateTime } from '../../lib/api';
import type { PaginationMeta, Ticket } from '../../types/api';
import {
  Button,
  Card,
  CategoryBadge,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  PriorityBadge,
  Select,
  Skeleton,
  StatusBadge
} from '../../components/ui/Primitives';

interface StaffTicketsResponse {
  tickets: Ticket[];
  staffAgents: Array<{ id: string; name: string; email: string; role: string }>;
}

export function StaffTicketsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '10' });
  if (query.trim()) params.set('query', query.trim());
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (category) params.set('category', category);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff-tickets', page, query, status, priority, category],
    queryFn: async () =>
      apiRequest<StaffTicketsResponse>(`/staff/tickets?${params.toString()}`)
  });

  const meta = data?.meta as PaginationMeta | undefined;
  const tickets = data?.data.tickets ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support Triage"
        title="Ticket Queue"
        description="Search by ticket #, order #, customer name, or message text, and filter across status, priority, and category."
      />

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              aria-label="Search tickets"
              placeholder="Search TKT-2041, ORD-1006, customer, subject..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="md:col-span-2">
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_CUSTOMER">Awaiting Reply</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select
              aria-label="Filter by priority"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              <option value="REFUND_RETURN">Refund & Return</option>
              <option value="ORDER_DELIVERY">Order & Delivery</option>
              <option value="PRODUCT_QUALITY">Product Quality</option>
              <option value="PAYMENT_BILLING">Payment & Billing</option>
              <option value="ACCOUNT">Account</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : isError ? (
        <ErrorState message={(error as Error)?.message ?? 'Unable to load queue'} onRetry={() => void refetch()} />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No matching tickets"
          description="Adjust your search query or clear filters to inspect other tickets."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
                setStatus('');
                setPriority('');
                setCategory('');
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <>
          {/* Responsive Table on Desktop / Cards on Mobile */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-subtle/50 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Customer / Order</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-subtle/30">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-ink">{t.ticketNumber}</span>
                        <CategoryBadge category={t.category} />
                      </div>
                      <p className="mt-1 font-semibold text-ink">{t.subject}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <p className="font-semibold text-ink">{t.customer?.name}</p>
                      <p className="font-mono text-ink-muted">
                        {t.order?.orderNumber ?? 'No linked order'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-ink-muted">
                      {t.assignedTo?.name ?? 'Unassigned'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link to={`/staff/tickets/${t.id}`}>
                        <Button variant="outline" size="sm">
                          Open
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="space-y-3 md:hidden">
            {tickets.map((t) => (
              <Link key={t.id} to={`/staff/tickets/${t.id}`} className="block">
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-ink-muted">{t.ticketNumber}</span>
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                  <p className="mt-1.5 font-semibold text-ink">{t.subject}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {t.customer?.name} · {formatDateTime(t.updatedAt)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total} tickets)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
