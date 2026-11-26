import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PlusCircle,
  Package,
  MessageSquareText,
  RotateCcw,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { apiRequest, formatDateOnly, formatINR } from '../../lib/api';
import { useAuth } from '../../app/AuthContext';
import type { Order, Refund, Ticket } from '../../types/api';
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

interface CustomerDashboardData {
  metrics: {
    totalOrders: number;
    activeTickets: number;
    pendingRefunds: number;
  };
  recentOrders: Array<
    Pick<Order, 'id' | 'orderNumber' | 'status' | 'placedAt' | 'deliveryDate' | 'totalAmount' | 'currency'> & {
      itemCount: number;
    }
  >;
  recentTickets: Ticket[];
  recentRefunds: Refund[];
}

export function CustomerDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: async () => (await apiRequest<CustomerDashboardData>('/dashboard')).data
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message={(error as Error)?.message ?? 'Failed to load dashboard'} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Customer Workspace"
        title={`Hello, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Review your recent orders, chat with our policy-aware AI assistant, or track simulated refund requests."
        actions={
          <Link to="/app/tickets/new">
            <Button variant="primary">
              <PlusCircle className="h-4 w-4" />
              Get Help / Create Ticket
            </Button>
          </Link>
        }
      />

      {/* Asymmetric Highlight + Metrics Strip */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Card dark className="animate-rise flex flex-col justify-between p-6 lg:col-span-5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              Instant Policy & Order Triage
            </div>
            <h2 className="mt-3 font-display text-xl font-bold text-white">
              Need a return, replacement, or delivery check?
            </h2>
            <p className="mt-1.5 text-sm text-slate-300">
              Open a ticket linked to any order to chat with Kestrel AI. Eligible refunds up to
              ₹5,000 simulate automatically; higher amounts escalate to human staff.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link to="/app/tickets/new">
              <Button variant="primary" size="sm">
                Start Support Chat
              </Button>
            </Link>
            <Link to="/app/orders">
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                Browse Orders
              </Button>
            </Link>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
          <Card className="animate-rise p-5">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Orders</span>
              <Package className="h-4 w-4 text-accent" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{data.metrics.totalOrders}</p>
            <Link to="/app/orders" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              View all orders <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Card>

          <Card className="animate-rise-delay-1 p-5">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Tickets</span>
              <MessageSquareText className="h-4 w-4 text-emerald-ops" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{data.metrics.activeTickets}</p>
            <Link to="/app/tickets" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              Open conversations <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Card>

          <Card className="animate-rise-delay-2 p-5">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Refunds</span>
              <RotateCcw className="h-4 w-4 text-ochre-ops" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{data.metrics.pendingRefunds}</p>
            <Link to="/app/refunds" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              Refund timeline <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      </div>

      {/* Recent Orders & Tickets Split */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Recent Orders</h2>
            <Link to="/app/orders" className="text-xs font-semibold text-accent hover:underline">
              View all
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Orders placed under your account will appear here."
            />
          ) : (
            <div className="space-y-2.5">
              {data.recentOrders.map((order) => (
                <Link key={order.id} to={`/app/orders/${order.id}`} className="block">
                  <Card className="flex items-center justify-between p-4 hover:shadow-elevated">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-semibold text-ink">
                          {order.orderNumber}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        Placed {formatDateOnly(order.placedAt)} · {order.itemCount} item(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold tabular-nums text-ink">
                        {formatINR(order.totalAmount)}
                      </p>
                      <span className="text-[11px] font-medium text-accent">Inspect →</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Recent Support Tickets</h2>
            <Link to="/app/tickets" className="text-xs font-semibold text-accent hover:underline">
              View all
            </Link>
          </div>
          {data.recentTickets.length === 0 ? (
            <EmptyState
              title="No support tickets"
              description="Have a question about an order or return? Start a ticket to chat with Kestrel AI."
              action={
                <Link to="/app/tickets/new">
                  <Button size="sm">Create Ticket</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {data.recentTickets.map((ticket) => (
                <Link key={ticket.id} to={`/app/tickets/${ticket.id}`} className="block">
                  <Card className="p-4 hover:shadow-elevated">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-ink-muted">
                          {ticket.ticketNumber}
                        </span>
                        <CategoryBadge category={ticket.category} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <PriorityBadge priority={ticket.priority} />
                        <StatusBadge status={ticket.status} />
                      </div>
                    </div>
                    <p className="mt-2 font-semibold text-ink">{ticket.subject}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Updated {formatDateOnly(ticket.updatedAt)}
                      {ticket.order ? ` · ${ticket.order.orderNumber}` : ''}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
