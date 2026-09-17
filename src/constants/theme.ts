/**
 * Fritter theme. Neon-otaku palette: violet primary, sakura pink accent, gold for money.
 * Every color exists in light and dark so screens never hard-code hex values.
 */
import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F0F1A',
    textSecondary: '#5B5F73',
    textInverse: '#FFFFFF',
    background: '#FFFFFF',
    backgroundElement: '#F3F2FA',
    backgroundSelected: '#E6E3F8',
    border: '#E2E0EE',
    primary: '#6D5DF6',
    primarySoft: '#ECE9FF',
    accent: '#FF5FA2',
    accentSoft: '#FFE4F0',
    money: '#0E9F6E',
    moneySoft: '#DDF7EC',
    gold: '#E5A50A',
    goldSoft: '#FFF3CF',
    warning: '#D97706',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
    overlay: 'rgba(15, 15, 26, 0.55)',
  },
  dark: {
    text: '#F5F4FF',
    textSecondary: '#A8A9C0',
    textInverse: '#0F0F1A',
    background: '#0B0B14',
    backgroundElement: '#171727',
    backgroundSelected: '#232340',
    border: '#2A2A45',
    primary: '#8B7DFF',
    primarySoft: '#241F4D',
    accent: '#FF6FB0',
    accentSoft: '#3D1A2C',
    money: '#34D399',
    moneySoft: '#0F2E24',
    gold: '#FACC15',
    goldSoft: '#3A2F0A',
    warning: '#F59E0B',
    danger: '#F87171',
    dangerSoft: '#3B1111',
    overlay: 'rgba(0, 0, 0, 0.65)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = { [K in ThemeColor]: string };

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const MaxContentWidth = 640;

/** Category → accent color key + emoji, used by badges, chart legends and tab filters. */
export const CategoryStyle = {
  settlement: { color: 'primary', emoji: '⚖️', label: 'Settlements' },
  refund: { color: 'money', emoji: '💸', label: 'Refunds' },
  convention: { color: 'accent', emoji: '🎟️', label: 'Conventions' },
  travel: { color: 'gold', emoji: '✈️', label: 'Travel' },
  commission: { color: 'warning', emoji: '🧵', label: 'Commissions' },
  rewards: { color: 'primary', emoji: '🎁', label: 'Rewards' },
} as const satisfies Record<string, { color: ThemeColor; emoji: string; label: string }>;
