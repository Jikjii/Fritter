/**
 * Single persisted app store (zustand + AsyncStorage).
 * Holds: onboarding progress, user profile, entitlement, claims, generated forms, catalog cache.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { canTransition, makeId, newClaim } from '@/domain/claims';
import { fieldsForOpportunity, formTitle, renderFormHtml } from '@/domain/documents';
import type { Claim, ClaimStatus, GeneratedForm, Opportunity, ProfileValue, UserProfile } from '@/domain/types';
import { getBundledCatalog, mergeCatalog } from '@/services/catalog';

export interface AppState {
  hydrated: boolean;
  onboardingStep: number;
  hasCompletedOnboarding: boolean;
  isPro: boolean;
  notificationsGranted: boolean;
  profile: UserProfile;
  claims: Claim[];
  forms: GeneratedForm[];
  catalog: Opportunity[];
  catalogUpdatedAt: string | null;
  idSeed: number;

  setHydrated: (v: boolean) => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setPro: (v: boolean) => void;
  setNotificationsGranted: (v: boolean) => void;
  setProfileValue: (key: string, value: ProfileValue | undefined) => void;
  setProfile: (patch: Partial<UserProfile>) => void;
  setCatalog: (remote: Opportunity[] | null, now: Date) => void;

  saveClaim: (opportunity: Opportunity, now?: Date) => Claim;
  updateClaimStatus: (claimId: string, status: ClaimStatus, now?: Date, paidAmount?: number) => boolean;
  setClaimReminder: (claimId: string, reminderId: string | undefined) => void;
  removeClaim: (claimId: string) => void;
  generateForm: (opportunity: Opportunity, values: Record<string, string>, now?: Date) => GeneratedForm;
  setFormFileUri: (formId: string, uri: string) => void;
  deleteForm: (formId: string) => void;
  resetAll: () => void;
}

const initial = {
  hydrated: false,
  onboardingStep: 0,
  hasCompletedOnboarding: false,
  isPro: false,
  notificationsGranted: false,
  profile: {} as UserProfile,
  claims: [] as Claim[],
  forms: [] as GeneratedForm[],
  catalog: getBundledCatalog(),
  catalogUpdatedAt: null as string | null,
  idSeed: 1,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,

      setHydrated: (hydrated) => set({ hydrated }),
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false, onboardingStep: 0 }),
      setPro: (isPro) => set({ isPro }),
      setNotificationsGranted: (notificationsGranted) => set({ notificationsGranted }),
      setProfileValue: (key, value) =>
        set((s) => {
          const profile = { ...s.profile };
          if (value === undefined) delete profile[key];
          else profile[key] = value;
          return { profile };
        }),
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      setCatalog: (remote, now) =>
        set({ catalog: mergeCatalog(getBundledCatalog(), remote), catalogUpdatedAt: now.toISOString() }),

      saveClaim: (opportunity, now = new Date()) => {
        const existing = get().claims.find((c) => c.opportunityId === opportunity.id);
        if (existing) return existing;
        const seed = get().idSeed;
        const claim = newClaim(opportunity, now, makeId('clm', seed));
        set((s) => ({ claims: [claim, ...s.claims], idSeed: seed + 1 }));
        return claim;
      },
      updateClaimStatus: (claimId, status, now = new Date(), paidAmount) => {
        const claim = get().claims.find((c) => c.id === claimId);
        if (!claim || !canTransition(claim.status, status)) return false;
        set((s) => ({
          claims: s.claims.map((c) =>
            c.id === claimId
              ? {
                  ...c,
                  status,
                  updatedAt: now.toISOString(),
                  submittedAt: status === 'submitted' ? now.toISOString() : c.submittedAt,
                  paidAmount: status === 'paid' ? (paidAmount ?? c.estimatedPayout) : c.paidAmount,
                }
              : c
          ),
        }));
        return true;
      },
      setClaimReminder: (claimId, reminderId) =>
        set((s) => ({ claims: s.claims.map((c) => (c.id === claimId ? { ...c, reminderId } : c)) })),
      removeClaim: (claimId) =>
        set((s) => ({
          claims: s.claims.filter((c) => c.id !== claimId),
          forms: s.forms.filter((f) => f.claimId !== claimId),
        })),

      generateForm: (opportunity, values, now = new Date()) => {
        const claim = get().saveClaim(opportunity, now);
        const seed = get().idSeed;
        const fields = fieldsForOpportunity(opportunity);
        const cleaned: Record<string, string> = {};
        for (const f of fields) cleaned[f.key] = (values[f.key] ?? '').trim();
        const createdAt = now.toISOString();
        const form: GeneratedForm = {
          id: makeId('frm', seed),
          claimId: claim.id,
          opportunityId: opportunity.id,
          templateId: opportunity.formTemplateId,
          title: formTitle(opportunity),
          fields: cleaned,
          html: renderFormHtml(opportunity, cleaned, createdAt),
          createdAt,
        };
        set((s) => ({
          forms: [form, ...s.forms],
          idSeed: seed + 1,
          claims: s.claims.map((c) =>
            c.id === claim.id
              ? { ...c, formId: form.id, status: c.status === 'saved' ? 'in_progress' : c.status, updatedAt: createdAt }
              : c
          ),
          // Remember identity fields for next time.
          profile: {
            ...s.profile,
            ...Object.fromEntries(
              ['firstName', 'lastName', 'email', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country']
                .filter((k) => cleaned[k])
                .map((k) => [k, cleaned[k]])
            ),
          },
        }));
        return form;
      },
      setFormFileUri: (formId, fileUri) =>
        set((s) => ({ forms: s.forms.map((f) => (f.id === formId ? { ...f, fileUri } : f)) })),
      deleteForm: (formId) => set((s) => ({ forms: s.forms.filter((f) => f.id !== formId) })),
      resetAll: () => set({ ...initial, hydrated: true }),
    }),
    {
      name: 'fritter-app-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        onboardingStep: s.onboardingStep,
        hasCompletedOnboarding: s.hasCompletedOnboarding,
        isPro: s.isPro,
        notificationsGranted: s.notificationsGranted,
        profile: s.profile,
        claims: s.claims,
        forms: s.forms,
        catalog: s.catalog,
        catalogUpdatedAt: s.catalogUpdatedAt,
        idSeed: s.idSeed,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

/** Selectors */
export const selectOpportunity = (id: string) => (s: AppState) => s.catalog.find((o) => o.id === id);
export const selectClaimForOpportunity = (id: string) => (s: AppState) => s.claims.find((c) => c.opportunityId === id);
