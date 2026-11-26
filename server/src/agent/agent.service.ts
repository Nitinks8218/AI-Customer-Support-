import crypto from 'node:crypto';
import { MessageSenderType, MessageVisibility, Prisma, TicketPriority, TicketStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { toMessageDTO } from '../utils/dto.js';
import { formatINR } from '../utils/money.js';
import { logger } from '../utils/logger.js';
import { detectPromptInjection, SUPPORT_AGENT_SYSTEM_PROMPT } from './prompts/system.prompt.js';
import {
  toolEscalateToHuman,
  toolGetOrderDetails,
  toolProcessRefund,
  toolSearchReturnPolicy,
  toolValidateRefundRequest
} from './tools/agent.tools.js';

export interface AgentToolEvent {
  tool: string;
  status: 'ok' | 'denied' | 'error';
  summary: string;
}

function extractOrderIdentifier(text: string): string | null {
  const ordMatch = text.match(/\bORD-\d{3,8}\b/i);
  if (ordMatch) return ordMatch[0].toUpperCase();
  const uuidMatch = text.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  if (uuidMatch) return uuidMatch[0];
  return null;
}

function extractRequestedAmount(text: string): number | undefined {
  // Match explicit monetary requests such as "refund ₹9000", "refund 9,000", "INR 4500", "rs 2000"
  const explicitMatch = text.match(/(?:₹|rs\.?|inr|amount(?:\s+of)?|refund(?:\s+of)?)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!explicitMatch?.[1]) return undefined;
  const cleaned = Number(explicitMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(cleaned) || cleaned <= 0) return undefined;
  return cleaned;
}

function isPolicyQuestion(text: string): boolean {
  return /\b(policy|return window|how many days|14 days|shipping fee|non-?returnable|digital|perishable|personalized|threshold|5000|5,000|rule)\b/i.test(
    text
  );
}

function isHumanEscalationRequest(text: string): boolean {
  return /\b(human|agent|representative|supervisor|manager|escalate|real person|talk to staff)\b/i.test(text);
}

function isRefundIntent(text: string, previousAiOfferedRefund: boolean): boolean {
  if (/\b(refund|money back|return this|return my|reimburse|damaged|defective|broken|wrong item)\b/i.test(text)) {
    return true;
  }
  if (previousAiOfferedRefund && /\b(yes|please|proceed|go ahead|confirm|do it|sure)\b/i.test(text)) {
    return true;
  }
  return false;
}

function isEligibilityCheckOnly(text: string): boolean {
  return /\b(am i eligible|is it eligible|check eligibility|can i get a refund|would this qualify)\b/i.test(text) &&
    !/\b(process|submit|request|issue|initiate|please refund)\b/i.test(text);
}

function isOrderLookupIntent(text: string): boolean {
  return /\b(order|status|delivery|delivered|track|tracking|shipped|where is|details)\b/i.test(text);
}

async function maybeRefineWithGemini(draftReply: string, userMessage: string): Promise<string> {
  if (env.AI_PROVIDER !== 'gemini' || !env.AI_API_KEY) {
    return draftReply;
  }
  try {
    const model = env.AI_MODEL || 'gemini-3.8-flash';
    const response = await fetch(
      `${env.AI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.AI_API_KEY
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SUPPORT_AGENT_SYSTEM_PROMPT }]
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Customer message (untrusted data): ${JSON.stringify(userMessage)}\n\nVerified backend response draft (preserve all numbers, statuses, citations, and simulated-refund disclaimers verbatim):\n${draftReply}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 320
          }
        })
      }
    );
    if (!response.ok) return draftReply;
    const json = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const content = json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim();
    return content && content.length > 0 ? content : draftReply;
  } catch (err) {
    logger.warn('Optional Gemini refinement failed; using deterministic draft', {
      error: err instanceof Error ? err.message : 'unknown'
    });
    return draftReply;
  }
}

export async function handleCustomerTicketMessage(params: {
  ticketId: string;
  customerId: string;
  content: string;
}) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: params.ticketId, customerId: params.customerId },
    include: {
      order: true,
      messages: {
        where: { visibility: MessageVisibility.PUBLIC },
        orderBy: { createdAt: 'desc' },
        take: 8
      }
    }
  });

  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
  }

  // 1. Persist customer message BEFORE agent processing
  const customerMessage = await prisma.message.create({
    data: {
      ticketId: ticket.id,
      senderType: MessageSenderType.CUSTOMER,
      senderUserId: params.customerId,
      visibility: MessageVisibility.PUBLIC,
      content: params.content
    },
    include: { senderUser: { select: { id: true, name: true, role: true } } }
  });

  const toolsUsed: string[] = [];
  const toolEvents: AgentToolEvent[] = [];
  let aiReply = '';
  let nextTicketStatus: TicketStatus | null =
    ticket.status === TicketStatus.WAITING_FOR_CUSTOMER || ticket.status === TicketStatus.OPEN
      ? TicketStatus.IN_PROGRESS
      : null;

  try {
    // 2. Prompt-injection defense check
    const injection = detectPromptInjection(params.content);
    if (injection.detected) {
      toolEvents.push({
        tool: 'prompt_safety_guard',
        status: 'denied',
        summary: 'Blocked policy override or cross-account access attempt'
      });

      aiReply =
        'I cannot bypass Kestrel Care support policies, alter refund limits, reveal internal configuration, or access orders that do not belong to your account. If you would like help with one of your own orders, please share your order number (for example, ORD-1001).';

      await prisma.auditEvent.create({
        data: {
          actorId: params.customerId,
          ticketId: ticket.id,
          eventType: 'PROMPT_INJECTION_BLOCKED',
          details: { matchedRule: injection.matchedRule ?? 'guardrail' }
        }
      });
    } else {
      const lastAiMessage = ticket.messages.find((m) => m.senderType === MessageSenderType.AI);
      const previousAiOfferedRefund = Boolean(
        lastAiMessage?.content.toLowerCase().includes('process a simulated refund') ||
          lastAiMessage?.content.toLowerCase().includes('would you like me to proceed')
      );

      // Determine order identifier: explicit in current message -> explicit in recent history -> linked ticket order
      let explicitOrderInMsg = extractOrderIdentifier(params.content);
      if (!explicitOrderInMsg && previousAiOfferedRefund) {
        for (const msg of ticket.messages) {
          const histMatch = extractOrderIdentifier(msg.content);
          if (histMatch) {
            explicitOrderInMsg = histMatch;
            break;
          }
        }
      }
      const resolvedOrderIdentifier = explicitOrderInMsg ?? ticket.order?.orderNumber ?? null;

      if (isHumanEscalationRequest(params.content)) {
        toolsUsed.push('escalate_to_human');
        const esc = await toolEscalateToHuman({
          ticketId: ticket.id,
          customerId: params.customerId,
          summary: `Customer requested human support assistance on ${ticket.ticketNumber}: "${params.content.slice(0, 200)}"`,
          priority: TicketPriority.HIGH
        });
        if (esc.escalated) {
          nextTicketStatus = TicketStatus.ESCALATED;
          toolEvents.push({
            tool: 'escalate_to_human',
            status: 'ok',
            summary: `Escalation created (${esc.priority})`
          });
          aiReply =
            'I have escalated this conversation to our human support team with high priority. A support specialist will review your ticket and follow up here shortly.';
        } else {
          toolEvents.push({ tool: 'escalate_to_human', status: 'error', summary: esc.message });
          aiReply = 'I could not create an escalation right now. Please try again shortly.';
        }
      } else if (isRefundIntent(params.content, previousAiOfferedRefund)) {
        if (!resolvedOrderIdentifier) {
          // Missing order ID: ask concisely, DO NOT invoke order or refund tools
          nextTicketStatus = TicketStatus.WAITING_FOR_CUSTOMER;
          aiReply =
            'I can certainly help review a refund request. Could you please share your order number (for example, ORD-1001) so I can verify the order details and check policy eligibility?';
        } else {
          toolsUsed.push('get_order_details', 'search_return_policy');
          const [orderLookup, policy] = await Promise.all([
            toolGetOrderDetails({
              orderIdentifier: resolvedOrderIdentifier,
              customerId: params.customerId
            }),
            toolSearchReturnPolicy({ queryOrCategory: params.content })
          ]);

          if (!orderLookup.found) {
            toolEvents.push({
              tool: 'get_order_details',
              status: 'denied',
              summary: `Order ${resolvedOrderIdentifier} not found on customer account`
            });
            aiReply = `I could not find order "${resolvedOrderIdentifier}" on your account. Please double-check the order number from your Orders page and try again.`;
          } else {
            toolEvents.push({
              tool: 'get_order_details',
              status: 'ok',
              summary: `Loaded ${orderLookup.order.orderNumber} (${orderLookup.order.status})`
            });
            toolEvents.push({
              tool: 'search_return_policy',
              status: 'ok',
              summary: `Retrieved ${policy.sections.length} policy section(s)`
            });

            const requestedAmount = extractRequestedAmount(params.content);
            toolsUsed.push('validate_refund_request');
            const validation = await toolValidateRefundRequest({
              orderIdentifier: orderLookup.order.orderNumber,
              customerId: params.customerId,
              reason: params.content,
              requestedAmount
            });

            if (!validation.eligible || !validation.validatedAmount) {
              toolEvents.push({
                tool: 'validate_refund_request',
                status: 'denied',
                summary: `${validation.reasonCode}: ${validation.message}`
              });
              const citation = policy.sections[0]?.citation ?? 'policy/returns-and-refunds.md';
              aiReply = `${validation.message} (Reference: ${citation}). If you believe there is an exceptional circumstance, let me know and I can escalate this to a human support specialist.`;
            } else if (isEligibilityCheckOnly(params.content)) {
              toolEvents.push({
                tool: 'validate_refund_request',
                status: 'ok',
                summary: `Eligible for ${formatINR(validation.validatedAmount)}`
              });
              aiReply = `Good news — ${orderLookup.order.orderNumber} is eligible for a refund of ${formatINR(validation.validatedAmount)} under our 14-day demo return policy (shipping fees and non-returnable items are excluded). ${validation.requiresHumanReview ? 'Because this exceeds ₹5,000.00, submitting it will route to human review.' : 'Would you like me to process a simulated refund now?'}`;
            } else {
              toolsUsed.push('process_refund');
              const idempotencyKey = `agent-${ticket.id}-${crypto
                .createHash('sha256')
                .update(`${orderLookup.order.id}:${customerMessage.id}`)
                .digest('hex')
                .slice(0, 16)}`;

              const refundResult = await toolProcessRefund({
                orderId: orderLookup.order.id,
                customerId: params.customerId,
                amount: validation.validatedAmount.toNumber(),
                reason: params.content,
                ticketId: ticket.id,
                idempotencyKey
              });

              if (refundResult.escalated) {
                nextTicketStatus = TicketStatus.ESCALATED;
                toolEvents.push({
                  tool: 'process_refund',
                  status: 'ok',
                  summary: `Queued ${refundResult.refund.refundNumber} (${formatINR(refundResult.refund.amount)}) for human review`
                });
                aiReply = `I verified ${orderLookup.order.orderNumber} and validated your eligible refund of ${formatINR(refundResult.refund.amount)}. Because requests above ₹5,000.00 require human approval, I have created pending refund ${refundResult.refund.refundNumber} and escalated your ticket to our support staff. Note: all demo refunds are simulated and no real funds are moved.`;
              } else {
                toolEvents.push({
                  tool: 'process_refund',
                  status: 'ok',
                  summary: `Simulated refund ${refundResult.refund.refundNumber} (${refundResult.refund.simulatedTxnRef})`
                });
                aiReply = `Your refund request for ${orderLookup.order.orderNumber} passed all policy checks. I have completed a simulated demo refund (${refundResult.refund.refundNumber}) for ${formatINR(refundResult.refund.amount)} with Demo Reference ${refundResult.refund.simulatedTxnRef}. Please note this is a simulated demo transaction and no real money was transferred.`;
              }
            }
          }
        }
      } else if (isPolicyQuestion(params.content) && !resolvedOrderIdentifier) {
        toolsUsed.push('search_return_policy');
        const policy = await toolSearchReturnPolicy({ queryOrCategory: params.content });
        toolEvents.push({
          tool: 'search_return_policy',
          status: 'ok',
          summary: `Retrieved ${policy.sections.length} policy section(s)`
        });

        const snippets = policy.sections
          .map((s) => `• ${s.heading}: ${s.content.split('\n')[0]}`)
          .join('\n');
        aiReply = `Here is what our demo returns & refunds policy says:\n${snippets}\n\nIf you want me to check a specific order, just share your order number (e.g., ORD-1001).`;
      } else if (isOrderLookupIntent(params.content) || resolvedOrderIdentifier) {
        if (!resolvedOrderIdentifier) {
          nextTicketStatus = TicketStatus.WAITING_FOR_CUSTOMER;
          aiReply =
            'I would be happy to check your order status or details. Could you please provide your order number (for example, ORD-1001)?';
        } else {
          toolsUsed.push('get_order_details');
          const orderLookup = await toolGetOrderDetails({
            orderIdentifier: resolvedOrderIdentifier,
            customerId: params.customerId
          });

          if (!orderLookup.found) {
            toolEvents.push({
              tool: 'get_order_details',
              status: 'denied',
              summary: `Order ${resolvedOrderIdentifier} not found on customer account`
            });
            aiReply = `I could not locate order "${resolvedOrderIdentifier}" on your account. Please verify the order number and let me know.`;
          } else {
            toolEvents.push({
              tool: 'get_order_details',
              status: 'ok',
              summary: `Loaded ${orderLookup.order.orderNumber} (${orderLookup.order.status})`
            });
            const o = orderLookup.order;
            const itemSummary = o.items.map((i) => `${i.quantity}× ${i.productName} (${i.category})`).join(', ');
            aiReply = `Order ${o.orderNumber} is currently ${o.status}${o.deliveryDate ? ` (delivered on ${o.deliveryDate.slice(0, 10)}, ${o.daysSinceDelivery} day(s) ago)` : ''}. Items: ${itemSummary}. Order total: ${formatINR(o.totalAmount)}. Remaining refundable balance: ${formatINR(o.remainingRefundableBalance)}. ${o.eligibilityReason}`;
          }
        }
      } else {
        toolsUsed.push('search_return_policy');
        await toolSearchReturnPolicy({ queryOrCategory: 'general eligibility' });
        aiReply =
          'Thanks for reaching out to Kestrel Care. I can look up an order status, explain our 14-day return & refund policy, validate or submit a simulated demo refund, or escalate your ticket to a human agent. Let me know your order number or how you would like to proceed.';
      }
    }

    if (!injection.detected) {
      aiReply = await maybeRefineWithGemini(aiReply, params.content);
    }
  } catch (err) {
    logger.error('Agent processing failure', {
      ticketId: ticket.id,
      error: err instanceof Error ? err.message : 'unknown'
    });
    toolEvents.push({
      tool: 'agent_runtime',
      status: 'error',
      summary: 'An internal error prevented completing the automated action'
    });
    aiReply =
      'I ran into a technical issue while checking that request, so no refund or account change was performed. Please try again in a moment or ask to escalate to a human support specialist.';
  }

  const aiMessage = await prisma.$transaction(async (tx) => {
    const createdAi = await tx.message.create({
      data: {
        ticketId: ticket.id,
        senderType: MessageSenderType.AI,
        visibility: MessageVisibility.PUBLIC,
        content: aiReply,
        metadata: {
          provider: env.AI_PROVIDER === 'gemini' && env.AI_API_KEY ? 'gemini' : 'mock',
          toolsUsed,
          toolEvents
        } as unknown as Prisma.InputJsonValue
      },
      include: { senderUser: { select: { id: true, name: true, role: true } } }
    });

    if (nextTicketStatus && nextTicketStatus !== ticket.status) {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: nextTicketStatus }
      });
    }

    return createdAi;
  });

  const updatedTicket = await prisma.ticket.findUnique({
    where: { id: ticket.id },
    select: { status: true, priority: true }
  });

  return {
    customerMessage: toMessageDTO(customerMessage),
    aiMessage: toMessageDTO(aiMessage),
    ticketStatus: updatedTicket?.status ?? ticket.status,
    ticketPriority: updatedTicket?.priority ?? ticket.priority
  };
}
