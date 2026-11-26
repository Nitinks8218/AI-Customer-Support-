import fs from 'node:fs/promises';
import { POLICY_FILE_PATH } from '../../config/env.js';

export interface PolicySection {
  heading: string;
  content: string;
  score: number;
  citation: string;
}

const FALLBACK_POLICY = `# Kestrel Care Demo Returns Policy
## 1. General Eligibility
Refunds apply only to DELIVERED orders owned by the requesting customer.
## 2. Standard Return Window (14 Calendar Days)
Returns are accepted within 14 calendar days (inclusive) from delivery date.
## 3. Non-Returnable Categories
DIGITAL, PERISHABLE, and PERSONALIZED items are non-returnable.
## 4. Refund Amount & Shipping Fees
Shipping fees are excluded from refundable amounts under default demo policy.
## 5. Automated vs. Human-Review Threshold (₹5,000)
Eligible refunds up to ₹5,000.00 are simulated automatically. Refunds above ₹5,000.00 require human staff approval.`;

let cachedMarkdown: string | null = null;

export async function loadPolicyMarkdown(): Promise<string> {
  if (cachedMarkdown) return cachedMarkdown;
  try {
    cachedMarkdown = await fs.readFile(POLICY_FILE_PATH, 'utf-8');
    return cachedMarkdown;
  } catch {
    return FALLBACK_POLICY;
  }
}

export function clearPolicyCache() {
  cachedMarkdown = null;
}

const SYNONYMS: Record<string, string[]> = {
  window: ['days', '14', 'deadline', 'expired', 'late', 'calendar'],
  digital: ['ebook', 'software', 'license', 'download', 'non-returnable'],
  perishable: ['food', 'coffee', 'beans', 'fresh', 'non-returnable'],
  personalized: ['monogram', 'engraved', 'custom', 'non-returnable'],
  shipping: ['fee', 'delivery', '99', 'amount', 'excluded'],
  threshold: ['5000', 'limit', 'human', 'review', 'escalation', 'escalate'],
  refund: ['return', 'money', 'eligible', 'eligibility', 'balance']
};

export async function searchReturnPolicy(queryOrCategory: string): Promise<PolicySection[]> {
  const markdown = await loadPolicyMarkdown();
  const rawSections = markdown.split(/^##\s+/m).slice(1);

  const rawTokens = queryOrCategory
    .toLowerCase()
    .replace(/[^a-z0-9\s₹]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const expandedTokens = new Set<string>(rawTokens);
  for (const token of rawTokens) {
    for (const [key, list] of Object.entries(SYNONYMS)) {
      if (token === key || list.includes(token)) {
        expandedTokens.add(key);
        for (const item of list) expandedTokens.add(item);
      }
    }
  }

  const scored: PolicySection[] = rawSections.map((block) => {
    const lines = block.trim().split('\n');
    const heading = (lines[0] ?? 'Policy Section').trim();
    const body = lines.slice(1).join('\n').trim();
    const haystack = `${heading} ${body}`.toLowerCase();

    let score = 0;
    for (const token of expandedTokens) {
      if (heading.toLowerCase().includes(token)) score += 4;
      if (haystack.includes(token)) score += 2;
    }

    return {
      heading,
      content: body,
      score,
      citation: `policy/returns-and-refunds.md — ${heading}`
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, 3);
  if (top.length > 0) return top;
  return scored.slice(0, 2);
}
