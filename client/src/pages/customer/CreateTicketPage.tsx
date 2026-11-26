import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { apiRequest, ApiError, formatINR } from '../../lib/api';
import type { Order, Ticket, TicketCategory } from '../../types/api';
import {
  Button,
  Card,
  FormField,
  Input,
  PageHeader,
  Select,
  Textarea
} from '../../components/ui/Primitives';
import { useToast } from '../../components/ui/Toast';

const createTicketFormSchema = z.object({
  category: z.enum([
    'ORDER_DELIVERY',
    'REFUND_RETURN',
    'PRODUCT_QUALITY',
    'PAYMENT_BILLING',
    'ACCOUNT',
    'OTHER'
  ]),
  subject: z.string().trim().min(4, 'Subject must be at least 4 characters').max(160),
  description: z.string().trim().min(10, 'Please include at least 10 characters of detail').max(3000),
  orderId: z.string().optional()
});

const CATEGORIES: Array<{ value: TicketCategory; label: string; hint: string }> = [
  { value: 'REFUND_RETURN', label: 'Refund / Return', hint: 'Return eligibility, damaged item refund, status' },
  { value: 'ORDER_DELIVERY', label: 'Order / Delivery', hint: 'Tracking ETA, missing package, delivery check' },
  { value: 'PRODUCT_QUALITY', label: 'Product / Quality', hint: 'Defective hardware, wrong variant, warranty' },
  { value: 'PAYMENT_BILLING', label: 'Payment / Billing', hint: 'GST invoice, double charge, payment query' },
  { value: 'ACCOUNT', label: 'Account', hint: 'Email update, access, or profile support' },
  { value: 'OTHER', label: 'Other', hint: 'Care tips or general questions' }
];

export function CreateTicketPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [category, setCategory] = useState<TicketCategory>('REFUND_RETURN');
  const [orderId, setOrderId] = useState(searchParams.get('orderId') ?? '');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ['customer-orders-select'],
    queryFn: async () => (await apiRequest<Order[]>('/orders?limit=25')).data
  });

  const mutation = useMutation({
    mutationFn: async (payload: {
      category: TicketCategory;
      subject: string;
      description: string;
      orderId: string | null;
    }) => apiRequest<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['customer-tickets'] });
      void queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
      pushToast({
        type: 'success',
        title: `Ticket ${res.data.ticketNumber} created`,
        description: 'You can now chat with Kestrel AI.'
      });
      navigate(`/app/tickets/${res.data.id}`);
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Unable to create ticket');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = createTicketFormSchema.safeParse({ category, subject, description, orderId });
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        subject: errs.subject?.[0] ?? '',
        description: errs.description?.[0] ?? ''
      });
      return;
    }

    mutation.mutate({
      category: parsed.data.category,
      subject: parsed.data.subject,
      description: parsed.data.description,
      orderId: parsed.data.orderId ? parsed.data.orderId : null
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/app/tickets"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Tickets
      </Link>

      <PageHeader
        eyebrow="New Support Case"
        title="Create a Support Ticket"
        description="Link an order if your inquiry is order-specific, or leave it blank to ask general policy questions."
      />

      <Card className="p-6 sm:p-8">
        {formError && (
          <div role="alert" className="mb-5 rounded-xl bg-crimson-soft px-4 py-3 text-sm font-medium text-crimson-ops">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <FormField label="Support Category" htmlFor="ticket-category" required>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    category === cat.value
                      ? 'border-accent bg-accent-soft/60 ring-1 ring-accent'
                      : 'border-border bg-surface hover:bg-subtle/60'
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">{cat.label}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{cat.hint}</p>
                </button>
              ))}
            </div>
          </FormField>

          <FormField
            label="Related Order (Optional)"
            htmlFor="ticket-order"
            hint="Linking an order lets Kestrel AI verify delivery status and eligibility immediately."
          >
            <Select id="ticket-order" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">No specific order / I will provide later</option>
              {(orders ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} — {o.status} — {formatINR(o.totalAmount)} (
                  {o.items[0]?.productName ?? 'Items'})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Subject" htmlFor="ticket-subject" error={fieldErrors.subject} required>
            <Input
              id="ticket-subject"
              placeholder="e.g., Requesting refund for damaged earbuds on ORD-1001"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              error={Boolean(fieldErrors.subject)}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="ticket-description"
            error={fieldErrors.description}
            required
          >
            <Textarea
              id="ticket-description"
              rows={5}
              placeholder="Explain what happened, what resolution you are looking for, and any relevant order details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={Boolean(fieldErrors.description)}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/app/tickets">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" loading={mutation.isPending}>
              Create Ticket & Open Chat
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
