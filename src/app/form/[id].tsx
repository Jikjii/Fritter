import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { CLAIM_STATUS_LABEL } from '@/domain/claims';
import { fieldsForOpportunity, htmlToPlainText } from '@/domain/documents';
import { analytics, Events } from '@/services/analytics';
import { exportFormPdf, shareFormPdf } from '@/services/documents';
import { useAppStore } from '@/store/use-app-store';

export default function FormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const form = useAppStore((s) => s.forms.find((f) => f.id === id));
  const opportunity = useAppStore((s) => s.catalog.find((o) => o.id === form?.opportunityId));
  const claim = useAppStore((s) => s.claims.find((c) => c.id === form?.claimId));
  const setFormFileUri = useAppStore((s) => s.setFormFileUri);
  const updateClaimStatus = useAppStore((s) => s.updateClaimStatus);
  const deleteForm = useAppStore((s) => s.deleteForm);
  const [busy, setBusy] = useState<'pdf' | 'copy' | null>(null);

  const text = useMemo(() => (form ? htmlToPlainText(form.html) : ''), [form]);
  const fields = useMemo(
    () => (opportunity ? fieldsForOpportunity(opportunity) : []),
    [opportunity]
  );

  if (!form || !opportunity) {
    return (
      <Screen noTopInset>
        <ThemedText type="heading">This form no longer exists.</ThemedText>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const exportPdf = async () => {
    setBusy('pdf');
    try {
      const uri = await exportFormPdf(form);
      if (uri) {
        setFormFileUri(form.id, uri);
        analytics.track(Events.formGenerated, {
          opportunityId: opportunity.id,
          templateId: form.templateId,
        });
        const shared = await shareFormPdf(uri, form.title);
        if (shared) analytics.track(Events.formShared, { opportunityId: opportunity.id });
      }
    } catch (e) {
      Alert.alert('Could not create PDF', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  };

  const copyText = async () => {
    setBusy('copy');
    await Clipboard.setStringAsync(text);
    setBusy(null);
    if (Platform.OS !== 'web') Alert.alert('Copied', 'The letter text is on your clipboard.');
  };

  const markSubmitted = () => {
    if (claim && updateClaimStatus(claim.id, 'submitted')) {
      analytics.track(Events.claimStatusChanged, {
        from: claim.status,
        to: 'submitted',
        opportunityId: opportunity.id,
      });
      router.replace('/(tabs)/wallet');
    }
  };

  const where =
    opportunity.claimMethod === 'mail_form' && opportunity.mailingAddress
      ? { label: 'Mail this form to', value: opportunity.mailingAddress }
      : opportunity.claimMethod === 'email' && opportunity.claimEmail
        ? { label: 'Email this letter to', value: opportunity.claimEmail }
        : opportunity.claimMethod === 'online_form'
          ? {
              label: 'Copy your answers into the official form',
              value: opportunity.claimUrl ?? opportunity.sourceUrl ?? '',
            }
          : { label: 'Send this request to', value: opportunity.company };

  return (
    <>
      <Stack.Screen options={{ title: 'Your form' }} />
      <Screen
        noTopInset
        footer={
          <>
            <Button
              title={Platform.OS === 'web' ? 'Print / save as PDF' : 'Export PDF & share'}
              loading={busy === 'pdf'}
              onPress={exportPdf}
            />
            {claim && (claim.status === 'saved' || claim.status === 'in_progress') ? (
              <Button
                title="I sent it — mark submitted"
                variant="secondary"
                onPress={markSubmitted}
              />
            ) : null}
          </>
        }>
        <View style={styles.rowBetween}>
          <Badge
            label={form.fileUri ? 'PDF ready' : 'Draft'}
            color={form.fileUri ? 'money' : 'primary'}
          />
          {claim ? <Badge label={CLAIM_STATUS_LABEL[claim.status]} color="gold" /> : null}
        </View>
        <ThemedText type="subtitle">{form.title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          Generated {form.createdAt.slice(0, 10)}
        </ThemedText>

        <Card tone="primary">
          <ThemedText type="smallBold">{where.label}</ThemedText>
          <ThemedText type="small" selectable>
            {where.value}
          </ThemedText>
          {opportunity.claimMethod === 'online_form' && where.value ? (
            <Button
              title="Open official form"
              size="md"
              onPress={() => WebBrowser.openBrowserAsync(where.value)}
            />
          ) : null}
        </Card>

        <Card>
          <View style={styles.rowBetween}>
            <ThemedText type="heading">Letter</ThemedText>
            <Button
              title={busy === 'copy' ? 'Copied' : 'Copy text'}
              variant="secondary"
              size="md"
              style={styles.smallBtn}
              onPress={copyText}
            />
          </View>
          <ThemedText type="small" selectable style={styles.letter}>
            {text}
          </ThemedText>
        </Card>

        <Card>
          <ThemedText type="heading">Your answers</ThemedText>
          {fields
            .filter((f) => form.fields[f.key])
            .map((f) => (
              <View key={f.key} style={styles.fieldRow}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {f.label}
                </ThemedText>
                <ThemedText type="small" selectable>
                  {form.fields[f.key]}
                </ThemedText>
              </View>
            ))}
          <Button
            title="Edit answers"
            variant="ghost"
            size="md"
            onPress={() => router.push({ pathname: '/claim/[id]', params: { id: opportunity.id } })}
          />
        </Card>

        <Button
          title="Delete this form"
          variant="danger"
          size="md"
          onPress={() => {
            deleteForm(form.id);
            router.back();
          }}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  smallBtn: { alignSelf: 'auto' },
  letter: { lineHeight: 22 },
  fieldRow: { gap: Spacing.half, paddingVertical: Spacing.one },
});
