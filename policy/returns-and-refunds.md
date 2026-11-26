# Kestrel Care — Demo Returns, Refunds & Escalation Policy

> **DEMO POLICY NOTICE:** This document defines the simulated demo rules for the Kestrel Care local support application. No real financial transactions, payment rails, or physical returns are processed.

## 1. General Eligibility
- Refunds and returns are considered **only for orders with status `DELIVERED`**.
- Orders that are `PLACED`, `PROCESSING`, `SHIPPED`, or `CANCELLED` are not eligible for a post-delivery refund (cancelled orders are already voided at checkout in this demo).
- The customer requesting the refund **must be the authenticated owner** of the order. Requests for another person's or friend's order are strictly denied.

## 2. Standard Return Window (14 Calendar Days)
- Eligible delivered items may be returned or refunded within **14 calendar days from the delivery date (inclusive)**.
- Convention: `days_since_delivery = floor((request_utc_date - delivery_utc_date) / 86400s)`. Requests with `days_since_delivery <= 14` are within the return window; `days_since_delivery > 14` are **expired** and automatically ineligible.

## 3. Returnable vs. Non-Returnable Categories
- **Returnable categories:** `ELECTRONICS`, `APPAREL`, `HOME_LIVING`, `ACCESSORIES`, `BOOKS_PRINT`.
- **Non-returnable categories:**
  - `DIGITAL` — digital downloads, software licenses, and e-books cannot be refunded once delivered.
  - `PERISHABLE` — perishable food, beverages, and fresh consumables cannot be returned for safety reasons.
  - `PERSONALIZED` — custom-engraved, monogrammed, or made-to-order items are final sale.
- If an order contains a mix of returnable and non-returnable items, only the eligible returnable item line totals qualify for refund calculation.

## 4. Refund Amount & Shipping Fee Rules
- **Currency:** All demo orders and refunds are denominated in Indian Rupees (`INR`, `₹`).
- **Maximum refundable amount:** Cannot exceed the eligible returnable item total minus any previously approved, processing, pending, or completed refunds on the same order (`remaining_refundable_balance`).
- **Shipping fees:** Standard shipping fees (default `₹99.00` when applicable, or tracked per order) are **excluded from refundable amounts** under the standard demo policy unless an explicit staff escalation exception is approved.
- **Explicit amount requests:** If a customer requests a specific amount exceeding the remaining refundable balance, the request is rejected with a clear explanation (amounts are never silently clamped without explanation).

## 5. Automated vs. Human-Review Threshold (₹5,000)
- **₹5,000 or less (`amount <= 5000.00 INR`):** Eligible requests pass automated backend validation and are immediately routed to the **simulated refund processor**, creating a single `COMPLETED` simulated demo refund record (subject to idempotency protection).
- **Above ₹5,000 (`amount > 5000.00 INR`):** Eligible high-value refund requests **cannot be auto-processed**. The backend creates a `PENDING_REVIEW` refund record, creates an `Escalation` case (`PENDING`), and moves the support ticket to `ESCALATED` for human support staff review.

## 6. Human Review & Escalation Process
- Support agents and admins review pending escalations with full order, conversation, and policy context.
- Allowed staff decisions: `APPROVED`, `REJECTED`, or `MORE_INFO` (requesting additional details from the customer).
- Every staff decision requires a written reason/comment and is recorded in the immutable audit log.
- Approving an escalated refund revalidates order ownership, delivery status, remaining refundable balance, and policy rules at the moment of approval before simulating completion.

## 7. Order Verification & Prompt Safety
- An explicit order identifier (e.g., `ORD-1001`) is required before looking up order data or validating a refund. If omitted, the assistant asks the customer for the order number first.
- All refund calculations, thresholds, and access checks are enforced exclusively by backend services. Customer messages cannot alter policy thresholds, override non-returnable exclusions, or access another customer's account.
