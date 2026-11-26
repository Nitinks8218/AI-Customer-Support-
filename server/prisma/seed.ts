import {
  PrismaClient,
  UserRole,
  OrderStatus,
  ProductCategory,
  TicketCategory,
  TicketStatus,
  TicketPriority,
  MessageSenderType,
  MessageVisibility,
  RefundStatus,
  EscalationDecision
} from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

async function main() {
  console.log('Seeding Kestrel Care PostgreSQL database...');

  const customerPassHash = await bcrypt.hash('Customer@123', 10);
  const staffPassHash = await bcrypt.hash('Staff@1234', 10);
  const adminPassHash = await bcrypt.hash('Admin@1234', 10);

  // 1. Seed Users (1 Admin, 2 Support Agents, 3 Customers)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kestrelcare.demo' },
    update: { name: 'Vikram Rao', role: UserRole.ADMIN },
    create: {
      name: 'Vikram Rao',
      email: 'admin@kestrelcare.demo',
      passwordHash: adminPassHash,
      role: UserRole.ADMIN
    }
  });

  const supportMaya = await prisma.user.upsert({
    where: { email: 'maya.support@kestrelcare.demo' },
    update: { name: 'Maya Deshmukh', role: UserRole.SUPPORT },
    create: {
      name: 'Maya Deshmukh',
      email: 'maya.support@kestrelcare.demo',
      passwordHash: staffPassHash,
      role: UserRole.SUPPORT
    }
  });

  const supportRohan = await prisma.user.upsert({
    where: { email: 'rohan.support@kestrelcare.demo' },
    update: { name: 'Rohan Kulkarni', role: UserRole.SUPPORT },
    create: {
      name: 'Rohan Kulkarni',
      email: 'rohan.support@kestrelcare.demo',
      passwordHash: staffPassHash,
      role: UserRole.SUPPORT
    }
  });

  const aarav = await prisma.user.upsert({
    where: { email: 'aarav.sharma@example.com' },
    update: { name: 'Aarav Sharma', role: UserRole.CUSTOMER },
    create: {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      passwordHash: customerPassHash,
      role: UserRole.CUSTOMER
    }
  });

  const priya = await prisma.user.upsert({
    where: { email: 'priya.nair@example.com' },
    update: { name: 'Priya Nair', role: UserRole.CUSTOMER },
    create: {
      name: 'Priya Nair',
      email: 'priya.nair@example.com',
      passwordHash: customerPassHash,
      role: UserRole.CUSTOMER
    }
  });

  const kabir = await prisma.user.upsert({
    where: { email: 'kabir.mehta@example.com' },
    update: { name: 'Kabir Mehta', role: UserRole.CUSTOMER },
    create: {
      name: 'Kabir Mehta',
      email: 'kabir.mehta@example.com',
      passwordHash: customerPassHash,
      role: UserRole.CUSTOMER
    }
  });

  // 2. Seed Policy Document
  const policyPath = path.resolve(__dirname, '../../policy/returns-and-refunds.md');
  let policyContent = '';
  try {
    policyContent = await fs.readFile(policyPath, 'utf-8');
  } catch {
    policyContent = '# Returns and Refunds Policy\nStandard 14-day return window for eligible delivered orders.';
  }

  await prisma.policyDocument.upsert({
    where: { slug: 'returns-and-refunds' },
    update: {
      title: 'Kestrel Care — Demo Returns, Refunds & Escalation Policy',
      version: '1.0.0',
      content: policyContent
    },
    create: {
      slug: 'returns-and-refunds',
      title: 'Kestrel Care — Demo Returns, Refunds & Escalation Policy',
      version: '1.0.0',
      content: policyContent
    }
  });

  // 3. Seed 11 Orders
  const orderSpecs = [
    {
      orderNumber: 'ORD-1001',
      customerId: aarav.id,
      status: OrderStatus.DELIVERED,
      placedAt: daysAgo(7),
      deliveryDate: daysAgo(4),
      shippingFee: '99.00',
      totalAmount: '3398.00',
      items: [
        {
          productName: 'AeroBuds ANC Wireless Earphones',
          category: ProductCategory.ELECTRONICS,
          isReturnable: true,
          quantity: 1,
          unitPrice: '3299.00',
          lineTotal: '3299.00'
        }
      ]
    },
    {
      orderNumber: 'ORD-1002',
      customerId: aarav.id,
      status: OrderStatus.DELIVERED,
      placedAt: daysAgo(6),
      deliveryDate: daysAgo(3),
      shippingFee: '0.00',
      totalAmount: '24500.00',
      items: [
        {
          productName: 'LuminaPro 27" 4K Color-Calibrated Monitor',
          category: ProductCategory.ELECTRONICS,
          isReturnable: true,
          quantity: 1,
          unitPrice: '24500.00',
          lineTotal: '24500.00'
        }
      ]
    },
    {
      orderNumber: 'ORD-1003',
      customerId: aarav.id,
      status: OrderStatus.DELIVERED,
      placedAt: daysAgo(26),
      deliveryDate: daysAgo(22),
      shippingFee: '99.00',
      totalAmount: '1949.00',
      items: [
        {
          productName: 'Kanso Stoneware Pour-Over Kettle',
          category: ProductCategory.HOME_LIVING,
          isReturnable: true,
          quantity: 1,
          unitPrice: '1850.00',
          lineTotal: '1850.00'
        }
      ]
    },
    {
      orderNumber: 'ORD-1004',
      customerId: aarav.id,
      status: OrderStatus.DELIVERED,
      placedAt: daysAgo(2),
      deliveryDate: daysAgo(2),
      shippingFee: '0.00',
      totalAmount: '1499.00',
      items: [
        {
          productName: 'Atelier RAW Color Grading Pack (Digital License)',
          category: ProductCategory.DIGITAL,
          isReturnable: false,
          quantity: 1,
          unitPrice: '1499.00',
          lineTotal: '1499.00'
        }
      ]
    },
    {
      orderNumber: 'ORD-1005',
      customerId: aarav.id,
      status: OrderStatus.SHIPPED,
      placedAt: daysAgo(2),
      deliveryDate: null,
      shippingFee: '99.00',
      totalAmount: '4299.00',
      items: [
        {
          productName: 'Heavyweight Merino Wool Overshirt — Charcoal',
          category: ProductCategory.APPAREL,
          isReturnable: true,
          quantity: 1,
          unitPrice: '4200.00',
          lineTotal: '4200.00'
        }
      ]
    },
    {
      orderNumber: 'ORD-1006',
      customerId: priya.id,
      status: OrderStatus.DELIVERED,
      placedAt: daysAgo(9),
      deliveryDate: daysAgo(5),
      shippingFee: '0.00',
      totalAmount: '6800.00',
      items: [
        {
          productName: 'Barista Conical Burr Espresso Grinder',
          category: ProductCategory.HOME_LIVING,
          isReturnable: true,
          quantity: 1,
          unitPrice: '6800.00',
          lineTotal: '6800.00'
        }
      ]
    },
    {
      orderNumber: 'ORD-1007',
      customerId: priya.id,
      status: OrderStatus.DELIVERED,
      placedAt: daysAgo(9),
      deliveryDate: daysAgo(6),
      shippingFee: '0.00',
      totalAmount: '2400.00',
      items: [
        {
          productName: 'Monogrammed Full-Grain Leather Laptop Sleeve',
          category: ProductCategory.PERSONALIZED,
          isReturnable: false,
          quantity: 1,
          unitPrice: '2400.00',
          lineTotal: '2400.00'
        }
      ]
    },
    {
      orderNumber: 'ORD-1008',
      customerId: priya.id,
      status: OrderStatus.DELIVERED,
      placedAt: daysAgo(11),
      deliveryDate: daysAgo(7),
      shippingFee: '99.00',
      totalAmount: '4899.00',
      items: [
        {
          productName: 'Tactile 75% Aluminum Mechanical Keyboard',
          category: ProductCategory.ELECTRONICS,
          isReturnable: true,
          quantity: 1,
          unitPrice: '4800.00',
          lineTotal: '4800.00'
        }
      ]
    },
    {
      orderNumber: 'ORD-1009',
      customerId: kabir.id,
      status: OrderStatus.DELIVERED,
      placedAt: daysAgo(4),
      deliveryDate: daysAgo(1),
      shippingFee: '0.00',
      totalAmount: '8500.00',
      items: [
        {
          productName: 'Architectural Brass Task Lamp',
          category: ProductCategory.HOME_LIVING,
          isReturnable: true,
          quantity: 1,
          unitPrice: '4900.00',
          lineTotal: '4900.00'
        },
        {
          productName: 'Thunderbolt 10-in-1 Dock',
          category: ProductCategory.ELECTRONICS,
          isReturnable: true,
          quantity: 1,
          unitPrice: '3600.00',
          lineTotal: '3600.00'
        }
      ]
    },
    {
      orderNumber: 'ORD-1010',
      customerId: kabir.id,
      status: OrderStatus.DELIVERED,
      placedAt: daysAgo(24),
      deliveryDate: daysAgo(20),
      shippingFee: '0.00',
      totalAmount: '1250.00',
      items: [
        {
          productName: 'Chikmagalur Single-Origin Whole Beans (1kg)',
          category: ProductCategory.PERISHABLE,
          isReturnable: false,
          quantity: 1,
          unitPrice: '1250.00',
          lineTotal: '1250.00'
        }
      ]
    },
    {
      orderNumber: 'ORD-1011',
      customerId: kabir.id,
      status: OrderStatus.PROCESSING,
      placedAt: daysAgo(1),
      deliveryDate: null,
      shippingFee: '99.00',
      totalAmount: '3699.00',
      items: [
        {
          productName: 'Waxed Canvas Weekender Duffel',
          category: ProductCategory.ACCESSORIES,
          isReturnable: true,
          quantity: 1,
          unitPrice: '3600.00',
          lineTotal: '3600.00'
        }
      ]
    }
  ];

  const ordersByNumber = new Map<string, { id: string; customerId: string }>();

  for (const spec of orderSpecs) {
    const existing = await prisma.order.findUnique({ where: { orderNumber: spec.orderNumber } });
    if (existing) {
      ordersByNumber.set(spec.orderNumber, { id: existing.id, customerId: existing.customerId });
      continue;
    }
    const created = await prisma.order.create({
      data: {
        orderNumber: spec.orderNumber,
        customerId: spec.customerId,
        status: spec.status,
        placedAt: spec.placedAt,
        deliveryDate: spec.deliveryDate,
        shippingFee: spec.shippingFee,
        totalAmount: spec.totalAmount,
        currency: 'INR',
        items: {
          create: spec.items
        }
      }
    });
    ordersByNumber.set(spec.orderNumber, { id: created.id, customerId: created.customerId });
  }

  // 4. Seed Tickets, Messages, Refunds, Escalations, InternalNotes, AuditEvents (idempotent by ticketNumber)
  const ord1001 = ordersByNumber.get('ORD-1001')!;
  const ord1003 = ordersByNumber.get('ORD-1003')!;
  const ord1005 = ordersByNumber.get('ORD-1005')!;
  const ord1006 = ordersByNumber.get('ORD-1006')!;
  const ord1007 = ordersByNumber.get('ORD-1007')!;
  const ord1008 = ordersByNumber.get('ORD-1008')!;
  const ord1009 = ordersByNumber.get('ORD-1009')!;
  const ord1010 = ordersByNumber.get('ORD-1010')!;

  async function ensureTicket(data: {
    ticketNumber: string;
    customerId: string;
    orderId: string | null;
    subject: string;
    description: string;
    category: TicketCategory;
    status: TicketStatus;
    priority: TicketPriority;
    assignedToId: string | null;
    resolvedAt?: Date | null;
  }) {
    const existing = await prisma.ticket.findUnique({ where: { ticketNumber: data.ticketNumber } });
    if (existing) return { ticket: existing, created: false };
    const ticket = await prisma.ticket.create({ data });
    return { ticket, created: true };
  }

  // Ticket 1: Escalated high-value refund (> ₹5,000) for Priya (ORD-1006)
  const t1 = await ensureTicket({
    ticketNumber: 'TKT-2041',
    customerId: priya.id,
    orderId: ord1006.id,
    subject: 'Burr grinder motor rattling out of the box',
    description: 'The Barista Conical Burr Espresso Grinder makes a loud metallic rattle when powered on. Requesting a full refund for ORD-1006.',
    category: TicketCategory.REFUND_RETURN,
    status: TicketStatus.ESCALATED,
    priority: TicketPriority.HIGH,
    assignedToId: supportMaya.id
  });

  if (t1.created) {
    await prisma.message.createMany({
      data: [
        {
          ticketId: t1.ticket.id,
          senderType: MessageSenderType.CUSTOMER,
          senderUserId: priya.id,
          visibility: MessageVisibility.PUBLIC,
          content: 'The Barista Conical Burr Espresso Grinder makes a loud metallic rattle when powered on. Requesting a full refund for ORD-1006.'
        },
        {
          ticketId: t1.ticket.id,
          senderType: MessageSenderType.AI,
          visibility: MessageVisibility.PUBLIC,
          content:
            'I verified order ORD-1006 (delivered 5 days ago, within the 14-day return window). Because the refundable amount of ₹6,800.00 exceeds the ₹5,000.00 automated limit, I have created a pending refund request (RFD-9001) and escalated your case to our support team for human review. Note: this is a simulated demo refund.',
          metadata: {
            toolsUsed: ['get_order_details', 'search_return_policy', 'validate_refund_request', 'escalate_to_human'],
            refundNumber: 'RFD-9001'
          }
        }
      ]
    });

    const refund1 = await prisma.refund.create({
      data: {
        refundNumber: 'RFD-9001',
        orderId: ord1006.id,
        ticketId: t1.ticket.id,
        requestedById: priya.id,
        amount: '6800.00',
        reason: 'Defective motor rattling out of the box',
        status: RefundStatus.PENDING_REVIEW,
        idempotencyKey: 'seed-rfd-9001'
      }
    });

    await prisma.escalation.create({
      data: {
        ticketId: t1.ticket.id,
        refundId: refund1.id,
        summary: 'High-value refund request (₹6,800.00 > ₹5,000 threshold) for defective espresso grinder on ORD-1006.',
        priority: TicketPriority.HIGH,
        decision: EscalationDecision.PENDING,
        assignedToId: supportMaya.id
      }
    });

    await prisma.internalNote.create({
      data: {
        ticketId: t1.ticket.id,
        authorId: supportMaya.id,
        content: 'Checked batch serial log — two units from this lot had loose burr collars. Safe to approve once confirmed.'
      }
    });

    await prisma.auditEvent.create({
      data: {
        actorId: priya.id,
        ticketId: t1.ticket.id,
        refundId: refund1.id,
        eventType: 'REFUND_ESCALATED',
        details: { amount: '6800.00', threshold: '5000.00', orderNumber: 'ORD-1006' }
      }
    });
  }

  // Ticket 2: Escalated high-value refund (> ₹5,000) for Kabir (ORD-1009)
  const t2 = await ensureTicket({
    ticketNumber: 'TKT-2042',
    customerId: kabir.id,
    orderId: ord1009.id,
    subject: 'Damaged brass lamp shade & dock flickering on ORD-1009',
    description: 'Both items in ORD-1009 arrived with transit damage. Please process a refund of ₹8,500.00.',
    category: TicketCategory.PRODUCT_QUALITY,
    status: TicketStatus.ESCALATED,
    priority: TicketPriority.URGENT,
    assignedToId: supportRohan.id
  });

  if (t2.created) {
    await prisma.message.createMany({
      data: [
        {
          ticketId: t2.ticket.id,
          senderType: MessageSenderType.CUSTOMER,
          senderUserId: kabir.id,
          visibility: MessageVisibility.PUBLIC,
          content: 'Both items in ORD-1009 arrived with transit damage. Please process a refund of ₹8,500.00.'
        },
        {
          ticketId: t2.ticket.id,
          senderType: MessageSenderType.AI,
          visibility: MessageVisibility.PUBLIC,
          content:
            'I checked ORD-1009 (delivered 1 day ago). Your ₹8,500.00 refund request is eligible under our 14-day return policy, and because it exceeds ₹5,000.00, it has been queued as RFD-9002 for urgent human review.',
          metadata: {
            toolsUsed: ['get_order_details', 'validate_refund_request', 'escalate_to_human'],
            refundNumber: 'RFD-9002'
          }
        }
      ]
    });

    const refund2 = await prisma.refund.create({
      data: {
        refundNumber: 'RFD-9002',
        orderId: ord1009.id,
        ticketId: t2.ticket.id,
        requestedById: kabir.id,
        amount: '8500.00',
        reason: 'Transit damage reported on delivery',
        status: RefundStatus.PENDING_REVIEW,
        idempotencyKey: 'seed-rfd-9002'
      }
    });

    await prisma.escalation.create({
      data: {
        ticketId: t2.ticket.id,
        refundId: refund2.id,
        summary: 'Urgent transit damage claim on ORD-1009 totaling ₹8,500.00 (exceeds ₹5,000 auto-limit).',
        priority: TicketPriority.URGENT,
        decision: EscalationDecision.PENDING,
        assignedToId: supportRohan.id
      }
    });

    await prisma.auditEvent.create({
      data: {
        actorId: kabir.id,
        ticketId: t2.ticket.id,
        refundId: refund2.id,
        eventType: 'REFUND_ESCALATED',
        details: { amount: '8500.00', orderNumber: 'ORD-1009' }
      }
    });
  }

  // Ticket 3: Open ticket for Aarav (ORD-1001 — eligible for <= 5000 test)
  const t3 = await ensureTicket({
    ticketNumber: 'TKT-2043',
    customerId: aarav.id,
    orderId: ord1001.id,
    subject: 'Left earbud ANC hiss on AeroBuds',
    description: 'My AeroBuds from ORD-1001 have a constant static hiss in the left ear when transparency mode is off.',
    category: TicketCategory.PRODUCT_QUALITY,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    assignedToId: null
  });

  if (t3.created) {
    await prisma.message.createMany({
      data: [
        {
          ticketId: t3.ticket.id,
          senderType: MessageSenderType.CUSTOMER,
          senderUserId: aarav.id,
          visibility: MessageVisibility.PUBLIC,
          content: 'My AeroBuds from ORD-1001 have a constant static hiss in the left ear when transparency mode is off.'
        },
        {
          ticketId: t3.ticket.id,
          senderType: MessageSenderType.AI,
          visibility: MessageVisibility.PUBLIC,
          content:
            'I am sorry to hear about the static hiss on your AeroBuds (ORD-1001). Your order was delivered 4 days ago, so it is well within our 14-day return window. Would you like troubleshooting steps or would you like me to process a simulated refund of ₹3,299.00 (excluding the ₹99.00 shipping fee)?',
          metadata: { toolsUsed: ['get_order_details', 'search_return_policy'] }
        }
      ]
    });
  }

  // Ticket 4: Waiting for customer (Aarav — shipping inquiry ORD-1005)
  const t4 = await ensureTicket({
    ticketNumber: 'TKT-2044',
    customerId: aarav.id,
    orderId: ord1005.id,
    subject: 'Delivery ETA for Merino Wool Overshirt',
    description: 'ORD-1005 shows shipped since Tuesday. Can you share an update?',
    category: TicketCategory.ORDER_DELIVERY,
    status: TicketStatus.WAITING_FOR_CUSTOMER,
    priority: TicketPriority.LOW,
    assignedToId: supportMaya.id
  });

  if (t4.created) {
    await prisma.message.createMany({
      data: [
        {
          ticketId: t4.ticket.id,
          senderType: MessageSenderType.CUSTOMER,
          senderUserId: aarav.id,
          visibility: MessageVisibility.PUBLIC,
          content: 'ORD-1005 shows shipped since Tuesday. Can you share an update?'
        },
        {
          ticketId: t4.ticket.id,
          senderType: MessageSenderType.STAFF,
          senderUserId: supportMaya.id,
          visibility: MessageVisibility.PUBLIC,
          content: 'Hi Aarav, carrier tracking indicates ORD-1005 cleared the regional hub this morning. Let us know if you need the delivery address updated.'
        }
      ]
    });
  }

  // Ticket 5: Resolved with completed simulated refund (Priya — ORD-1008)
  const t5 = await ensureTicket({
    ticketNumber: 'TKT-2045',
    customerId: priya.id,
    orderId: ord1008.id,
    subject: 'Wrong switch variant delivered on keyboard',
    description: 'Ordered tactile switches on ORD-1008, received linear switches instead. Requesting refund.',
    category: TicketCategory.REFUND_RETURN,
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.MEDIUM,
    assignedToId: supportMaya.id,
    resolvedAt: daysAgo(2)
  });

  if (t5.created) {
    await prisma.message.createMany({
      data: [
        {
          ticketId: t5.ticket.id,
          senderType: MessageSenderType.CUSTOMER,
          senderUserId: priya.id,
          visibility: MessageVisibility.PUBLIC,
          content: 'Ordered tactile switches on ORD-1008, received linear switches instead. Requesting refund.'
        },
        {
          ticketId: t5.ticket.id,
          senderType: MessageSenderType.AI,
          visibility: MessageVisibility.PUBLIC,
          content:
            'Your refund request for ORD-1008 (₹4,800.00, excluding ₹99.00 shipping) passed all policy checks and was processed via our simulated demo refund service (Ref: SIM-TXN-8841A2C0).',
          metadata: {
            toolsUsed: ['get_order_details', 'validate_refund_request', 'process_refund'],
            refundNumber: 'RFD-9003',
            simulated: true
          }
        }
      ]
    });

    const refund3 = await prisma.refund.create({
      data: {
        refundNumber: 'RFD-9003',
        orderId: ord1008.id,
        ticketId: t5.ticket.id,
        requestedById: priya.id,
        reviewedById: admin.id,
        amount: '4800.00',
        reason: 'Incorrect switch variant fulfilled',
        status: RefundStatus.COMPLETED,
        simulatedTxnRef: 'SIM-TXN-8841A2C0',
        idempotencyKey: 'seed-rfd-9003',
        completedAt: daysAgo(2)
      }
    });

    await prisma.auditEvent.create({
      data: {
        actorId: priya.id,
        ticketId: t5.ticket.id,
        refundId: refund3.id,
        eventType: 'REFUND_SIMULATED_COMPLETED',
        details: { amount: '4800.00', simulatedTxnRef: 'SIM-TXN-8841A2C0' }
      }
    });
  }

  // Ticket 6: Closed with rejected refund (Kabir — ORD-1010 expired + perishable)
  const t6 = await ensureTicket({
    ticketNumber: 'TKT-2046',
    customerId: kabir.id,
    orderId: ord1010.id,
    subject: 'Refund request for coffee beans ORD-1010',
    description: 'I did not like the roast profile on ORD-1010, can I get a refund?',
    category: TicketCategory.REFUND_RETURN,
    status: TicketStatus.CLOSED,
    priority: TicketPriority.LOW,
    assignedToId: supportRohan.id,
    resolvedAt: daysAgo(3)
  });

  if (t6.created) {
    await prisma.message.createMany({
      data: [
        {
          ticketId: t6.ticket.id,
          senderType: MessageSenderType.CUSTOMER,
          senderUserId: kabir.id,
          visibility: MessageVisibility.PUBLIC,
          content: 'I did not like the roast profile on ORD-1010, can I get a refund?'
        },
        {
          ticketId: t6.ticket.id,
          senderType: MessageSenderType.STAFF,
          senderUserId: supportRohan.id,
          visibility: MessageVisibility.PUBLIC,
          content:
            'Hi Kabir, ORD-1010 is ineligible for a refund because single-origin coffee beans fall under the non-returnable Perishable Goods category and the 14-day return window has passed.'
        }
      ]
    });

    const refund4 = await prisma.refund.create({
      data: {
        refundNumber: 'RFD-9004',
        orderId: ord1010.id,
        ticketId: t6.ticket.id,
        requestedById: kabir.id,
        reviewedById: supportRohan.id,
        amount: '1250.00',
        reason: 'Preference mismatch on roast profile',
        status: RefundStatus.REJECTED,
        reviewComment: 'Perishable item category is non-returnable and order exceeded 14-day return window.',
        idempotencyKey: 'seed-rfd-9004',
        reviewedAt: daysAgo(3)
      }
    });

    await prisma.auditEvent.create({
      data: {
        actorId: supportRohan.id,
        ticketId: t6.ticket.id,
        refundId: refund4.id,
        eventType: 'REFUND_REJECTED',
        details: { reason: 'Non-returnable perishable + expired window' }
      }
    });
  }

  // Ticket 7: In-progress ticket (Priya — personalized item question ORD-1007)
  const t7 = await ensureTicket({
    ticketNumber: 'TKT-2047',
    customerId: priya.id,
    orderId: ord1007.id,
    subject: 'Care instructions for monogrammed leather sleeve',
    description: 'Do you recommend conditioning balm on the monogrammed leather folio from ORD-1007?',
    category: TicketCategory.OTHER,
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.LOW,
    assignedToId: supportMaya.id
  });

  if (t7.created) {
    await prisma.message.create({
      data: {
        ticketId: t7.ticket.id,
        senderType: MessageSenderType.CUSTOMER,
        senderUserId: priya.id,
        visibility: MessageVisibility.PUBLIC,
        content: 'Do you recommend conditioning balm on the monogrammed leather folio from ORD-1007?'
      }
    });
  }

  // Ticket 8: Open billing question without linked order (Aarav)
  const t8 = await ensureTicket({
    ticketNumber: 'TKT-2048',
    customerId: aarav.id,
    orderId: ord1003.id,
    subject: 'Invoice GST breakdown for Pour-Over Kettle',
    description: 'Need a copy of the GST tax summary for order ORD-1003.',
    category: TicketCategory.PAYMENT_BILLING,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    assignedToId: null
  });

  if (t8.created) {
    await prisma.message.create({
      data: {
        ticketId: t8.ticket.id,
        senderType: MessageSenderType.CUSTOMER,
        senderUserId: aarav.id,
        visibility: MessageVisibility.PUBLIC,
        content: 'Need a copy of the GST tax summary for order ORD-1003.'
      }
    });
  }

  console.log('Seed completed cleanly.');
  console.log('Seeded accounts:');
  console.log(' - Admin:    admin@kestrelcare.demo');
  console.log(' - Support:  maya.support@kestrelcare.demo, rohan.support@kestrelcare.demo');
  console.log(' - Customer: aarav.sharma@example.com, priya.nair@example.com, kabir.mehta@example.com');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
