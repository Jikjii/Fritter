# Fritter playbook: porting Payout to otaku, weebs and cosplayers

Payout (Connor's class-action discovery app) went $0 → $20k/month in 50 days with three tabs,
a long emotional onboarding and a weekly/yearly paywall. Fritter keeps every one of those
structures and swaps the catalog and the voice for anime, gaming, merch, convention and cosplay
fans. This document is the "why" behind the code; `docs/DATA_MODEL.md` is the "what".

## 1. The structures Payout got right, and where each lives in Fritter

| Payout structure / incentive | Why it works | Fritter implementation |
| --- | --- | --- |
| **Core desire: make money** ("free money you're owed") | People pay for an app that pays them back; the value prop is obvious in one sentence | *Find the settlement checks, credits and refunds you may be owed as a fan.* Discover tab header shows "you may be owed up to $X" from `estimateOwed()` |
| **Curated list of things you already qualify for** | Discovery is the product; the user does no research | `src/content/catalog.json` (24 seed items) + remote feed (`EXPO_PUBLIC_CATALOG_URL`) ranked by `evaluateEligibility()` against the quiz answers |
| **Detail → "Get started / fill form"** | Removes the friction that stops 90% of people from filing | `opportunity/[id]` → `claim/[id]` (prefilled from profile) → `form/[id]` (PDF via expo-print, share, copy) |
| **Wallet tab** | The running total is the emotional anchor; it earns yearly retention | `(tabs)/wallet.tsx`: potential / pending / paid, status lifecycle, growth chart, deadline reminders |
| **Forms tab** | Proof of submission; reuse for sibling claims | `(tabs)/forms.tsx` + stored HTML so PDFs regenerate |
| **Extensive onboarding (90% of users only ever see this)** | Emotion → personalization → "scientific" charts → social proof → notifications → paywall | `src/content/onboarding.ts` (17 screens, data-driven) rendered by `onboarding/[step].tsx` |
| **Personalization questions** | Answers make the paywall feel earned and feed the eligibility engine | 9 `profileKey`s (`fanType`, `country`, `services`, `amazonClaimNotice`, `shops`, `purchases`, `conMishaps`, `payMethods`, `hadFacebookPublicProfile`) |
| **Charts / graphs** | Feels researched, not scammy | "What fans actually got paid" bar chart of documented per-person maximums, each with a source link; category bars on the reveal |
| **Social proof** | Trust before the paywall | Sourced facts only (`SOCIAL_FACTS`); testimonials array is empty until real, permissioned quotes exist |
| **Notifications ask** | Re-engagement when deadlines approach | Pre-permission screen, local reminders 3 days before a real `claim_deadline`; hearing dates never trigger "closes soon" |
| **Weekly + yearly paywall, yearly pushed** | Yearly has the highest LTV | `paywall.tsx`: yearly preselected with trial + savings badge; weekly shown smaller; zero-match variant sells the Watchlist |
| **RevenueCat + Mixpanel** | Price tests and a measurable funnel | `services/purchases.ts`, `services/analytics.ts` (mock/console fallbacks so Expo Go and CI work) |
| **Ship simple: 1–3 features** | Onboarding pulls the weight | Bounty Board (Discover → Detail → Claim Kit), Wallet, Forms. Nothing else. |
| **Creator-led UGC → paid ads** | Trust transfer from creators already in the niche | Section 5 below |

## 2. Product decision

A three-concept judge panel (growth marketer, solo Expo dev, consumer-protection lawyer) scored:

| Concept | Angle | Score (of 150) |
| --- | --- | --- |
| **money-owed** (winner) | Literal port: settlements, refunds, credits for fans | 110 |
| cosplayer-first | Con-life claims: flights, lost prop bags, ghosted commissions | 100 |
| collector-cashout | "Your shelf is worth $X" + settlements | 96 |

The synthesis took the winner and grafted the runner-up's evergreen con-life lane, because a
settlement-only feed is a museum between settlement bursts. The catalog therefore has three lanes:

1. **Settlements & regulator refunds** (PSN credit, Google Play, Amazon Prime FTC, plus closed
   history like Crunchyroll 2023 and pending Watchlist cases like Hot Topic and Nintendo).
2. **Con-life statutory rights** (US DOT baggage cap $4,700, DOT cash refunds, EU/UK 261, PayPal
   and Etsy buyer protection).
3. **Refund and chargeback templates** (cancelled con badges, late figure preorders, Steam, eBay,
   Amazon A-to-z).

**Name.** The panel recommends **Lootback** for the store listing ("Loot" is native vocabulary,
"back" says refund), with **OtakuOwed** as the A/B alternative. The codebase keeps **Fritter**
(repo name) as the working name; renaming is `app.json` + the `Fritter` string in copy.

## 3. Honesty rules (enforced in code, not policy)

Payout's business is trust. One invented settlement is existential. Fritter's rules live in
`src/domain/estimate.ts` and are unit-tested against the real seed catalog:

- A dollar figure renders only on `verified_current` items younger than `VERIFICATION_TTL_DAYS`
  (60). Anything older shows "Needs re-check"; unverified items show "Amount TBD" and a banner.
- `watching` items (lawsuit filed, no claims process) always render **"$0 today"** with a scam
  warning and an "Alert me" button. They are never summed.
- The headline total sums only **cash or credit** items that are verified, open and matched.
  "What you paid" refunds, statutory caps (baggage, EU261) and non-cash repairs (Joy-Con) are
  counted and shown but never summed.
- Closed items stay in the feed as "You missed this" history, excluded from every total.
- Every item carries `sourceUrl`, `updatedAt`, `confidenceNote`; every detail screen has a
  "Report a wrong deadline or amount" link; `hidden: true` is a remote kill switch.
- Settlement claim forms require an un-pre-ticked attestation; every generated document carries
  a "not legal advice / not a law firm" footer; onboarding requires an 18+ confirmation.

## 4. Onboarding script (why each screen exists)

| # | Screen | Beat |
| --- | --- | --- |
| 1 | `hook_1` Crunchyroll settled for $16M; fans who filed got ~$30 | Emotion: a company everyone in the niche pays |
| 2 | `hook_2` "You paid for the sub, the figures, the badge, the flight" + three sourced stat cards | Show the incentive; every number sourced |
| 3–11 | Questions (fan type, country, services, Amazon notice, shops, purchases, con mishaps, pay methods, Facebook) | Personalization; each answer is a `profileKey` the rules read. Country comes early so US-only rules can evaluate. The Facebook question teaches the VPPA mechanism (users love the "why") |
| 12 | Identity + 18+ | Name for the forms; adults only |
| 13 | Scanning loader | "Scientific" beat; program count is derived from the live catalog, never hard-coded |
| 14 | Reveal: "You match N programs. K are paying up to $X right now" + top 3 cards (blurred amounts) | Personalized, honest; refunds and Watchlist counted separately |
| 15 | Chart: what fans actually got paid (OPEN/AUTOMATIC/CLOSED tags) | Proof that the money is real |
| 16 | Social proof: three sourced facts | Trust |
| 17 | Notifications | Deadline alerts |
| 18 | Paywall (yearly pushed, trial, zero-match variant) | Conversion |

## 5. Growth playbook (creator UGC → paid ads)

1. **Creator niches**, one per format, then repeat the winning format with 5–10 more:
   anime-news TikTokers who posted "Crunchyroll owes you $30" in 2023; con-vlog cosplayers
   (20k–300k) with con-prep and "my flight got cancelled on the way to AX" storytimes; figure
   unboxing / "preorder hell" creators; cosplayers who stream (Twitch AI case, commission scams);
   gaming-lawsuit explainer channels (The Crew, PSN).
2. **Deal structure**: flat fee + promo code (RevenueCat promo offers) + whitelisting rights so
   every winner becomes a paid-ads creative. Every script carries #ad / paid-partnership
   disclosure (FTC Endorsement Guides). Refund screenshots are redacted before posting.
3. **Five hook scripts** (selfie cam, no branding in the first 3 seconds):
   - "If you had Crunchyroll in 2023 you were owed $30 and most of you never got it. They're being
     sued again. This time I'm not missing it." → Watchlist card, "$0 today", Alert me.
   - "Delta lost my wig bag on the way to Anime Expo. Airlines are liable up to $4,700 on domestic
     flights." → Claim Kit inventory. Payoff video when the check lands.
   - "POV: the commissioner you paid $400 in March blocked you in June. Don't cry, dispute." →
     PayPal 180-day window in the Wallet.
   - "If you shopped at Hot Topic before October 2024 your data was in a 57M-record breach.
     No settlement yet, and hottopicclassaction.com is a different case, so don't fall for
     copycats. This pings me the day real claims open."
   - "Sony is putting up to $33 of PlayStation Store credit in your account automatically. Here's
     how to check whether yours landed."
4. **Paid ads** only once a format has proven organic performance. No Meta/TikTok SDK in the
   binary (it is a privacy-settlement app): SKAdNetwork + promo-code attribution only.
5. **Organic loop**: Wallet share card ("I got $X back from con life") and the "Fritter paid my
   badge" challenge where users post the refund email (redacted).

## 6. Monetization

- Entitlement `pro` gates: every card beyond the first two open ones, amounts, the Claim Kit,
  reminders. Free users can browse, see Watchlist items, and save to the wallet.
- Yearly $29.99 with a 3-day trial is preselected ("about $2.50 a month, less than one settlement
  check"); weekly $4.99. Test $29.99 vs $39.99 yearly and trial vs no-trial in RevenueCat.
- Funnel events (`src/services/analytics.ts`): onboarding step → paywall view → plan selected →
  purchase. Never send PII.

## 7. Launch checklist

- [ ] **Human-verify every catalog item** against the official administrator, agency or policy
      page, set `verifiedBy`, refresh `updatedAt`. The seed was researched by AI agents with web
      search on 2026-09-17; that is not a substitute. Remove or keep flagged anything unverified
      (`npm run catalog:validate` lists them).
- [ ] Replace `example.com` Terms / Privacy URLs and `EXPO_PUBLIC_SUPPORT_EMAIL`.
- [ ] Real, permissioned testimonials in `SOCIAL_PROOF` (or leave empty).
- [ ] RevenueCat products, entitlement, offering; Mixpanel token; catalog feed URL.
- [ ] App Store: 17+ rating or age gate, privacy labels (no tracking), 3.1.2 subscription
      disclosures (already on the paywall), screenshots that show "$0 today" honestly.
- [ ] Legal review of the five letter templates in `src/domain/documents.ts`.
- [ ] Icon, splash and store screenshots (Figma), replacing the Expo placeholders in `assets/`.

## 8. What is deliberately not built yet

Server-side push for Watchlist transitions (needs a backend keyed on catalog status changes),
receipt attachments in the Claim Kit, per-region template variants beyond US/EU, a Next.js
marketing site, and the collector "shelf value" feature from the losing concept.
