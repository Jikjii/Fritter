import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CategoryStyle, Spacing } from '@/constants/theme';
import { formatMoney } from '@/domain/estimate';
import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

/**
 * Horizontal bars of estimated money by category. Pure React Native views (no SVG) so it renders
 * identically on iOS, Android, web and in tests. Used on the onboarding reveal and Wallet.
 */
export function CategoryBars({
  byCategory,
  max,
}: {
  byCategory: Record<OpportunityCategory, number>;
  max?: number;
}) {
  const theme = useTheme();
  const entries = OPPORTUNITY_CATEGORIES.map((c) => ({ c, v: byCategory[c] ?? 0 })).filter(
    (e) => e.v > 0
  );
  const top = max ?? Math.max(1, ...entries.map((e) => e.v));
  if (entries.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Answer a few questions and your breakdown appears here.
      </ThemedText>
    );
  }
  return (
    <View style={styles.list} accessibilityRole="summary">
      {entries.map(({ c, v }) => {
        const s = CategoryStyle[c];
        return (
          <View key={c} style={styles.row}>
            <ThemedText type="caption" style={styles.label} numberOfLines={1}>
              {s.emoji} {s.label}
            </ThemedText>
            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.max(4, (v / top) * 100)}%`, backgroundColor: theme[s.color] },
                ]}
              />
            </View>
            <ThemedText type="smallBold" style={styles.value}>
              {formatMoney(v, { compact: true })}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two, alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { width: 104 },
  track: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  value: { width: 56, textAlign: 'right' },
});
