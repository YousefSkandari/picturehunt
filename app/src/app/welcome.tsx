import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Bulbs } from '@/components/bulbs';
import { Mascot } from '@/components/mascot';
import { Body, Display, Kicker, Screen, StageButton } from '@/components/ui';
import { colors, fonts } from '@/theme';

export default function Welcome() {
  return (
    <Screen style={styles.screen}>
      <View style={styles.top}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.marquee}>
          <Bulbs />
          <View style={styles.brand}>
            <Mascot size={48} still />
            <Display style={styles.wordmark}>Flimpy</Display>
          </View>
          <Bulbs />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(300)}>
          <Kicker>The city is your game show</Kicker>
        </Animated.View>
      </View>

      <View style={styles.bottom}>
        <Animated.View entering={FadeInDown.delay(450).springify()}>
          <Display style={styles.headline}>
            Show up. Do good.{'\n'}
            <Display style={[styles.headline, { color: colors.gold }]}>Win big.</Display>
          </Display>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(600)}>
          <Body style={styles.center}>{"Live challenges in real places near you. Get there, prove it with a photo, and you're in the draw."}</Body>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(750).springify()}>
          <StageButton label="Let's play" onPress={() => router.push('/sign-in')} />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', paddingVertical: 40 },
  top: { alignItems: 'center', gap: 28, marginTop: 40 },
  marquee: {
    width: 300,
    padding: 18,
    gap: 14,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: colors.surface,
    shadowColor: colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 30,
  },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  wordmark: { fontSize: 60, lineHeight: 64, color: colors.gold, fontFamily: fonts.display },
  bottom: { gap: 20 },
  headline: { fontSize: 40, lineHeight: 42, textAlign: 'center' },
  center: { textAlign: 'center' },
});
