# Fritter data model

> Written before the first screen, per the Payout playbook: "design your data structures first,
> then feed the AI a text doc with JSON samples". The TypeScript source of truth is
> [`src/domain/types.ts`](../src/domain/types.ts). Keep this file and that file in sync.

Fritter has five nouns. Everything on screen is a view of one of them.

| Noun | Lives in | Mirrors in Payout |
| --- | --- | --- |
| `Opportunity` | bundled `src/content/catalog.json`, refreshed from `EXPO_PUBLIC_CATALOG_URL` | a class-action lawsuit in the list |
| `UserProfile` | store (persisted) | the answers from onboarding + the identity used on forms |
| `Claim` | store (persisted) | an entry in the Wallet tab |
| `GeneratedForm` | store (persisted) | an entry in the Forms tab |
| `OnboardingScreen` | `src/content/onboarding.ts` | one onboarding page |

## Opportunity

A single "payout" in the Discover feed. Categories are tuned for the niche: `settlement`,
`refund`, `convention`, `travel`, `commission`, `rewards`.

```json
{
  "id": "crunchyroll-vppa-2024",
  "title": "Crunchyroll video-privacy settlement",
  "company": "Crunchyroll",
  "category": "settlement",
  "summary": "Crunchyroll agreed to a $16M settlement over claims it shared subscribers' viewing data with third parties.",
  "whoQualifies": "US residents who had a Crunchyroll account and watched video during the class period.",
  "eligibility": [
    { "profileKey": "country", "operator": "equals", "value": "US", "label": "Live in the US" },
    { "profileKey": "services", "operator": "includes", "value": "crunchyroll", "label": "Had a Crunchyroll account" }
  ],
  "estimatedPayoutMin": 10,
  "estimatedPayoutMax": 30,
  "deadline": "2024-12-12",
  "proofRequired": "Account email. No receipt needed.",
  "claimMethod": "online_form",
  "claimUrl": "https://example.com/claim",
  "sourceUrl": "https://example.com/notice",
  "confidence": "verified_past",
  "confidenceNote": "Real settlement; claim window closed 2024-12-12. Kept as social proof.",
  "formTemplateId": "settlement_claim",
  "updatedAt": "2026-09-17",
  "tags": ["anime", "streaming", "privacy"]
}
```

Field notes:

- `eligibility[]` – rules evaluated against `UserProfile` by `evaluateEligibility()`.
  `profileKey` **must** be set by an onboarding question or the rule is permanently "unanswered".
  Operators: `equals`, `includes` (array contains / string equals), `gte`, `lte`
  (numbers or array length), `truthy` (`"no"`, `"none"`, `false`, `0`, `""` are falsy).
- `estimatedPayoutMin/Max` – whole USD. The app shows the range and uses the midpoint for totals.
- `deadline` – `YYYY-MM-DD`, `"rolling"` (no deadline), or `"unknown"`. Past deadlines are
  excluded from the owed estimate and shown as "Closed".
- `claimMethod` – `online_form` (open `claimUrl`), `mail_form` (generate PDF, mail to
  `mailingAddress`), `email` (generate letter, send to `claimEmail`), `in_app_request`
  (instructions), `automatic` (nothing to do; informational).
- `confidence` – honesty label. `verified_current` and `verified_past` were confirmed by a human on
  `updatedAt`. `plausible_unverified` and `illustrative` render with a "Verify before you file"
  banner. **Ship only `verified_*` items in production.**
- `formTemplateId` – picks the letter body and extra fields (`src/domain/documents.ts`).
- `extraFields[]` – opportunity-specific inputs (e.g. plan tier) added to the form.

## UserProfile

Identity fields (used to prefill forms) plus one key per onboarding question.

```json
{
  "firstName": "Rin",
  "lastName": "Tohsaka",
  "email": "rin@example.com",
  "addressLine1": "1 Fuyuki St",
  "city": "Los Angeles",
  "state": "CA",
  "postalCode": "90001",
  "country": "US",

  "fanType": ["anime", "cosplay", "figures"],
  "services": ["crunchyroll", "steam", "nintendo"],
  "consPerYear": 3,
  "travelsForCons": true,
  "commissionsBought": true,
  "spendTier": "500-2000"
}
```

Rule of thumb: every `profileKey` in the catalog appears exactly once as a question in
`src/content/onboarding.ts`. `scripts/validate-catalog.js` fails CI otherwise.

## Claim (Wallet tab)

```json
{
  "id": "clm_1",
  "opportunityId": "crunchyroll-vppa-2024",
  "status": "submitted",
  "estimatedPayout": 20,
  "createdAt": "2026-09-17T18:00:00.000Z",
  "updatedAt": "2026-09-18T09:12:00.000Z",
  "submittedAt": "2026-09-18T09:12:00.000Z",
  "formId": "frm_2",
  "reminderId": "expo-notif-id",
  "notes": "Mailed from the post office on 9/18."
}
```

Status lifecycle (`CLAIM_TRANSITIONS` in `src/domain/claims.ts`):

```
saved ──► in_progress ──► submitted ──► paid
  │            │              └──────► rejected ──► in_progress
  └──► expired ◄┘
```

Wallet totals: **potential** = saved + in_progress + submitted; **pending** = submitted;
**paid** = Σ `paidAmount` (falls back to the estimate).

## GeneratedForm (Forms tab)

```json
{
  "id": "frm_2",
  "claimId": "clm_1",
  "opportunityId": "crunchyroll-vppa-2024",
  "templateId": "settlement_claim",
  "title": "Settlement Claim Form — Crunchyroll video-privacy settlement",
  "fields": { "firstName": "Rin", "lastName": "Tohsaka", "accountIdentifier": "rin@example.com" },
  "html": "<!doctype html>…",
  "createdAt": "2026-09-18T09:10:00.000Z",
  "fileUri": "file:///…/Print/abc.pdf"
}
```

`html` is rendered by the pure function `renderFormHtml()` (unit-tested), then turned into a PDF
by `expo-print` and shared with `expo-sharing`. The HTML is stored so the PDF can be regenerated.

## OnboardingScreen

```json
{
  "id": "q-services",
  "type": "multiQuestion",
  "title": "Which of these have you ever paid for?",
  "subtitle": "Pick everything that applies — each one is a possible payout.",
  "profileKey": "services",
  "options": [
    { "label": "Crunchyroll", "value": "crunchyroll", "emoji": "🍙" },
    { "label": "Steam", "value": "steam", "emoji": "🎮" }
  ],
  "cta": "Continue"
}
```

Screen types: `hook`, `question`, `multiQuestion`, `identity`, `loading`, `chart`, `reveal`,
`socialProof`, `notifications`, `paywall`. The renderer in `src/app/onboarding/[step].tsx`
switches on `type`; the flow is fully data-driven so copy can be A/B tested without code changes.

## Derived values

- `EligibilityResult` – `{ status: likely | possible | unlikely | unknown, matched, total, unmet[], unanswered[] }`
- `OwedEstimate` – `{ total, low, high, likelyCount, possibleCount, byCategory }` — the "You may be
  owed $X" number. Only counts open, non-`verified_past` items the user is likely/possibly eligible for.
