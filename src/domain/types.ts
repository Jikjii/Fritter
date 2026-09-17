/**
 * Fritter domain model.
 *
 * Designed before any screen was written (per the Payout playbook: "design your data
 * structures first"). See docs/DATA_MODEL.md for prose + JSON samples of every type here.
 */

/** Where the money comes from. Categories drive filtering, icons, and the estimate chart. */
export type OpportunityCategory =
  | 'settlement' // class-action / regulatory settlements (streaming, games, retailers, breaches)
  | 'refund' // refund & credit programs (digital library migrations, cancelled preorders, price drops)
  | 'convention' // con badge / event refunds and transfers
  | 'travel' // flight / hotel compensation for con trips (delays, cancellations, lost props)
  | 'commission' // undelivered cosplay commission disputes and chargebacks
  | 'rewards'; // forgotten loyalty credits, unclaimed rewards, store credit

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [
  'settlement',
  'refund',
  'convention',
  'travel',
  'commission',
  'rewards',
];

export type ClaimMethod = 'online_form' | 'mail_form' | 'email' | 'in_app_request' | 'automatic';

/**
 * Honesty label for every catalog entry. The app must never present an
 * 'illustrative' or 'plausible_unverified' item as a sure thing.
 */
export type Confidence =
  | 'verified_current' // a human confirmed it is open as of `updatedAt`
  | 'verified_past' // real, but the claim window has closed (kept for social proof / history)
  | 'plausible_unverified' // likely real, not yet confirmed by a human
  | 'illustrative'; // example content — must be replaced or verified before launch

export type RuleOperator = 'equals' | 'includes' | 'gte' | 'lte' | 'truthy';

/** One eligibility requirement, evaluated against the user's profile. */
export interface EligibilityRule {
  /** A key on UserProfile that an onboarding question sets, e.g. "services". */
  profileKey: string;
  operator: RuleOperator;
  value: string | number | boolean;
  /** Human-readable requirement shown in the checklist, e.g. "Had a Crunchyroll account". */
  label?: string;
}

export type FormTemplateId =
  | 'settlement_claim'
  | 'refund_request'
  | 'con_refund_request'
  | 'travel_compensation'
  | 'commission_dispute'
  | 'generic_request';

export type FormFieldType = 'text' | 'email' | 'date' | 'number' | 'multiline' | 'select';

/** An extra input the claim form needs beyond the base identity fields. */
export interface FormFieldSpec {
  key: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  helpText?: string;
}

/** A single "payout opportunity" in the Discover feed. */
export interface Opportunity {
  id: string;
  title: string;
  company: string;
  category: OpportunityCategory;
  /** 1–2 sentences: what happened and why money is available. */
  summary: string;
  /** Plain-English eligibility description shown on the detail screen. */
  whoQualifies: string;
  eligibility: EligibilityRule[];
  estimatedPayoutMin: number;
  estimatedPayoutMax: number;
  /** ISO date (YYYY-MM-DD), or "rolling" (no deadline), or "unknown". */
  deadline: string;
  proofRequired: string;
  claimMethod: ClaimMethod;
  sourceUrl?: string;
  confidence: Confidence;
  confidenceNote: string;
  formTemplateId: FormTemplateId;
  /** ISO date the entry was last reviewed by a human. */
  updatedAt: string;
  tags?: string[];
  extraFields?: FormFieldSpec[];
  /** Postal address for mail-in claims. */
  mailingAddress?: string;
  /** Email address for email claims. */
  claimEmail?: string;
  /** Direct URL of the official claim form, when one exists. */
  claimUrl?: string;
}

export type ProfileValue = string | number | boolean | string[];

/**
 * Everything we know about the user. Identity fields feed generated forms;
 * every other key is set by an onboarding question (its `profileKey`).
 */
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  [key: string]: ProfileValue | undefined;
}

export type ClaimStatus = 'saved' | 'in_progress' | 'submitted' | 'paid' | 'rejected' | 'expired';

export const CLAIM_STATUSES: ClaimStatus[] = [
  'saved',
  'in_progress',
  'submitted',
  'paid',
  'rejected',
  'expired',
];

/** A claim the user is pursuing. Lives in the Wallet tab. */
export interface Claim {
  id: string;
  opportunityId: string;
  status: ClaimStatus;
  /** Midpoint estimate captured when the claim was created. */
  estimatedPayout: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  paidAmount?: number;
  /** The most recent generated form for this claim. */
  formId?: string;
  notes?: string;
  /** expo-notifications identifier for the deadline reminder, if scheduled. */
  reminderId?: string;
}

/** A filled form the app generated. Lives in the Forms tab. */
export interface GeneratedForm {
  id: string;
  claimId: string;
  opportunityId: string;
  templateId: FormTemplateId;
  title: string;
  /** Every field the user filled, keyed by field key. */
  fields: Record<string, string>;
  /** Rendered HTML (what expo-print turns into a PDF). */
  html: string;
  createdAt: string;
  /** Local file URI once a PDF was produced. */
  fileUri?: string;
}

export type EligibilityStatus = 'likely' | 'possible' | 'unlikely' | 'unknown';

export interface EligibilityResult {
  status: EligibilityStatus;
  matched: number;
  total: number;
  /** Rules that evaluated to false. */
  unmet: EligibilityRule[];
  /** Rules whose profile key has no answer yet. */
  unanswered: EligibilityRule[];
}

export interface OwedEstimate {
  /** Headline number: midpoint of every likely + possible item. */
  total: number;
  /** Conservative: sum of minimums for likely items only. */
  low: number;
  /** Optimistic: sum of maximums for likely + possible items. */
  high: number;
  likelyCount: number;
  possibleCount: number;
  byCategory: Record<OpportunityCategory, number>;
}

/* ----------------------------- Onboarding content ----------------------------- */

export type OnboardingScreenType =
  | 'hook' // emotional statement + CTA
  | 'question' // single-select, sets profileKey
  | 'multiQuestion' // multi-select, sets profileKey to string[]
  | 'reveal' // "you may be owed $X" with chart
  | 'socialProof' // testimonials / stats
  | 'chart' // a graph screen (scientific feel)
  | 'loading' // fake "scanning" progress
  | 'identity' // name / email capture for forms
  | 'notifications' // permission ask
  | 'paywall';

export interface OnboardingOption {
  label: string;
  value: string;
  emoji?: string;
}

export interface OnboardingScreen {
  id: string;
  type: OnboardingScreenType;
  title: string;
  subtitle?: string;
  /** For question / multiQuestion screens. */
  profileKey?: string;
  options?: OnboardingOption[];
  /** Primary button label. */
  cta?: string;
  /** Free-form guidance for the renderer (e.g. which chart). */
  notes?: string;
}

/** A testimonial or stat used on social-proof screens and the paywall. */
export interface SocialProofItem {
  name: string;
  handle?: string;
  quote: string;
  amount?: number;
  avatarEmoji?: string;
}
