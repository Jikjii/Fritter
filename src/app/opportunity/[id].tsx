import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { deadlineLabel, ELIGIBILITY_BADGE, STATUS_BADGE } from '@/components/opportunity-card';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Screen } from '@/components/ui';
import { CategoryStyle, Spacing } from '@/constants/theme';
import { CLAIM_STATUS_LABEL } from '@/domain/claims';
import { evaluateRule } from '@/domain/eligibility';
import { isStale, isVerified, isWatching, payoutLabel, statusBadge } from '@/domain/estimate';
import type { ClaimMethod } from '@/domain/types';
import { useOpportunity } from '@/hooks/use-catalog';
import { useTheme } from '@/hooks/use-theme';
import { analytics, Events } from '@/services/analytics';
import { useAppStore } from '@/store/use-app-store';

const REPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@example.com';

const METHOD_COPY: Record<ClaimMethod, { label: string; how: string }> = {
  online_form: {
    label: 'Online claim form',
    how: 'Submit on the official site. Fritter prepares your answers so you can paste them in.',
  },
  mail_form: {
    label: 'Mail-in form',
    how: 'Fritter fills in the form and makes a PDF. Print, sign, and mail it.',
  },
  email: {
    label: 'Email request',
    how: 'Fritter writes the letter. Copy it into an email or share the PDF.',
  },
  in_app_request: {
    label: 'Request in the app / account',
    how: 'Use the company’s own support flow. Fritter gives you the wording and what to attach.',
  },
  automatic: {
    label: 'Automatic payment',
    how: 'Nothing to file — payments go out on their own. Track it here so you notice when it lands.',
  },
};

