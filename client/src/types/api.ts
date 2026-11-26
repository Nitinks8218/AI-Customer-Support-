export type UserRole = 'CUSTOMER' | 'SUPPORT' | 'ADMIN';
export type OrderStatus = 'PLACED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type ProductCategory =
  | 'ELECTRONICS'
  | 'APPAREL'
  | 'HOME_LIVING'
  | 'ACCESSORIES'
  | 'BOOKS_PRINT'
  | 'DIGITAL'
  | 'PERISHABLE'
  | 'PERSONALIZED';
export type TicketCategory =
  | 'ORDER_DELIVERY'
  | 'REFUND_RETURN'
  | 'PRODUCT_QUALITY'
  | 'PAYMENT_BILLING'
  | 'ACCOUNT'
  | 'OTHER';
export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MessageSenderType = 'CUSTOMER' | 'AI' | 'STAFF' | 'SYSTEM';
export type RefundStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';
export type EscalationDecision = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  category: ProductCategory;
  isReturnable: boolean;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  placedAt: string;
  deliveryDate: string | null;
  shippingFee: string;
  totalAmount: string;
  currency: string;
  items: OrderItem[];
  refundableBalance?: string;
  nonReturnableTotal?: string;
  withinReturnWindow?: boolean;
  daysSinceDelivery?: number | null;
  isEligibleForRefund?: boolean;
  eligibilityReason?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  customerId: string;
  orderId: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  customer?: { id: string; name: string; email: string };
  assignedTo?: { id: string; name: string; email: string } | null;
  order?: Order | null;
}

export interface MessageMetadata {
  provider?: string;
  toolsUsed?: string[];
  toolEvents?: Array<{ tool: string; status: 'ok' | 'denied' | 'error'; summary: string }>;
  refundNumber?: string;
  simulatedTxnRef?: string;
  simulated?: boolean;
  event?: string;
}

export interface Message {
  id: string;
  ticketId: string;
  senderType: MessageSenderType;
  senderName: string;
  content: string;
  visibility: 'PUBLIC' | 'INTERNAL';
  metadata: MessageMetadata | null;
  createdAt: string;
}

export interface Refund {
  id: string;
  refundNumber: string;
  orderId: string;
  ticketId: string;
  amount: string;
  currency: string;
  reason: string;
  status: RefundStatus;
  reviewComment: string | null;
  simulated: boolean;
  simulatedTxnRef: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
  orderNumber?: string;
  orderTotal?: string;
  ticketNumber?: string;
  ticketSubject?: string;
  requestedBy?: { id: string; name: string; email: string };
  reviewedBy?: { id: string; name: string } | null;
}

export interface Escalation {
  id: string;
  ticketId: string;
  refundId: string | null;
  summary: string;
  priority: TicketPriority;
  decision: EscalationDecision;
  internalNote: string | null;
  requestedInfo: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  ticketNumber?: string;
  ticketSubject?: string;
  ticketStatus?: TicketStatus;
  customer?: { id: string; name: string; email: string };
  refund?: {
    id: string;
    refundNumber: string;
    amount: string;
    status: RefundStatus;
    reason: string;
  } | null;
  assignedTo?: { id: string; name: string } | null;
  reviewedBy?: { id: string; name: string } | null;
}

export interface InternalNote {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  ticketId: string | null;
  refundId: string | null;
  eventType: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
