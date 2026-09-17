import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';

/** Label-over-value stat used in wallet summaries and social-proof rows. */
export function Stat({
  label,
  value,
  color = 'text',
}: {
  label: string;
  value: string;
  color?: ThemeColor;
}) {
  return (
    <View style={styles.stat}>
      <ThemedText type="subtitle" themeColor={color}>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, gap: Spacing.half },
});
