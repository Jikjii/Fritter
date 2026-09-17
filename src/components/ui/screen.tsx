import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ScreenProps = ScrollViewProps & {
  /** Sticky footer (usually a Button) rendered outside the scroll view. */
  footer?: React.ReactNode;
  /** Skip the top safe-area inset (when a header is already present). */
  noTopInset?: boolean;
  scroll?: boolean;
};

/** Page container: safe-area aware, centered on wide screens, optional sticky footer. */
export function Screen({ children, footer, noTopInset, scroll = true, contentContainerStyle, style, ...rest }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padTop = noTopInset ? 0 : insets.top;
  const content = (
    <View style={[styles.inner, { paddingTop: padTop + Spacing.three }]}>{children}</View>
  );
  return (
    <View style={[styles.root, { backgroundColor: theme.background }, style]}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          {...rest}>
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, contentContainerStyle]}>{content}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three), borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  footerInner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two },
});
