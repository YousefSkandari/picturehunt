import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityMap } from '@/components/activity-map';
import { StarIcon } from '@/components/icons';
import { Mascot } from '@/components/mascot';
import { Pill } from '@/components/ui';
import { formatDistance, type LatLng } from '@/lib/geo';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { NearbyActivity } from '@/lib/types';
import { formatCountdown, useNow } from '@/lib/use-countdown';
import { avatarColor, colors, fonts } from '@/theme';

// Central London, used until we have the contestant's own position.
const FALLBACK: LatLng = { latitude: 51.5212, longitude: -0.0717 };

export default function Shows() {
  const { profile } = useSession();
  const [me, setMe] = useState<LatLng | null>(null);
  const [activities, setActivities] = useState<NearbyActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (at: LatLng) => {
    const { data, error } = await supabase.rpc('nearby_activities', { lat: at.latitude, lng: at.longitude });
    if (error) setError(error.message);
    else setActivities(data ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const { granted } = await Location.getForegroundPermissionsAsync();
      if (!granted) return load(FALLBACK);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const at = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setMe(at);
      load(at);
    })();
  }, [load]);

  const open = (id: string) => router.push({ pathname: '/activity/[id]', params: { id } });

  return (
    <View style={styles.fill}>
      <ActivityMap activities={activities} me={me} onSelect={open} />

      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <Animated.View entering={FadeInDown.springify()} style={styles.bar}>
          <Mascot size={40} color={avatarColor(profile?.avatar)} still />
          <View style={styles.fill}>
            <Text style={styles.hello}>Hello, {profile?.stage_name ?? 'contestant'}</Text>
            <Text style={styles.heading}>{"Tonight's line-up"}</Text>
          </View>
          <View style={styles.stars}>
            <StarIcon size={16} color={colors.gold} />
            <Text style={styles.starsText}>{(profile?.stars ?? 0).toLocaleString()}</Text>
          </View>
        </Animated.View>
      </SafeAreaView>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>
          {activities.length === 0 ? 'No shows near you yet' : `${activities.length} show${activities.length === 1 ? '' : 's'} near you`}
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
          {activities.map((a, i) => (
            <Animated.View key={a.id} entering={FadeInRight.delay(120 * i).springify()}>
              <ShowCard activity={a} onPress={() => open(a.id)} />
            </Animated.View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function ShowCard({ activity, onPress }: { activity: NearbyActivity; onPress: () => void }) {
  const now = useNow();
  const live = new Date(activity.starts_at).getTime() <= now;
  const clock = formatCountdown(live ? activity.ends_at : activity.starts_at, now);
  const spots = activity.max_participants ? `${activity.participant_count} / ${activity.max_participants}` : String(activity.participant_count);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={activity.title} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardRow}>
        <Pill label={live ? 'LIVE' : 'COMING UP'} tone={live ? 'pink' : 'surface'} />
        {clock && <Text style={styles.clock}>{live ? `Ends in ${clock}` : `Starts in ${clock}`}</Text>}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {activity.title}
      </Text>
      <Text style={styles.cardMeta}>{formatDistance(activity.distance_m)}</Text>
      <View style={styles.cardRow}>
        <Text style={styles.cardMeta}>Contestants</Text>
        <Text style={styles.cardValue}>{spots}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: 'absolute', left: 16, right: 16, top: 0 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 22, backgroundColor: 'rgba(27,19,54,0.94)', borderWidth: 2, borderColor: colors.border, marginTop: 8 },
  hello: { fontFamily: fonts.bodyBold, color: colors.muted, fontSize: 12 },
  heading: { fontFamily: fonts.display, color: colors.text, fontSize: 20 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.ground },
  starsText: { fontFamily: fonts.bodyBold, color: colors.gold, fontSize: 14 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 14, paddingBottom: 12, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.ground },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 22, paddingHorizontal: 20, marginBottom: 12 },
  error: { fontFamily: fonts.bodyBold, color: colors.pink, paddingHorizontal: 20 },
  cards: { gap: 12, paddingHorizontal: 20 },
  card: { width: 286, gap: 10, padding: 16, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  cardPressed: { borderColor: colors.gold, transform: [{ scale: 0.98 }] },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clock: { fontFamily: fonts.bodyBold, color: colors.gold, fontSize: 14, fontVariant: ['tabular-nums'] },
  cardTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 22, lineHeight: 25 },
  cardMeta: { fontFamily: fonts.body, color: colors.muted, fontSize: 14 },
  cardValue: { fontFamily: fonts.display, color: colors.text, fontSize: 16 },
});
