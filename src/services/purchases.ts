/**
 * Subscription adapter around RevenueCat (react-native-purchases).
 *
 * Two plans, mirroring Payout: WEEKLY and YEARLY, with yearly pushed as the default.
 * Configure product identifiers + entitlement in RevenueCat and put the public SDK keys in
 * EXPO_PUBLIC_RC_IOS_KEY / EXPO_PUBLIC_RC_ANDROID_KEY (see docs/SETUP.md).
 *
 * Without keys (Expo Go, web, CI) a mock store is used so the full flow stays testable.
 */
import { Platform } from 'react-native';

export type PlanId = 'weekly' | 'yearly';

export interface Plan {
  id: PlanId;
  /** Localized price string from the store, e.g. "$4.99". */
  priceString: string;
  /** Price as a number for "per week" math on the paywall. */
  price: number;
  currencyCode: string;
  /** Free trial length in days, 0 when none. */
  trialDays: number;
  /** Opaque package handle passed back to purchase(). */
  packageRef: unknown;
}

export interface PurchaseResult {
  isPro: boolean;
  cancelled?: boolean;
  error?: string;
}

export interface Purchases {
  configure(appUserId?: string): Promise<void>;
  getPlans(): Promise<Plan[]>;
  purchase(plan: Plan): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
  isPro(): Promise<boolean>;
}

export const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_RC_ENTITLEMENT ?? 'pro';

const IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY;

/** Default price points (USD). RevenueCat overrides these with store prices at runtime. */
export const DEFAULT_PLANS: Plan[] = [
  {
    id: 'yearly',
    priceString: '$29.99',
    price: 29.99,
    currencyCode: 'USD',
    trialDays: 3,
    packageRef: 'mock_yearly',
  },
  {
    id: 'weekly',
    priceString: '$4.99',
    price: 4.99,
    currencyCode: 'USD',
    trialDays: 0,
    packageRef: 'mock_weekly',
  },
];

class MockPurchases implements Purchases {
  private pro = false;
  async configure() {}
  async getPlans() {
    return DEFAULT_PLANS;
  }
  async purchase(plan: Plan): Promise<PurchaseResult> {
    // Simulate store latency so loading states are visible in dev.
    await new Promise((r) => setTimeout(r, 600));
    this.pro = true;
    if (__DEV__) console.log(`[purchases] mock purchase of ${plan.id}`);
    return { isPro: true };
  }
  async restore(): Promise<PurchaseResult> {
    return { isPro: this.pro };
  }
  async isPro() {
    return this.pro;
  }
}

class RevenueCatPurchases implements Purchases {
  private rc: any = null;

  private sdk() {
    if (!this.rc) this.rc = require('react-native-purchases').default;
    return this.rc;
  }

  async configure(appUserId?: string) {
    const key = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
    if (!key) return;
    const RC = this.sdk();
    RC.setLogLevel(__DEV__ ? RC.LOG_LEVEL.DEBUG : RC.LOG_LEVEL.ERROR);
    RC.configure({ apiKey: key, appUserID: appUserId ?? null });
  }

  async getPlans(): Promise<Plan[]> {
    const RC = this.sdk();
    const offerings = await RC.getOfferings();
    const current = offerings.current;
    if (!current) return DEFAULT_PLANS;
    const plans: Plan[] = [];
    const toPlan = (pkg: any, id: PlanId): Plan => ({
      id,
      priceString: pkg.product.priceString,
      price: pkg.product.price,
      currencyCode: pkg.product.currencyCode,
      trialDays:
        pkg.product.introPrice?.periodNumberOfUnits && pkg.product.introPrice.price === 0
          ? pkg.product.introPrice.periodUnit === 'DAY'
            ? pkg.product.introPrice.periodNumberOfUnits
            : pkg.product.introPrice.periodUnit === 'WEEK'
              ? pkg.product.introPrice.periodNumberOfUnits * 7
              : 0
          : 0,
      packageRef: pkg,
    });
    if (current.annual) plans.push(toPlan(current.annual, 'yearly'));
    if (current.weekly) plans.push(toPlan(current.weekly, 'weekly'));
    return plans.length ? plans : DEFAULT_PLANS;
  }

  async purchase(plan: Plan): Promise<PurchaseResult> {
    const RC = this.sdk();
    try {
      const { customerInfo } = await RC.purchasePackage(plan.packageRef);
      return { isPro: Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]) };
    } catch (e: any) {
      if (e?.userCancelled) return { isPro: false, cancelled: true };
      return { isPro: false, error: e?.message ?? 'Purchase failed' };
    }
  }

  async restore(): Promise<PurchaseResult> {
    const RC = this.sdk();
    try {
      const info = await RC.restorePurchases();
      return { isPro: Boolean(info.entitlements.active[ENTITLEMENT_ID]) };
    } catch (e: any) {
      return { isPro: false, error: e?.message ?? 'Restore failed' };
    }
  }

  async isPro() {
    try {
      const info = await this.sdk().getCustomerInfo();
      return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
    } catch {
      return false;
    }
  }
}

const hasNativeKeys =
  Platform.OS !== 'web' && Boolean(Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY);

export const purchases: Purchases = hasNativeKeys ? new RevenueCatPurchases() : new MockPurchases();
export const isMockPurchases = !hasNativeKeys;

/** Weekly-equivalent price of a plan, used for the "just $0.58/week" anchor on the paywall. */
export function perWeek(plan: Plan): number {
  return plan.id === 'yearly' ? plan.price / 52 : plan.price;
}

/** Percent saved by choosing yearly over 52 weeks of weekly. */
export function yearlySavingsPercent(weekly: Plan | undefined, yearly: Plan | undefined): number {
  if (!weekly || !yearly) return 0;
  const weeklyYear = weekly.price * 52;
  if (weeklyYear <= 0) return 0;
  return Math.max(0, Math.round((1 - yearly.price / weeklyYear) * 100));
}
