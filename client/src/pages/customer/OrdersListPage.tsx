import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { apiRequest, formatDateOnly, formatINR } from '../../lib/api';
import type { Order } from '../../types/api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusBadge
} from '../../components/ui/Primitives';

export function OrdersListPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: async () => (await apiRequest<Order[]>('/orders?limit=25')).data
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message={(error as Error)?.message ?? 'Unable to load orders'} onRetry={() => void refetch()} />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Order History"
        title="Your Orders"
        description="Select any order to inspect items, delivery dates, and server-verified refund eligibility under our 14-day demo return policy."
      />

      {data.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="There are no orders associated with your account."
          action={
            <Link to="/app/tickets/new">
              <Button>Ask Support</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.map((order) => (
            <Card key={order.id} className="p-5 transition-shadow hover:shadow-elevated">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-ink">
                      <Package className="h-4 w-4 text-accent" />
                      {order.orderNumber}
                    </span>
                    <StatusBadge status={order.status} />
                    {order.isEligibleForRefund ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-soft px-2.5 py-0.5 text-[11px] font-semibold text-emerald-ops">
                        <CheckCircle2 className="h-3 w-3" />
                        Refund Eligible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
                        <XCircle className="h-3 w-3" />
                        Not Refund Eligible
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink">
                    {order.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Placed {formatDateOnly(order.placedAt)}
                    {order.deliveryDate ? ` · Delivered ${formatDateOnly(order.deliveryDate)}` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-border pt-3 sm:border-0 sm:pt-0 sm:text-right">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-ink-muted">Order Total</p>
                    <p className="font-mono text-lg font-bold tabular-nums text-ink">
                      {formatINR(order.totalAmount)}
                    </p>
                  </div>
                  <Link to={`/app/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
