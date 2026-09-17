/**
 * Analytics adapter. Mixpanel when EXPO_PUBLIC_MIXPANEL_TOKEN is set (see docs/SETUP.md),
 * otherwise a console logger in dev and a no-op in production.
 *
 * Every screen and every onboarding step fires an event so paywall conversion and
 * onboarding drop-off can be measured — this is the metric the whole playbook optimizes.
 */
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export interface Analytics {
  init(): Promise<void>;
  track(event: string, props?: AnalyticsProps): void;
  identify(userId: string, traits?: AnalyticsProps): void;
  screen(name: string, props?: AnalyticsProps): void;
}

const TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

class ConsoleAnalytics implements Analytics {
  async init() {}
  track(event: string, props?: AnalyticsProps) {
    if (__DEV__) console.log(`[analytics] ${event}`, props ?? '');
  }
  identify(userId: string, traits?: AnalyticsProps) {
    if (__DEV__) console.log(`[analytics] identify ${userId}`, traits ?? '');
  }
  screen(name: string, props?: AnalyticsProps) {
    this.track('screen_view', { name, ...props });
  }
}

class MixpanelAnalytics implements Analytics {
  private mp: { track: (e: string, p?: AnalyticsProps) => void; identify: (id: string) => void; getPeople: () => { set: (p: AnalyticsProps) => void }; init: () => Promise<void> } | null = null;

  async init() {
    try {
      // Loaded lazily so the app runs without the native module (Expo Go, web, tests).
      const mod = require('mixpanel-react-native') as { Mixpanel: new (token: string, trackAutomaticEvents: boolean) => any };
      const instance = new mod.Mixpanel(TOKEN as string, false);
      await instance.init();
      this.mp = instance;
    } catch (err) {
      if (__DEV__) console.warn('[analytics] Mixpanel unavailable, falling back to console', err);
    }
  }
  track(event: string, props?: AnalyticsProps) {
    if (this.mp) this.mp.track(event, props);
    else new ConsoleAnalytics().track(event, props);
  }
  identify(userId: string, traits?: AnalyticsProps) {
    if (!this.mp) return;
    this.mp.identify(userId);
    if (traits) this.mp.getPeople().set(traits);
  }
  screen(name: string, props?: AnalyticsProps) {
    this.track('screen_view', { name, ...props });
  }
}

export const analytics: Analytics = TOKEN ? new MixpanelAnalytics() : new ConsoleAnalytics();

/** Event names used across the app — keep them here so dashboards stay consistent. */
export const Events = {
  onboardingStep: 'onboarding_step_viewed',
  onboardingAnswer: 'onboarding_answered',
  onboardingComplete: 'onboarding_completed',
  paywallViewed: 'paywall_viewed',
  paywallPlanSelected: 'paywall_plan_selected',
  purchaseStarted: 'purchase_started',
  purchaseSucceeded: 'purchase_succeeded',
  purchaseFailed: 'purchase_failed',
  purchaseRestored: 'purchase_restored',
  paywallDismissed: 'paywall_dismissed',
  opportunityViewed: 'opportunity_viewed',
  claimStarted: 'claim_started',
  formGenerated: 'form_generated',
  formShared: 'form_shared',
  claimStatusChanged: 'claim_status_changed',
  notificationsPrompted: 'notifications_prompted',
  notificationsGranted: 'notifications_granted',
} as const;
