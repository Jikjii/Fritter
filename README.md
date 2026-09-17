# Fritter

**Find the settlement checks, credits and refunds you may be owed as an anime, gaming, merch and
cosplay fan. Fill the claim in three taps. Never miss a deadline.**

Fritter ports the structure and incentives of *Payout* (class-action discovery, $0 → $20k/mo in
50 days) to otaku, weebs and cosplayers. Same three tabs, same long emotional onboarding, same
weekly/yearly paywall, different catalog and voice. Read
[`docs/PLAYBOOK.md`](docs/PLAYBOOK.md) for the mapping and the growth plan.

| Tab | What it does |
| --- | --- |
| **Discover** | Ranked feed of payout opportunities (settlements, refunds, con & travel rights, commission disputes) matched to your onboarding answers, with honest OPEN / AUTOMATIC / WATCHING / CLOSED badges |
| **Wallet** | Every claim you are chasing: potential, pending, paid, deadline countdowns and reminders |
| **Forms** | Every claim form or letter Fritter generated for you, exportable as PDF |

## Stack

Expo SDK 57 (React Native, expo-router, TypeScript), Zustand + AsyncStorage, RevenueCat
(`react-native-purchases`), Mixpanel (adapter), expo-notifications, expo-print, GitHub Actions.

## Run

```bash
npm install
npm start            # then press i / a / w
```

No env vars needed for development: purchases are mocked, analytics log to the console, the
bundled catalog is used. See [`docs/SETUP.md`](docs/SETUP.md) for RevenueCat, Mixpanel, the
remote catalog feed and store submission notes.

## Checks (same as CI)

```bash
npm run typecheck
npm run lint -- --max-warnings=0
npm run catalog:validate
npm test
```

## Project layout

```
src/app/                 expo-router routes: onboarding/[step], (tabs)/, opportunity/[id], claim/[id], form/[id], paywall
src/content/             catalog.json (seed opportunities), onboarding.ts (script), paywall.ts, social-proof.ts
src/domain/              types, eligibility engine, owed estimate + honesty rules, claim lifecycle, form templates (unit-tested)
src/store/               persisted app store
src/services/            purchases (RevenueCat), analytics (Mixpanel), notifications, documents (PDF), catalog feed
src/components/          UI kit, charts, opportunity card
docs/                    PLAYBOOK.md, DATA_MODEL.md, SETUP.md
scripts/validate-catalog.js   CI guard: schema + every rule key/value exists as an onboarding question/option
```

## Honesty rules

Fritter never invents settlements. Amounts render only on verified, recently reviewed items;
lawsuits with no claims process show **"$0 today"**; refunds show "what you paid"; closed
programs are history, not bait. The rules are code (`src/domain/estimate.ts`) and are tested
against the real seed catalog. **The seed catalog was researched by AI agents with web search
on 2026-09-17 and must be human-verified before launch.** Fritter is not a law firm and does
not provide legal advice.
