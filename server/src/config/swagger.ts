export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Kestrel Care — AI Customer Support & Refund API',
    version: '1.0.0',
    description:
      'REST API for the Kestrel Care e-commerce customer support platform. Includes authentication, customer orders/tickets/AI chat, simulated refund processing with ₹5,000 escalation threshold, and staff operations.'
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'kestrel_token'
      }
    },
    schemas: {
      ErrorEnvelope: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Readable message' },
              details: { type: 'object' }
            }
          }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Health and DB connectivity check',
        tags: ['Utility'],
        security: [],
        responses: { '200': { description: 'Service healthy' }, '503': { description: 'DB unavailable' } }
      }
    },
    '/agent/status': {
      get: {
        summary: 'Report configured AI provider mode without exposing secrets',
        tags: ['AI'],
        security: [],
        responses: { '200': { description: 'Agent status' } }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register a customer account',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Neha Verma' },
                  email: { type: 'string', example: 'neha@example.com' },
                  password: { type: 'string', example: 'SecurePass@123' }
                }
              }
            }
          }
        },
        responses: { '201': { description: 'Registered' }, '409': { description: 'Email exists' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Sign in and receive JWT cookie + token',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'aarav.sharma@example.com' },
                  password: { type: 'string', example: 'Customer@123' }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Authenticated' }, '401': { description: 'Invalid credentials' } }
      }
    },
    '/auth/logout': {
      post: { summary: 'Invalidate current JWT and clear cookie', tags: ['Auth'], responses: { '200': { description: 'Logged out' } } }
    },
    '/auth/me': {
      get: { summary: 'Current user profile', tags: ['Auth'], responses: { '200': { description: 'Profile' } } }
    },
    '/dashboard': {
      get: { summary: 'Customer dashboard summary', tags: ['Customer'], responses: { '200': { description: 'Summary' } } }
    },
    '/orders': {
      get: { summary: 'List own orders (paginated)', tags: ['Customer'], responses: { '200': { description: 'Orders list' } } }
    },
    '/orders/{orderId}': {
      get: { summary: 'Get own order details with server-computed refund eligibility', tags: ['Customer'], responses: { '200': { description: 'Order detail' }, '404': { description: 'Not found' } } }
    },
    '/tickets': {
      get: { summary: 'List own tickets', tags: ['Customer'], responses: { '200': { description: 'Tickets list' } } },
      post: { summary: 'Create support ticket', tags: ['Customer'], responses: { '201': { description: 'Created' } } }
    },
    '/tickets/{ticketId}': {
      get: { summary: 'Get own ticket and public messages', tags: ['Customer'], responses: { '200': { description: 'Ticket detail' } } }
    },
    '/tickets/{ticketId}/messages': {
      get: { summary: 'Get public messages for own ticket', tags: ['Customer'], responses: { '200': { description: 'Messages' } } },
      post: { summary: 'Post customer message and invoke AI support agent', tags: ['Customer', 'AI'], responses: { '201': { description: 'Persisted messages' } } }
    },
    '/refunds': {
      get: { summary: 'List own refunds', tags: ['Customer'], responses: { '200': { description: 'Refunds list' } } },
      post: { summary: 'Submit refund request (idempotent, server validated)', tags: ['Customer'], responses: { '201': { description: 'Created' }, '422': { description: 'Policy ineligible' } } }
    },
    '/refunds/{refundId}': {
      get: { summary: 'Get own refund detail', tags: ['Customer'], responses: { '200': { description: 'Refund detail' } } }
    },
    '/staff/dashboard': {
      get: { summary: 'Staff overview KPIs and queue', tags: ['Staff'], responses: { '200': { description: 'Staff dashboard' } } }
    },
    '/staff/tickets': {
      get: { summary: 'Paginated filterable staff ticket queue', tags: ['Staff'], responses: { '200': { description: 'Ticket queue' } } }
    },
    '/staff/tickets/{ticketId}': {
      get: { summary: 'Full ticket context including internal notes and audit log', tags: ['Staff'], responses: { '200': { description: 'Ticket detail' } } },
      patch: { summary: 'Update ticket status/priority/assignee or add public reply', tags: ['Staff'], responses: { '200': { description: 'Updated' } } }
    },
    '/staff/tickets/{ticketId}/notes': {
      post: { summary: 'Add staff-only internal note', tags: ['Staff'], responses: { '201': { description: 'Note added' } } }
    },
    '/staff/refunds': {
      get: { summary: 'List refunds queue', tags: ['Staff'], responses: { '200': { description: 'Refunds queue' } } }
    },
    '/staff/refunds/{refundId}': {
      get: { summary: 'Staff refund detail', tags: ['Staff'], responses: { '200': { description: 'Refund detail' } } }
    },
    '/staff/refunds/{refundId}/decision': {
      post: { summary: 'Approve, reject, or request more info on refund', tags: ['Staff'], responses: { '200': { description: 'Decision recorded' } } }
    },
    '/staff/escalations': {
      get: { summary: 'List escalations queue', tags: ['Staff'], responses: { '200': { description: 'Escalations queue' } } }
    },
    '/staff/escalations/{escalationId}': {
      get: { summary: 'Escalation detail', tags: ['Staff'], responses: { '200': { description: 'Escalation detail' } } }
    },
    '/staff/escalations/{escalationId}/decision': {
      post: { summary: 'Submit escalation review decision', tags: ['Staff'], responses: { '200': { description: 'Decision recorded' } } }
    },
    '/staff/users': {
      get: { summary: 'Admin-only user list', tags: ['Admin'], responses: { '200': { description: 'Users list' }, '403': { description: 'Forbidden' } } }
    }
  }
};
