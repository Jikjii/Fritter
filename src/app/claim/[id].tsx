import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, ProgressBar, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { fieldsForOpportunity, missingRequiredFields, prefillFromProfile } from '@/domain/documents';
import type { FormFieldSpec } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { analytics, Events } from '@/services/analytics';
import { scheduleDeadlineReminder } from '@/services/notifications';
import { useAppStore } from '@/store/use-app-store';

function Field({ spec, value, onChange, error }: { spec: FormFieldSpec; value: string; onChange: (v: string) => void; error?: boolean }) {
  const theme = useTheme();
  if (spec.type === 'select' && spec.options) {
    return (
      <View style={styles.field}>
        <ThemedText type="caption" themeColor={error ? 'danger' : 'textSecondary'}>
          {spec.label}
          {spec.required ? ' *' : ''}
        </ThemedText>
        <View style={styles.chips}>
          {spec.options.map((opt) => {
            const selected = value === opt;
            return (
              <Pressable
                key={opt}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onChange(opt)}
                style={[styles.chip, { backgroundColor: selected ? theme.primary : theme.backgroundElement, borderColor: selected ? theme.primary : theme.border }]}>
                <ThemedText type="smallBold" style={{ color: selected ? theme.textInverse : theme.text }}>
                  {opt}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.field}>
      <ThemedText type="caption" themeColor={error ? 'danger' : 'textSecondary'}>
        {spec.label}
        {spec.required ? ' *' : ''}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={spec.placeholder ?? (spec.type === 'date' ? 'YYYY-MM-DD' : undefined)}
        placeholderTextColor={theme.textSecondary}
        multiline={spec.type === 'multiline'}
        keyboardType={spec.type === 'email' ? 'email-address' : spec.type === 'number' ? 'decimal-pad' : 'default'}
        autoCapitalize={spec.type === 'email' ? 'none' : 'sentences'}
        style={[
          styles.input,
          spec.type === 'multiline' && styles.multiline,
          { color: theme.text, borderColor: error ? theme.danger : theme.border, backgroundColor: theme.background },
        ]}
      />
      {spec.helpText ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {spec.helpText}
        </ThemedText>
      ) : null}
    </View>
  );
}

export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isPro = useAppStore((s) => s.isPro);
  const opportunity = useAppStore((s) => s.catalog.find((o) => o.id === id));
  const profile = useAppStore((s) => s.profile);
  const existingForm = useAppStore((s) => s.forms.find((f) => f.opportunityId === id));
  const generateForm = useAppStore((s) => s.generateForm);
  const setClaimReminder = useAppStore((s) => s.setClaimReminder);
  const notificationsGranted = useAppStore((s) => s.notificationsGranted);

  const fields = useMemo(() => (opportunity ? fieldsForOpportunity(opportunity) : []), [opportunity]);
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...prefillFromProfile(fields, profile),
    ...(existingForm?.fields ?? {}),
  }));
  const [showErrors, setShowErrors] = useState(false);

  if (!opportunity) {
    return (
      <Screen noTopInset>
        <ThemedText type="heading">This payout is no longer in your catalog.</ThemedText>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (!isPro) return <Redirect href="/paywall" />;

  const missing = missingRequiredFields(fields, values);
  const filled = fields.filter((f) => (values[f.key] ?? '').trim()).length;

  const submit = async () => {
    if (missing.length) {
      setShowErrors(true);
      return;
    }
    const form = generateForm(opportunity, values);
    analytics.track(Events.formGenerated, { opportunityId: opportunity.id, templateId: opportunity.formTemplateId });
    if (notificationsGranted) {
      const claim = useAppStore.getState().claims.find((c) => c.id === form.claimId);
      if (claim && !claim.reminderId) {
        const reminderId = await scheduleDeadlineReminder(opportunity);
        if (reminderId) setClaimReminder(claim.id, reminderId);
      }
    }
    router.replace({ pathname: '/form/[id]', params: { id: form.id } });
  };

  const missingKeys = new Set(missing.map((f) => f.key));

  return (
    <>
      <Stack.Screen options={{ title: 'Prepare claim' }} />
      <Screen
        noTopInset
        footer={
          <>
            {showErrors && missing.length ? (
              <ThemedText type="caption" themeColor="danger">
                {missing.length} required field{missing.length === 1 ? '' : 's'} left: {missing.map((f) => f.label).join(', ')}
              </ThemedText>
            ) : null}
            <Button title={existingForm ? 'Regenerate my form' : 'Generate my form'} onPress={submit} />
          </>
        }>
        <ThemedText type="subtitle">{opportunity.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Fill this once. Fritter writes the {opportunity.claimMethod === 'mail_form' ? 'mail-in form' : 'letter'} and remembers your details for next time.
        </ThemedText>
        <ProgressBar value={fields.length ? filled / fields.length : 0} />
        <ThemedText type="caption" themeColor="textSecondary">
          {filled}/{fields.length} answered
        </ThemedText>

        <Card>
          <ThemedText type="heading">What you need</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {opportunity.proofRequired}
          </ThemedText>
        </Card>

        <Card>
          {fields.map((f) => (
            <Field key={f.key} spec={f} value={values[f.key] ?? ''} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} error={showErrors && missingKeys.has(f.key)} />
          ))}
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one, marginBottom: Spacing.two },
  input: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, fontSize: 16 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill, borderWidth: 1 },
});
