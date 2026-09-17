#!/usr/bin/env node
/**
 * Validates src/content/catalog.json and cross-checks that every eligibility profileKey is set by
 * an onboarding question in src/content/onboarding.ts. Run in CI: `npm run catalog:validate`.
 *
 * Exit 1 on any problem. Warns (exit 0) about non-verified items so nobody ships them by accident.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const catalogPath = path.join(root, 'src/content/catalog.json');
const onboardingPath = path.join(root, 'src/content/onboarding.ts');

const CATEGORIES = new Set(['settlement', 'refund', 'convention', 'travel', 'commission', 'rewards']);
const CONFIDENCE = new Set(['verified_current', 'verified_past', 'plausible_unverified', 'illustrative']);
const METHODS = new Set(['online_form', 'mail_form', 'email', 'in_app_request', 'automatic']);
const TEMPLATES = new Set(['settlement_claim', 'refund_request', 'con_refund_request', 'travel_compensation', 'commission_dispute', 'generic_request']);
const OPERATORS = new Set(['equals', 'includes', 'gte', 'lte', 'truthy']);

function validateOpportunity(o, index) {
  const p = [];
  const where = `item[${index}]${o && o.id ? ` (${o.id})` : ''}`;
  if (!o || typeof o !== 'object') return [`${where}: not an object`];
  for (const k of ['id', 'title', 'company', 'summary', 'whoQualifies', 'proofRequired', 'confidenceNote', 'updatedAt', 'deadline']) {
    if (typeof o[k] !== 'string' || !o[k].trim()) p.push(`${where}: missing string "${k}"`);
  }
  if (!CATEGORIES.has(o.category)) p.push(`${where}: bad category "${o.category}"`);
  if (!CONFIDENCE.has(o.confidence)) p.push(`${where}: bad confidence "${o.confidence}"`);
  if (!METHODS.has(o.claimMethod)) p.push(`${where}: bad claimMethod "${o.claimMethod}"`);
  if (!TEMPLATES.has(o.formTemplateId)) p.push(`${where}: bad formTemplateId "${o.formTemplateId}"`);
  if (typeof o.estimatedPayoutMin !== 'number' || typeof o.estimatedPayoutMax !== 'number') {
    p.push(`${where}: estimatedPayoutMin/Max must be numbers`);
  } else if (o.estimatedPayoutMin > o.estimatedPayoutMax || o.estimatedPayoutMin < 0) {
    p.push(`${where}: need 0 <= estimatedPayoutMin <= estimatedPayoutMax`);
  }
  if (!Array.isArray(o.eligibility)) p.push(`${where}: eligibility must be an array`);
  else {
    o.eligibility.forEach((r, i) => {
      if (!r || typeof r.profileKey !== 'string') p.push(`${where}: eligibility[${i}] missing profileKey`);
      if (!r || !OPERATORS.has(r.operator)) p.push(`${where}: eligibility[${i}] bad operator`);
      if (!r || r.value === undefined) p.push(`${where}: eligibility[${i}] missing value`);
    });
  }
  if (o.deadline && o.deadline !== 'rolling' && o.deadline !== 'unknown' && !/^\d{4}-\d{2}-\d{2}$/.test(o.deadline)) {
    p.push(`${where}: deadline must be YYYY-MM-DD, "rolling" or "unknown"`);
  }
  if (o.claimMethod === 'mail_form' && !o.mailingAddress) p.push(`${where}: mail_form needs mailingAddress`);
  if (o.claimMethod === 'email' && !o.claimEmail) p.push(`${where}: email needs claimEmail`);
  if (o.claimMethod === 'online_form' && !o.claimUrl && !o.sourceUrl) p.push(`${where}: online_form needs claimUrl or sourceUrl`);
  return p;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (!Array.isArray(catalog)) {
    console.error('catalog.json must be an array');
    process.exit(1);
  }
  const problems = [];
  const ids = new Set();
  catalog.forEach((o, i) => {
    problems.push(...validateOpportunity(o, i));
    if (o && o.id) {
      if (ids.has(o.id)) problems.push(`duplicate id "${o.id}"`);
      ids.add(o.id);
    }
  });

  // Cross-check profile keys against onboarding questions.
  const IDENTITY = new Set(['firstName', 'lastName', 'email', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country']);
  let onboardingKeys = new Set();
  if (fs.existsSync(onboardingPath)) {
    const src = fs.readFileSync(onboardingPath, 'utf8');
    for (const m of src.matchAll(/profileKey:\s*['"]([A-Za-z0-9_]+)['"]/g)) onboardingKeys.add(m[1]);
  } else {
    console.warn(`warn: ${path.relative(root, onboardingPath)} not found; skipping profileKey cross-check`);
    onboardingKeys = null;
  }
  if (onboardingKeys) {
    for (const o of catalog) {
      for (const r of o.eligibility || []) {
        if (r && r.profileKey && !onboardingKeys.has(r.profileKey) && !IDENTITY.has(r.profileKey)) {
          problems.push(`${o.id}: eligibility uses profileKey "${r.profileKey}" that no onboarding question sets`);
        }
      }
    }
  }

  const unverified = catalog.filter((o) => o.confidence === 'plausible_unverified' || o.confidence === 'illustrative');
  if (unverified.length) {
    console.warn(`warn: ${unverified.length}/${catalog.length} items are not human-verified: ${unverified.map((o) => o.id).join(', ')}`);
    console.warn('      These render with a "verify before filing" banner. Verify or remove before launch.');
  }

  if (problems.length) {
    console.error(`catalog validation failed with ${problems.length} problem(s):`);
    for (const p of problems) console.error(' - ' + p);
    process.exit(1);
  }
  console.log(`catalog ok: ${catalog.length} items, ${ids.size} unique ids, ${onboardingKeys ? onboardingKeys.size : '?'} onboarding profile keys`);
}

main();
