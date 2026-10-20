import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

/** Flimpy's host: a star with a face. It sways gently unless reduced motion is on. */
export function Mascot({ size = 64, color = colors.pink, still = false }: { size?: number; color?: string; still?: boolean }) {
  const reduced = useReducedMotion();
  const sway = useSharedValue(0);

  useEffect(() => {
    if (still || reduced) return;
    sway.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [still, reduced, sway]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-6 + sway.value * 12}deg` }, { translateY: -sway.value * 3 }],
  }));

  return (
    <Animated.View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Path
          d="M32 3l7.6 17.4L58 22l-14 12.4L48 54 32 44.3 16 54l4-19.6L6 22l18.4-1.6z"
          fill={color}
          stroke={colors.text}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Circle cx={26} cy={29} r={3.2} fill={colors.ink} />
        <Circle cx={38} cy={29} r={3.2} fill={colors.ink} />
        <Path d="M25.5 36q6.5 5.5 13 0" stroke={colors.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}
