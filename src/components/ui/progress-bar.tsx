import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: theme.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
});
