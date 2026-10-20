import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarIcon } from '@/components/icons';
import { Mascot } from '@/components/mascot';
import { Display, GhostButton, Stat } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { avatarColor, colors, fonts } from '@/theme';

type EarnedBadge = { badge_slug: string; awarded_at: string; badges: { name: string; description: string } | null };

export default function Trophies() {
  const { profile, refreshProfile } = useSession();
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [shows, setShows] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      supabase
        .from('user_badges')
        .select('badge_slug, awarded_at, badges(name, description)')
        .order('awarded_at', { ascending: false })
        .returns<EarnedBadge[]>()
        .then(({ data }) => setBadges(data ?? []));
      supabase
        .from('participations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'verified')
        .then(({ count }) => setShows(count ?? 0));
    }, [refreshProfile]),
  );

  const selected = picked === null ? null : badges[picked];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown} style={styles.header}>
          <Mascot size={64} color={avatarColor(profile?.avatar)} />
          <View style={{ flex: 1 }}>
            <Display style={{ fontSize: 26, lineHeight: 30 }}>{profile?.stage_name}</Display>
            <View style={styles.stars}>
              <StarIcon size={16} color={colors.gold} />
              <Text style={styles.starsText}>{(profile?.stars ?? 0).toLocaleString()} stars</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={styles.stats}>
          <Stat label="Shows played" value={String(shows)} />
          <Stat label="Badges" value={String(badges.length)} color={colors.mint} />
        </Animated.View>

        <Text style={styles.section}>Trophy cabinet</Text>
        {badges.length === 0 ? (
          <Text style={styles.empty}>Play your first show to start your collection.</Text>
        ) : (
          <View style={styles.grid}>
            {badges.map((b, i) => (
              <Animated.View key={`${b.badge_slug}-${b.awarded_at}`} entering={ZoomIn.delay(80 * i).springify()} style={styles.slotWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: picked === i }}
                  onPress={() => setPicked(i)}
                  style={[styles.slot, picked === i && styles.slotOn]}>
                  <View style={[styles.medal, { backgroundColor: b.badge_slug === 'first_win' ? colors.gold : colors.mint }]}>
                    <StarIcon size={26} color={colors.text} />
                  </View>
                  <Text style={styles.slotLabel} numberOfLines={1}>
                    {b.badges?.name}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
        {selected && (
          <Animated.View key={picked} entering={FadeInDown.springify()} style={styles.detail}>
            <Text style={styles.detailTitle}>{selected.badges?.name}</Text>
            <Text style={styles.empty}>
              {selected.badges?.description} Earned {new Date(selected.awarded_at).toLocaleDateString()}.
            </Text>
          </Animated.View>
        )}

        <View style={{ marginTop: 24 }}>
          <GhostButton label="Sign out" onPress={() => supabase.auth.signOut()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  starsText: { fontFamily: fonts.bodyBold, color: colors.gold, fontSize: 14 },
  stats: { flexDirection: 'row', gap: 10 },
  section: { fontFamily: fonts.display, color: colors.text, fontSize: 22 },
  empty: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotWrap: { width: '31%' },
  slot: { height: 104, borderRadius: 20, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 6 },
  slotOn: { borderColor: colors.gold, backgroundColor: '#2A1E52' },
  medal: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  slotLabel: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 12, paddingHorizontal: 4 },
  detail: { padding: 16, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, gap: 4 },
  detailTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 18 },
});