export default function OpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const ranked = useOpportunity(id);
  const isPro = useAppStore((s) => s.isPro);
  const profile = useAppStore((s) => s.profile);
  const claim = useAppStore((s) => s.claims.find((c) => c.opportunityId === id));
  const saveClaim = useAppStore((s) => s.saveClaim);

  useEffect(() => {
    if (ranked)
      analytics.track(Events.opportunityViewed, {
        opportunityId: ranked.opportunity.id,
        status: ranked.eligibility.status,
        isPro,
      });
  }, [ranked, isPro]);

  if (!ranked) {
    return (
      <Screen noTopInset>
        <ThemedText type="heading">This payout is no longer in your catalog.</ThemedText>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const { opportunity: o, eligibility, closed } = ranked;
  const cat = CategoryStyle[o.category];
  const badge = ELIGIBILITY_BADGE[eligibility.status];
  const unverified = !isVerified(o);
  const stale = o.confidence === 'verified_current' && isStale(o);
  const watching = isWatching(o);
  const sBadge = STATUS_BADGE[statusBadge(o)];
  const report = () =>
    Linking.openURL(
      `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(`Fritter catalog problem: ${o.id}`)}&body=${encodeURIComponent(`Item: ${o.id}\nReviewed: ${o.updatedAt}\n\nWhat is wrong (deadline, amount, link, eligibility)?\n`)}`
    ).catch(() => undefined);
  const method = METHOD_COPY[o.claimMethod];
  const officialUrl = o.claimUrl ?? o.sourceUrl;

  const startClaim = () => {
    if (!isPro) {
      analytics.track(Events.paywallViewed, { source: 'opportunity_cta', opportunityId: o.id });
      router.push('/paywall');
      return;
    }
    analytics.track(Events.claimStarted, { opportunityId: o.id });
    router.push({ pathname: '/claim/[id]', params: { id: o.id } });
  };

  const save = () => {
    saveClaim(o);
    analytics.track(Events.claimStatusChanged, { from: 'none', to: 'saved', opportunityId: o.id });
  };

  return (
    <>
      <Stack.Screen options={{ title: o.company }} />
      <Screen
        noTopInset
        footer={
          closed ? (
            <Button title="This one has closed" disabled />
          ) : watching ? (
            <Button
              title={claim ? 'On your Watchlist' : 'Alert me when claims open'}
              onPress={save}
              disabled={!!claim}
            />
          ) : o.claimMethod === 'automatic' ? (
            <Button
              title={claim ? `Tracking · ${CLAIM_STATUS_LABEL[claim.status]}` : 'Track this payout'}
              onPress={save}
              disabled={!!claim}
            />
          ) : (
            <>
              <Button
                title={
                  isPro
                    ? claim?.formId
                      ? 'Open my form'
                      : 'Prepare my claim'
                    : 'Unlock & prepare my claim'
                }
                onPress={
                  claim?.formId
                    ? () =>
                        router.push({
                          pathname: '/form/[id]',
                          params: { id: claim.formId as string },
                        })
                    : startClaim
                }
              />
              <Button
                title={claim ? `Saved · ${CLAIM_STATUS_LABEL[claim.status]}` : 'Save to wallet'}
                variant="secondary"
                onPress={save}
                disabled={!!claim}
              />
            </>
          )
        }>
        <View style={styles.badges}>
          <Badge label={cat.label} emoji={cat.emoji} color={cat.color} />
          <Badge label={sBadge.label} color={sBadge.color} />
          {!closed ? <Badge label={badge.label} color={badge.color} /> : null}
        </View>
        <ThemedText type="title">{o.title}</ThemedText>
        <View style={styles.moneyRow}>
          <ThemedText
            type={watching ? 'subtitle' : 'money'}
            themeColor={watching ? 'textSecondary' : 'money'}>
            {isPro || watching || closed ? payoutLabel(o) : '$•••'}
          </ThemedText>
          <ThemedText type="caption" themeColor={closed ? 'danger' : 'textSecondary'}>
            {deadlineLabel(o, closed)}
          </ThemedText>
        </View>
        {!isPro ? (
          <ThemedText type="small" themeColor="textSecondary">
            Estimated payout and the ready-to-send form are part of Fritter Pro.
          </ThemedText>
        ) : null}

        {watching ? (
          <Card tone="gold">
            <ThemedText type="smallBold">Watchlist item</ThemedText>
            <ThemedText type="small">
              No claims process exists yet. Any site asking you to “claim” this today is not the
              real thing. Add it to your wallet and Fritter will alert you the day a real claim
              window opens.
            </ThemedText>
          </Card>
        ) : null}
        {stale ? (
          <Card tone="gold">
            <ThemedText type="smallBold" themeColor="warning">
              ⚠︎ Needs re-check
            </ThemedText>
            <ThemedText type="small">
              This entry was last reviewed on {o.updatedAt}. Amounts are hidden until it is verified
              again. Check the official source before you rely on it.
            </ThemedText>
          </Card>
        ) : unverified ? (
          <Card tone="gold">
            <ThemedText type="smallBold" themeColor="warning">
              ⚠︎ {o.confidence === 'illustrative' ? 'Example entry' : 'Not yet verified'}
            </ThemedText>
            <ThemedText type="small">{o.confidenceNote}</ThemedText>
          </Card>
        ) : null}

        <Card>
          <ThemedText type="heading">What happened</ThemedText>
          <ThemedText type="small">{o.summary}</ThemedText>
        </Card>

        <Card>
          <ThemedText type="heading">Who qualifies</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {o.whoQualifies}
          </ThemedText>
          {o.eligibility.length ? (
            <View style={styles.checklist}>
              {o.eligibility.map((rule, i) => {
                const verdict = evaluateRule(rule, profile);
                const mark = verdict === true ? '✅' : verdict === false ? '❌' : '❔';
                return (
                  <View key={`${rule.profileKey}-${i}`} style={styles.checkRow}>
                    <ThemedText type="small">{mark}</ThemedText>
                    <ThemedText type="small" style={styles.checkLabel}>
                      {rule.label ?? `${rule.profileKey} ${rule.operator} ${String(rule.value)}`}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          ) : null}
          <ThemedText type="caption" themeColor="textSecondary">
            {eligibility.matched}/{eligibility.total} requirements match your answers.
            {eligibility.unanswered.length ? ' Redo the quiz in Profile to answer the rest.' : ''}
          </ThemedText>
        </Card>

        <Card>
          <ThemedText type="heading">How to claim</ThemedText>
          <Badge label={method.label} color="primary" />
          <ThemedText type="small">{method.how}</ThemedText>
          <ThemedText type="smallBold">Proof needed</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {o.proofRequired}
          </ThemedText>
          {o.mailingAddress ? (
            <>
              <ThemedText type="smallBold">Mail to</ThemedText>
              <ThemedText type="small" selectable themeColor="textSecondary">
                {o.mailingAddress}
              </ThemedText>
            </>
          ) : null}
          {officialUrl ? (
            <Button
              title="Open official source"
              variant="secondary"
              size="md"
              onPress={() => WebBrowser.openBrowserAsync(officialUrl)}
            />
          ) : null}
        </Card>

        <ThemedText
          type="caption"
          themeColor="textSecondary"
          style={{ color: theme.textSecondary }}>
          Reviewed {o.updatedAt}
          {o.verifiedBy ? ` by ${o.verifiedBy}` : ''}. Eligibility is decided by the court, agency,
          airline, platform or settlement administrator, not this app. Estimates are documented
          maximums, not guarantees. Fritter is not a law firm, claims administrator, or affiliated
          with any company named.
        </ThemedText>
        <Button
          title="Report a wrong deadline or amount"
          variant="ghost"
          size="md"
          onPress={report}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  checklist: { gap: Spacing.one },
  checkRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  checkLabel: { flex: 1 },
});
