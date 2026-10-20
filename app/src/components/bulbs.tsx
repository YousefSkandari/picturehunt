import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';

import { colors } from '@/theme';

/** A row of marquee bulbs; odd and even bulbs flash in turn. */
export function Bulbs({ count = 12 }: { count?: number }) {
  const reduced = useReducedMotion();
  const phase = useSharedValue(0);

  useEffect(() => {
    if (!reduced) phase.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
  }, [reduced, phase]);

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <Bulb key={i} phase={phase} odd={i % 2 === 1} />
      ))}
    </View>
  );
}

function Bulb({ phase, odd }: { phase: SharedValue<number>; odd: boolean }) {
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * (odd ? 1 - phase.value : phase.value) }));
  return <Animated.View style={[styles.bulb, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  bulb: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
    shadowColor: colors.gold,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
