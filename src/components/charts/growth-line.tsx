import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type GrowthLineProps = {
  /** Y values, left to right. */
  points: number[];
  labels?: string[];
  height?: number;
  /** Highlight the last point with a dot + label. */
  endLabel?: string;
  color?: 'primary' | 'money' | 'accent';
};

/**
 * Smooth "line going up" chart for the scientific-feel onboarding screens (e.g. "money found by
 * fans like you over time") and the Wallet history.
 */
export function GrowthLine({
  points,
  labels,
  height = 140,
  endLabel,
  color = 'money',
}: GrowthLineProps) {
  const theme = useTheme();
  const stroke = theme[color];
  const width = 320;
  const pad = 12;

  const { path, area, last } = useMemo(() => {
    if (points.length < 2) return { path: '', area: '', last: { x: 0, y: 0 } };
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const xs = points.map((_, i) => pad + (i * (width - pad * 2)) / (points.length - 1));
    const ys = points.map(
      (p) => height - pad - ((p - min) / (max - min || 1)) * (height - pad * 2)
    );
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 1; i < points.length; i++) {
      const cx = (xs[i - 1] + xs[i]) / 2;
      d += ` C ${cx} ${ys[i - 1]}, ${cx} ${ys[i]}, ${xs[i]} ${ys[i]}`;
    }
    const a = `${d} L ${xs[xs.length - 1]} ${height} L ${xs[0]} ${height} Z`;
    return { path: d, area: a, last: { x: xs[xs.length - 1], y: ys[ys.length - 1] } };
  }, [points, height]);

  return (
    <View style={styles.wrap}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity={0.35} />
            <Stop offset="1" stopColor={stroke} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {area ? <Path d={area} fill="url(#fill)" /> : null}
        {path ? (
          <Path d={path} stroke={stroke} strokeWidth={3} fill="none" strokeLinecap="round" />
        ) : null}
        {path ? (
          <Circle
            cx={last.x}
            cy={last.y}
            r={6}
            fill={stroke}
            stroke={theme.background}
            strokeWidth={3}
          />
        ) : null}
      </Svg>
      {endLabel ? (
        <ThemedText type="smallBold" style={[styles.endLabel, { color: stroke }]}>
          {endLabel}
        </ThemedText>
      ) : null}
      {labels && labels.length ? (
        <View style={styles.labels}>
          {labels.map((l, i) => (
            <ThemedText key={`${l}-${i}`} type="caption" themeColor="textSecondary">
              {l}
            </ThemedText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: Spacing.one },
  endLabel: { position: 'absolute', right: 0, top: 0 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
