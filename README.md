# Kestrel Care — AI Customer Support & Refund Platform

A full-stack e-commerce customer support and simulated refund operations platform built with React, TypeScript, Tailwind CSS, Node.js, Express, Prisma, and PostgreSQL.

> **Demo Simulation Notice:** All orders, return policies, and refunds in this repository are simulated for local demonstration. No real money, payment processor, or shipping carrier is connected.

## Tech Stack
- **Frontend (`client/`):** React 19, Vite, TypeScript (strict), Tailwind CSS, React Router, TanStack Query, Lucide Icons, Zod.
- **Backend (`server/`):** Node.js, Express, TypeScript (strict), Prisma ORM, PostgreSQL, Zod, bcrypt, JWT (`httpOnly` cookie + Bearer header + DB token revocation), Helmet, CORS, express-rate-limit, Swagger/OpenAPI.
- **AI Support Agent:** Provider-agnostic service defaulting to a deterministic local policy agent (`AI_PROVIDER=mock`, zero API keys required) with an optional Google Gemini refinement adapter (`AI_PROVIDER=gemini`).

## Prerequisites
- **Option 1 (Recommended — Docker):** Docker & Docker Compose
- **Option 2 (Local Node.js):** Node.js `>= 20`, npm `>= 10`, and a PostgreSQL `16+` database (e.g., Neon or local PostgreSQL).

## Environment Setup
Copy `.env.example` files before running locally without Docker:
```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
```
Update `JWT_SECRET` in `.env` / `server/.env` to a long random string before any non-local deployment.

## Running with Docker Compose
```bash
docker compose up --build
```
Services started:
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:4000/api/v1`
- **Swagger / OpenAPI Docs:** `http://localhost:4000/api/docs`
- **PostgreSQL:** `localhost:5432`

To stop containers:
```bash
docker compose down
```
To wipe local database volumes (destructive):
```bash
docker compose down -v
```

## Running Locally Without Docker
1. Install workspace dependencies:
   ```bash
   npm install
   ```
2. Configure `DATABASE_URL` in `server/.env` (for example, your Neon or local PostgreSQL connection string).
3. Run database migrations and idempotent demo seed:
   ```bash
   npx --workspace=server prisma migrate deploy
   npm --workspace=server run db:seed
   ```
4. Start both backend and frontend in dev mode:
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - API: `http://localhost:4000/api/v1`
   - Swagger UI: `http://localhost:4000/api/docs`

## Local Demo Credentials
> **Local demo accounts only.** Never reuse these credentials in production.

| Role | Name | Email | Password |
| --- | --- | --- | --- |
| Customer | Aarav Sharma | `aarav.sharma@example.com` | `Customer@123` |
| Customer | Priya Nair | `priya.nair@example.com` | `Customer@123` |
| Customer | Kabir Mehta | `kabir.mehta@example.com` | `Customer@123` |
| Support Agent | Maya Deshmukh | `maya.support@kestrelcare.demo` | `Staff@1234` |
| Support Agent | Rohan Kulkarni | `rohan.support@kestrelcare.demo` | `Staff@1234` |
| Admin | Vikram Rao | `admin@kestrelcare.demo` | `Admin@1234` |

## Switching AI Provider
- **Default (`mock`):** Set `AI_PROVIDER=mock` (no `AI_API_KEY` needed). Uses deterministic intent routing, `policy/returns-and-refunds.md` section retrieval, prompt-injection filtering, and strict server-side tool execution.
- **Optional Google Gemini provider:** Set `AI_PROVIDER=gemini`, `AI_API_KEY=<your-gemini-api-key>`, and `AI_MODEL=gemini-3.8-flash` in `server/.env` (if `AI_API_KEY` is omitted, it safely falls back to `mock`). Even in `gemini` mode, tool allowlists, order ownership, refund eligibility, and the ₹5,000 escalation threshold remain strictly enforced by backend domain services.

## Build, Lint & Tests
```bash
npm run build
npm run lint
npm test
```
Note: Server integration tests run against the configured `DATABASE_URL` PostgreSQL database (make sure PostgreSQL is running and migrated/seeded first).

## Documentation & Diagrams
- Architecture Diagram: [docs/architecture.md](docs/architecture.md)
- Entity Relationship Diagram: [docs/erd.md](docs/erd.md)
- API Reference: [docs/api.md](docs/api.md)
- Demo Return & Refund Policy: [policy/returns-and-refunds.md](policy/returns-and-refunds.md)

## 5-Minute Demo Walkthrough Checklist
1. Open `http://localhost:5173` and sign in as `aarav.sharma@example.com` (`Customer@123`).
2. Inspect **Orders**: verify `ORD-1001` (eligible, ≤ ₹5,000), `ORD-1002` (eligible, > ₹5,000), `ORD-1003` (expired 14-day window), and `ORD-1004` (non-returnable digital).
3. Open **Support Tickets → Create Ticket** without selecting an order, send `"I want a refund"`, and verify Kestrel AI asks for an order number without calling order/refund tools.
4. Reply with `"Please refund ORD-1001 because of static hiss"` and observe the simulated refund (`COMPLETED`, `SIM-TXN-...`) and backend tool activity badges.
5. Open `ORD-1002` (₹24,500) and request a refund — verify it enters `PENDING_REVIEW` and creates an escalation.
6. Sign out and sign in as staff (`maya.support@kestrelcare.demo` / `Staff@1234`), open **Escalations**, inspect the case, add a private internal note, and **Approve** or **Reject** with a required reason.
