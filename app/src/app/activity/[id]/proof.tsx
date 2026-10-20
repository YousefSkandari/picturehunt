import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon, LockIcon } from '@/components/icons';
import { Body, Display, Kicker, StageButton } from '@/components/ui';
import { isInsideGeofence } from '@/lib/geo';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { ActivityDetail, Submission } from '@/lib/types';
import { colors, fonts } from '@/theme';

export default function Proof() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, refreshProfile } = useSession();
  const camera = useRef<CameraView>(null);
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [fix, setFix] = useState<Location.LocationObject | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('get_activity', { p_activity_id: id }).then(({ data }) => setActivity(data));
  }, [id]);

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2 }, setFix).then((s) => (sub = s));
    return () => sub?.remove();
  }, []);

  const inside = !!(activity && fix && isInsideGeofence(fix.coords, activity.geofence));

  // The camera only runs while the contestant is inside the zone.
  const phase = inside ? 'camera' : 'approach';

  useEffect(() => {
    if (inside) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [inside]);

  async function snap() {
    if (!camera.current || !fix || !session) return;
    setBusy(true);
    setError(null);
    try {
      const capturedAt = new Date();
      const photo = await camera.current.takePictureAsync({ quality: 0.7 });
      const path = `${session.user.id}/${id}-${capturedAt.getTime()}.jpg`;
      const bytes = await (await fetch(photo.uri)).arrayBuffer();
      const upload = await supabase.storage.from('proofs').upload(path, bytes, { contentType: 'image/jpeg' });
      if (upload.error) throw upload.error;

      const { data, error } = await supabase.rpc('submit_proof', {
        p_activity_id: id,
        p_photo_path: path,
        p_lat: fix.coords.latitude,
        p_lng: fix.coords.longitude,
        p_accuracy_m: fix.coords.accuracy ?? 999,
        p_captured_at: capturedAt.toISOString(),
        p_is_mocked: fix.mocked ?? false,
      });
      if (error) throw error;
      setResult(data);
      refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (result) return <Judges result={result} />;

  return (
    <View style={styles.fill}>
      {phase === 'camera' ? (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.map }]} />
      )}

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.close}>
            <Text style={styles.closeX}>✕</Text>
          </Pressable>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{fix ? `GPS ±${Math.round(fix.coords.accuracy ?? 0)} m` : 'Finding you…'}</Text>
          </View>
        </View>

        <View style={styles.fill} />

        {phase === 'approach' ? (
          <Animated.View entering={FadeInDown} style={styles.panel}>
            <Kicker style={{ color: colors.muted }}>Waiting in the wings</Kicker>
            <Display style={styles.center}>Head into the zone</Display>
            <Body style={styles.center}>Your camera unlocks the moment you step inside.</Body>
            <View style={styles.locked}>
              <LockIcon color={colors.muted} size={36} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} style={styles.panel}>
            <Display style={[styles.center, { color: colors.gold }]}>{"You're on stage!"}</Display>
            <Body style={[styles.center, { color: colors.text }]}>{activity?.proof_instructions || 'Get your proof in frame.'}</Body>
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take proof photo"
              disabled={!ready || busy}
              onPress={snap}
              style={({ pressed }) => [styles.shutter, (pressed || busy) && { transform: [{ scale: 0.9 }] }]}>
              <View style={styles.shutterInner} />
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const judgeReasons = {
  Location: ['outside_geofence', 'low_gps_accuracy', 'mocked_location'],
  Time: ['outside_time_window', 'capture_time_invalid'],
  Photo: [] as string[],
};

/** Three judges flip their paddles one after another, then the verdict lands. */
function Judges({ result }: { result: Submission }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = [700, 1400, 2100].map((ms, i) => setTimeout(() => setShown(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  const done = shown >= 3;
  const verdict = {
    verified: { title: "You're in the draw", color: colors.mint, body: 'Unanimous! Stars are on their way.' },
    flagged: { title: 'The judges want a closer look', color: colors.gold, body: "We'll review your photo and let you know." },
    rejected: { title: 'Not quite', color: colors.pink, body: 'Check you are inside the zone during the show, then try again.' },
  }[result.status];

  return (
    <SafeAreaView style={[styles.fill, styles.judging]}>
      <Kicker style={styles.center}>{done ? 'The verdict' : 'Judges are scoring'}</Kicker>
      <View style={styles.judges}>
        {(Object.keys(judgeReasons) as (keyof typeof judgeReasons)[]).map((name, i) => {
          const failed = judgeReasons[name].some((r) => result.reasons.includes(r));
          return (
            <View key={name} style={styles.judge}>
              {i < shown ? (
                <Animated.View entering={ZoomIn.springify().damping(9)} style={[styles.paddle, { backgroundColor: failed ? colors.pink : colors.mint }]}>
                  {failed ? <Text style={styles.paddleX}>✕</Text> : <CheckIcon color={colors.ink} size={40} />}
                </Animated.View>
              ) : (
                <View style={[styles.paddle, styles.paddleWait]} />
              )}
              <Text style={styles.judgeName}>{name}</Text>
            </View>
          );
        })}
      </View>
      {done && (
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
          <Display style={[styles.center, { color: verdict.color }]}>{verdict.title}</Display>
          <Body style={styles.center}>{verdict.body}</Body>
          <StageButton label="Back to the show" onPress={() => router.back()} />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { flex: 1, padding: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14,10,31,0.7)', alignItems: 'center', justifyContent: 'center' },
  closeX: { color: colors.text, fontSize: 18 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(14,10,31,0.75)' },
  chipText: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 13 },
  panel: { gap: 12, alignItems: 'center', padding: 20, borderRadius: 28, backgroundColor: 'rgba(14,10,31,0.88)' },
  center: { textAlign: 'center' },
  locked: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.surfaceRaised, borderWidth: 3, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: colors.text, padding: 6 },
  shutterInner: { flex: 1, borderRadius: 40, backgroundColor: colors.gold },
  error: { fontFamily: fonts.bodyBold, color: colors.pink, textAlign: 'center' },
  judging: { backgroundColor: colors.ground, padding: 24, justifyContent: 'center', gap: 32 },
  judges: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  judge: { alignItems: 'center', gap: 10 },
  paddle: { width: 96, height: 112, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  paddleWait: { backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.border },
  paddleX: { fontFamily: fonts.display, color: colors.text, fontSize: 36 },
  judgeName: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 14 },
});
