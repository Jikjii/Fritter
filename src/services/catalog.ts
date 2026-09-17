/**
 * Catalog feed. Ships with the bundled seed (src/content/catalog.json) and, when
 * EXPO_PUBLIC_CATALOG_URL is set, refreshes from a remote JSON document with the same shape.
 * Remote items replace bundled ones by id, so the feed can be updated without an app release
 * (Payout's core operational loop: keep the list fresh, keep users coming back).
 */
import seed from '@/content/catalog.json';
import { OPPORTUNITY_CATEGORIES, type Opportunity } from '@/domain/types';

const REMOTE_URL = process.env.EXPO_PUBLIC_CATALOG_URL;

const CONFIDENCE = new Set([
  'verified_current',
  'verified_past',
  'plausible_unverified',
  'illustrative',
]);
const METHODS = new Set(['online_form', 'mail_form', 'email', 'in_app_request', 'automatic']);
const PAYOUT_KINDS = new Set(['cash', 'credit', 'equals_paid', 'statutory_cap', 'non_cash']);
const STATUSES = new Set(['open', 'watching', 'closed']);
const TEMPLATES = new Set([
  'settlement_claim',
  'refund_request',
  'con_refund_request',
  'travel_compensation',
  'commission_dispute',
  'generic_request',
]);

/** Returns a list of problems; empty means valid. Shared with scripts/validate-catalog.js. */
export function validateOpportunity(o: any, index = 0): string[] {
  const p: string[] = [];
  const where = `item[${index}]${o?.id ? ` (${o.id})` : ''}`;
  if (!o || typeof o !== 'object') return [`${where}: not an object`];
  for (const k of [
    'id',
    'title',
    'company',
    'summary',
    'whoQualifies',
    'proofRequired',
    'confidenceNote',
    'updatedAt',
    'deadline',
  ]) {
    if (typeof o[k] !== 'string' || !o[k].trim()) p.push(`${where}: missing string "${k}"`);
  }
  if (!OPPORTUNITY_CATEGORIES.includes(o.category))
    p.push(`${where}: bad category "${o.category}"`);
  if (!CONFIDENCE.has(o.confidence)) p.push(`${where}: bad confidence "${o.confidence}"`);
  if (!METHODS.has(o.claimMethod)) p.push(`${where}: bad claimMethod "${o.claimMethod}"`);
  if (!TEMPLATES.has(o.formTemplateId))
    p.push(`${where}: bad formTemplateId "${o.formTemplateId}"`);
  if (!PAYOUT_KINDS.has(o.payoutKind)) p.push(`${where}: bad payoutKind "${o.payoutKind}"`);
  if (o.status !== undefined && !STATUSES.has(o.status))
    p.push(`${where}: bad status "${o.status}"`);
  if (typeof o.estimatedPayoutMin !== 'number' || typeof o.estimatedPayoutMax !== 'number') {
    p.push(`${where}: estimatedPayoutMin/Max must be numbers`);
  } else if (o.estimatedPayoutMin > o.estimatedPayoutMax || o.estimatedPayoutMin < 0) {
    p.push(`${where}: estimatedPayoutMin must be 0 <= min <= max`);
  }
  if (!Array.isArray(o.eligibility)) p.push(`${where}: eligibility must be an array`);
  else {
    o.eligibility.forEach((r: any, i: number) => {
      if (typeof r?.profileKey !== 'string')
        p.push(`${where}: eligibility[${i}] missing profileKey`);
      if (
        ![
          'equals',
          'in',
          'includes',
          'includesAny',
          'notIncludes',
          'gte',
          'lte',
          'truthy',
        ].includes(r?.operator)
      )
        p.push(`${where}: eligibility[${i}] bad operator`);
      if (r?.value === undefined) p.push(`${where}: eligibility[${i}] missing value`);
    });
  }
  if (
    o.deadline &&
    o.deadline !== 'rolling' &&
    o.deadline !== 'unknown' &&
    !/^\d{4}-\d{2}-\d{2}$/.test(o.deadline)
  ) {
    p.push(`${where}: deadline must be YYYY-MM-DD, "rolling" or "unknown"`);
  }
  return p;
}

export function getBundledCatalog(): Opportunity[] {
  return (seed as Opportunity[]).filter((o) => !o.hidden);
}

export async function fetchRemoteCatalog(url = REMOTE_URL): Promise<Opportunity[] | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    const items: unknown[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.items)
        ? json.items
        : [];
    const valid = items.filter((o, i) => validateOpportunity(o, i).length === 0) as Opportunity[];
    return valid;
  } catch {
    return null;
  }
}

/** Merge remote over bundled by id, keeping bundled ordering for untouched items. */
export function mergeCatalog(bundled: Opportunity[], remote: Opportunity[] | null): Opportunity[] {
  if (!remote || remote.length === 0) return bundled;
  const byId = new Map(bundled.map((o) => [o.id, o]));
  for (const o of remote) byId.set(o.id, o);
  return [...byId.values()].filter((o) => !o.hidden);
}
