# Kestrel Care — REST API Documentation

Base URL: `/api/v1`

Interactive OpenAPI/Swagger UI is served by the backend at:
- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/docs.json`

## Envelope Format
- **Success:** `{ "data": ..., "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 } }`
- **Error:** `{ "error": { "code": "ERROR_CODE", "message": "Readable explanation", "details": {} } }`

## Key Endpoints
- `GET /health` — database connectivity check
- `GET /agent/status` — reports `mock` or `gemini` mode and allowlisted tools
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET /dashboard`, `GET /orders`, `GET /orders/:orderId`
- `GET /tickets`, `POST /tickets`, `GET /tickets/:ticketId`, `GET /tickets/:ticketId/messages`, `POST /tickets/:ticketId/messages`
- `GET /refunds`, `GET /refunds/:refundId`, `POST /refunds`
- `GET /staff/dashboard`, `GET /staff/tickets`, `GET /staff/tickets/:ticketId`, `PATCH /staff/tickets/:ticketId`, `POST /staff/tickets/:ticketId/notes`
- `GET /staff/refunds`, `GET /staff/refunds/:refundId`, `POST /staff/refunds/:refundId/decision`
- `GET /staff/escalations`, `GET /staff/escalations/:escalationId`, `POST /staff/escalations/:escalationId/decision`
- `GET /staff/users`, `PATCH /staff/users/:userId` (`ADMIN` only)
