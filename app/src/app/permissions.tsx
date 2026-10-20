import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { CameraIcon, CheckIcon, MapIcon } from '@/components/icons';
import { Body, Display, Kicker, Screen, StageButton } from '@/components/ui';
import { colors, fonts } from '@/theme';

export default function Permissions() {
  const [location, requestLocation] = Location.useForegroundPermissions();
  const [camera, requestCamera] = useCameraPermissions();
  const granted = (location?.granted ? 1 : 0) + (camera?.granted ? 1 : 0);

  return (
    <Screen style={styles.screen}>
      <Animated.View entering={FadeInDown} style={styles.head}>
        <Kicker>Backstage · {granted} of 2 passes</Kicker>
        <Display>Grab your backstage passes</Display>
        <Body>{"The show needs to know when you're on location, and to see your proof. You can change these any time in Settings."}</Body>
      </Animated.View>

      <View style={styles.passes}>
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Pass
            icon={<MapIcon color={colors.gold} size={26} />}
            title="Location"
            detail="Unlocks the camera when you step into a zone"
            granted={!!location?.granted}
            onAllow={requestLocation}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(260).springify()}>
          <Pass
            icon={<CameraIcon color={colors.gold} size={26} />}
            title="Camera"
            detail="Snap your proof live, right in the app"
            granted={!!camera?.granted}
            onAllow={requestCamera}
          />
        </Animated.View>
      </View>

      <View style={{ flex: 1 }} />
      <StageButton label="Continue" onPress={() => router.push('/contestant')} />
    </Screen>
  );
}

function Pass({ icon, title, detail, granted, onAllow }: { icon: ReactNode; title: string; detail: string; granted: boolean; onAllow: () => void }) {
  return (
    <View style={[styles.pass, granted && styles.passOn]}>
      <View style={styles.icon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      {granted ? (
        <Animated.View entering={ZoomIn.springify().damping(8)} style={styles.got} accessibilityLabel={`${title} allowed`}>
          <CheckIcon color={colors.ink} size={22} />
        </Animated.View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={`Allow ${title}`} onPress={onAllow} style={styles.allow}>
          <Text style={styles.allowLabel}>Allow</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingVertical: 24 },
  head: { gap: 12, marginTop: 16 },
  passes: { gap: 14, marginTop: 24 },
  pass: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  passOn: { borderColor: colors.gold, backgroundColor: colors.surfaceRaised },
  icon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#33245E', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 17 },
  detail: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 19 },
  allow: { height: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2, borderColor: colors.gold, justifyContent: 'center' },
  allowLabel: { fontFamily: fonts.bodyBold, color: colors.gold, fontSize: 15 },
  got: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
});
