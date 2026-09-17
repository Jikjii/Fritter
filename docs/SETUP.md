# Setup & launch checklist

Stack mirrors the Payout playbook: **Expo + TypeScript**, **RevenueCat** (subscriptions & price
testing), **Mixpanel** (funnel analytics), GitHub for CI, a static JSON feed for the catalog.

## Run it

```bash
npm install
npm start          # Expo dev server → press i / a / w
npm run typecheck  # tsc
npm run lint       # eslint (expo config)
npm test           # jest (domain logic)
npm run catalog:validate
```

Without any env vars the app runs fully in **mock mode**: purchases succeed instantly, analytics
log to the console, the bundled catalog is used. That is what Expo Go and CI use.

## Subscriptions (RevenueCat)

1. Create the app in RevenueCat, add the iOS and Android apps.
2. Create two products in App Store Connect / Play Console:
   - `fritter_weekly` — auto-renewing, 1 week
   - `fritter_yearly` — auto-renewing, 1 year, 3-day free trial (intro offer)
3. In RevenueCat: entitlement `pro`; offering `default` with packages **Annual** and **Weekly**.
4. Put the public SDK keys in `.env` (`EXPO_PUBLIC_RC_IOS_KEY`, `EXPO_PUBLIC_RC_ANDROID_KEY`).
5. `react-native-purchases` needs a development build (`npx expo run:ios` / EAS) — it does not
   work in Expo Go; the app detects that and falls back to the mock store.

Pricing defaults are in `src/services/purchases.ts` (`DEFAULT_PLANS`) and are replaced by store
prices at runtime. Use RevenueCat Experiments to price-test.

## Analytics (Mixpanel)

Install the native SDK when you are ready: `npx expo install mixpanel-react-native`, then set
`EXPO_PUBLIC_MIXPANEL_TOKEN`. Until then the adapter logs to the console. Event names are in
`src/services/analytics.ts` (`Events`). The funnel that matters:

`onboarding_step_viewed` → `paywall_viewed` → `paywall_plan_selected` → `purchase_succeeded`.

## Catalog feed

The app ships with `src/content/catalog.json`. To update the feed without a release, host a JSON
array with the same shape (see `docs/DATA_MODEL.md`) at any HTTPS URL and set
`EXPO_PUBLIC_CATALOG_URL`. Remote items replace bundled items by `id`.

**Before launch:** every item must be `verified_current` or `verified_past`, human-checked against
the official page, with `verifiedBy` and a fresh `updatedAt` (items older than 60 days hide their
amounts). Run `npm run catalog:validate`; it lists anything unverified and rejects any rule that
points at a `profileKey` or option value the onboarding does not set. Set `hidden: true` in the
remote feed to pull an item instantly.

Set `EXPO_PUBLIC_SUPPORT_EMAIL` so the "Report a wrong deadline or amount" link on every detail
screen reaches you.

## Notifications

`expo-notifications` handles the onboarding "activity notifications" ask and deadline reminders
(3 days before an opportunity closes). Push tokens are not collected; reminders are local.

## Builds

```bash
npx eas build --profile development --platform ios
npx eas build --profile production --platform all
```

Add `eas.json` with `development` / `preview` / `production` profiles (`eas build:configure`).

## App Store review notes

- The app is a discovery + document-preparation tool. Copy never promises money; the estimate
  screen says "may be owed" and every unverified item carries a banner.
- Paywall states price, billing period, trial terms and links to Terms / Privacy (Guideline 3.1.2).
- Restore Purchases is on the paywall and in Profile.
- No account is required (Guideline 5.1.1). Identity fields stay on device and only go into
  the PDF the user generates.
