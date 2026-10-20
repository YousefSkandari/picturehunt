import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, space } from '@/theme';

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

export function Display({ style, ...rest }: TextProps) {
  return <Text style={[styles.display, style]} {...rest} />;
}

export function Kicker({ style, ...rest }: TextProps) {
  return <Text style={[styles.kicker, style]} {...rest} />;
}

export function Body({ style, ...rest }: TextProps) {
  return <Text style={[styles.body, style]} {...rest} />;
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'gold' | 'pink';
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** The chunky game-show button: it sinks into its shadow when pressed. */
export function StageButton({ label, onPress, disabled, loading, tone = 'gold', icon, style }: ButtonProps) {
  const pressed = useSharedValue(0);
  const face = tone === 'gold' ? colors.gold : colors.pink;
  const shadow = tone === 'gold' ? colors.goldShadow : colors.pinkShadow;
  const ink = tone === 'gold' ? colors.ink : colors.text;
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: pressed.value * 5 }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 18, stiffness: 600 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      onPressOut={() => (pressed.value = withSpring(0, { damping: 12, stiffness: 400 }))}
      onPress={onPress}
      style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
      <View style={[styles.buttonBase, { backgroundColor: shadow }]}>
        <Animated.View style={[styles.buttonFace, { backgroundColor: face }, animated]}>
          {loading ? <ActivityIndicator color={ink} /> : icon}
          <Text style={[styles.buttonLabel, { color: ink }]}>{label}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.ghost, pressed && { borderColor: colors.gold }]}>
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, tone = 'surface' }: { label: string; tone?: 'surface' | 'pink' | 'gold' | 'mint' }) {
  const bg = { surface: colors.surfaceRaised, pink: colors.pink, gold: colors.gold, mint: colors.mint }[tone];
  const fg = tone === 'gold' || tone === 'mint' ? colors.ink : colors.text;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground, paddingHorizontal: space.lg },
  display: { fontFamily: fonts.display, color: colors.text, fontSize: 36, lineHeight: 38, letterSpacing: -0.6 },
  kicker: { fontFamily: fonts.bodyBold, color: colors.pink, fontSize: 13, letterSpacing: 2.4, textTransform: 'uppercase' },
  body: { fontFamily: fonts.body, color: colors.muted, fontSize: 16, lineHeight: 24 },
  buttonBase: { borderRadius: 999, paddingBottom: 6 },
  buttonFace: { height: 58, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonLabel: { fontFamily: fonts.display, fontSize: 19 },
  ghost: { height: 52, borderRadius: 999, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ghostLabel: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 16 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1 },
  stat: { flex: 1, padding: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  statLabel: { fontFamily: fonts.body, color: colors.muted, fontSize: 12 },
  statValue: { fontFamily: fonts.display, fontSize: 22 },
});
