import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bulbs } from '@/components/bulbs';
import { BackIcon, CameraIcon } from '@/components/icons';
import { Body, Display, Pill, StageButton, Stat } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { ActivityDetail, Reward } from '@/lib/types';
import { formatCountdown, useNow } from '@/lib/use-countdown';
import { colors, fonts } from '@/theme';

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_activity', { p_activity_id: id });
    if (error) setError(error.message);
    else setActivity(data);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const now = useNow();
  const live = activity ? new Date(activity.starts_at).getTime() <= now : false;
  const clock = formatCountdown(activity ? (live ? activity.ends_at : activity.starts_at) : undefined, now);

  async function join() {
    setJoining(true);
    const { error } = await supabase.rpc('join_activity', { p_activity_id: id });
    setJoining(false);
    if (error) setError(error.message);
    else load();
  }

  if (!activity) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.error}>{error ?? ''}</Text>
      </SafeAreaView>
    );
  }

  const me = activity.participation;
  const spots = activity.max_participants ? `${activity.participant_count}/${activity.max_participants}` : String(activity.participant_count);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <BackIcon color={colors.text} />
        </Pressable>

        <Animated.View entering={FadeInDown} style={{ gap: 8 }}>
          <Pill label={live ? `LIVE · ENDS IN ${clock ?? '0:00'}` : `STARTS IN ${clock ?? 'soon'}`} tone={live ? 'pink' : 'surface'} />
          <Display style={{ fontSize: 32, lineHeight: 34 }}>{activity.title}</Display>
          {activity.sponsor && <Body>Presented by {activity.sponsor}</Body>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={styles.stats}>
          <Stat label="Contestants" value={spots} />
          <Stat label="Stars" value={`+${activity.stars_reward}`} color={colors.gold} />
        </Animated.View>

        {activity.rewards.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200)} style={{ gap: 12 }}>
            <Text style={styles.section}>{"Tonight's prizes"}</Text>
            <Podium rewards={activity.rewards} />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(300)} style={{ gap: 8 }}>
          <Text style={styles.section}>How to win</Text>
          <Body>{activity.description}</Body>
          {activity.proof_instructions ? <Body style={{ color: colors.text }}>{activity.proof_instructions}</Body> : null}
        </Animated.View>

        {me && (
          <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.pass}>
            <View style={styles.passTop}>
              <Text style={styles.passBrand}>Flimpy</Text>
              <Text style={styles.passKicker}>CONTESTANT PASS</Text>
            </View>
            <View style={styles.passBody}>
              <View>
                <Text style={styles.passLabel}>Contestant</Text>
                <Text style={styles.passValue}>#{me.contestant_number}</Text>
              </View>
              <View>
                <Text style={styles.passLabel}>Status</Text>
                <Text style={styles.passValue}>{statusLabel[me.status]}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={styles.rules}>
          <Bulbs count={14} />
          <Text style={styles.rulesText}>Free to enter. One entry per contestant.</Text>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        {!me && <StageButton label="Join the show" onPress={join} loading={joining} />}
        {me && (me.status === 'joined' || me.status === 'rejected') && (
          <StageButton
            label="I'm here: open the camera"
            icon={<CameraIcon color={colors.ink} />}
            onPress={() => router.push({ pathname: '/activity/[id]/proof', params: { id } })}
          />
        )}
        {me?.status === 'flagged' && <Body style={styles.center}>The judges are taking a closer look at your photo.</Body>}
        {me?.status === 'verified' && <Body style={styles.center}>{"You're in the draw. Good luck!"}</Body>}
      </View>
    </SafeAreaView>
  );
}

const statusLabel = { joined: 'Get there', verified: 'In the draw', flagged: 'In review', rejected: 'Try again' } as const;

function Podium({ rewards }: { rewards: Reward[] }) {
  // Grand prize in the middle and tallest, like a real podium.
  const [first, second, third] = rewards;
  const order = [second, first, third].filter(Boolean) as Reward[];
  const heights = new Map([[first, 150], [second, 110], [third, 86]]);
  return (
    <View style={styles.podium}>
      {order.map((r, i) => (
        <Animated.View
          key={r.id}
          entering={FadeInDown.delay(250 + i * 120).springify()}
          style={[styles.step, { height: heights.get(r) }, r === first && { backgroundColor: colors.gold }]}>
          <Text style={[styles.stepTitle, r === first && { color: colors.ink }]} numberOfLines={2}>
            {r.quantity > 1 ? `${r.quantity} × ${r.title}` : r.title}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 20, gap: 22, paddingBottom: 40 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  section: { fontFamily: fonts.display, color: colors.text, fontSize: 20 },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  step: { flex: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.surfaceRaised, padding: 10, justifyContent: 'flex-end', alignItems: 'center' },
  stepTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 16, textAlign: 'center' },
  pass: { borderRadius: 24, overflow: 'hidden', backgroundColor: colors.text, transform: [{ rotate: '-2deg' }] },
  passTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: colors.pink },
  passBrand: { fontFamily: fonts.display, color: colors.text, fontSize: 18 },
  passKicker: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 12, letterSpacing: 1.5 },
  passBody: { flexDirection: 'row', justifyContent: 'space-around', padding: 18 },
  passLabel: { fontFamily: fonts.body, color: '#5A5175', fontSize: 12 },
  passValue: { fontFamily: fonts.display, color: colors.ink, fontSize: 26 },
  rules: { borderWidth: 3, borderColor: colors.gold, borderRadius: 20, padding: 14, gap: 10, backgroundColor: colors.surface },
  rulesText: { fontFamily: fonts.bodyBold, color: colors.text, textAlign: 'center' },
  footer: { padding: 20, paddingBottom: 8, borderTopWidth: 1, borderTopColor: colors.surfaceRaised },
  center: { textAlign: 'center' },
  error: { fontFamily: fonts.bodyBold, color: colors.pink, padding: 20 },
});
