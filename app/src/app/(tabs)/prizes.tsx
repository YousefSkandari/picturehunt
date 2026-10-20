import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOutRight, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Display } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Prize } from '@/lib/types';
import { colors, fonts } from '@/theme';

export default function Prizes() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase.rpc('my_prizes').then(({ data, error }) => {
        if (error) setError(error.message);
        else setPrizes(data ?? []);
      });
    }, []),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Display style={{ fontSize: 28 }}>My prizes</Display>
        {error && <Text style={styles.error}>{error}</Text>}
        {prizes.length === 0 && !error && <Text style={styles.empty}>No wins yet. Every verified show puts you in the draw.</Text>}
        {prizes.map((p, i) => (
          <Animated.View key={p.win_id} entering={FadeInDown.delay(100 * i).springify()}>
            <PrizeTicket prize={p} />
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function PrizeTicket({ prize }: { prize: Prize }) {
  const [revealed, setRevealed] = useState(false);
  const isCode = prize.kind === 'discount_code' && prize.code;

  return (
    <View style={styles.ticket}>
      <View style={styles.ticketTop}>
        <Text style={styles.ticketKicker}>{prize.kind === 'cash' ? 'CASH PRIZE' : 'PRIZE'}</Text>
        <Text style={styles.ticketTitle}>{prize.reward_title}</Text>
        <Text style={styles.ticketMeta}>{prize.activity_title}</Text>
      </View>
      <View style={styles.ticketBottom}>
        {isCode ? (
          <View style={styles.codeBox}>
            {revealed ? (
              <Animated.Text entering={ZoomIn.springify().damping(8)} style={styles.code} selectable>
                {prize.code}
              </Animated.Text>
            ) : (
              <Animated.View exiting={FadeOutRight} style={StyleSheet.absoluteFill}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reveal your code"
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setRevealed(true);
                  }}
                  style={styles.scratch}>
                  <Text style={styles.scratchLabel}>Tap to scratch</Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        ) : (
          <Animated.Text entering={FadeIn} style={styles.ticketMeta}>
            {prize.redeemed_at ? 'Paid out' : "We'll be in touch to pay this out."}
          </Animated.Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 20, gap: 18 },
  error: { fontFamily: fonts.bodyBold, color: colors.pink },
  empty: { fontFamily: fonts.body, color: colors.muted, fontSize: 15 },
  ticket: { borderRadius: 26, overflow: 'hidden', backgroundColor: colors.surface },
  ticketTop: { backgroundColor: colors.gold, padding: 18, gap: 4 },
  ticketKicker: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 12, letterSpacing: 1.5 },
  ticketTitle: { fontFamily: fonts.display, color: colors.ink, fontSize: 34, lineHeight: 36 },
  ticketMeta: { fontFamily: fonts.bodyBold, color: colors.muted, fontSize: 14 },
  ticketBottom: { padding: 18, borderTopWidth: 2, borderStyle: 'dashed', borderTopColor: colors.border },
  codeBox: { height: 72, borderRadius: 16, backgroundColor: colors.ground, alignItems: 'center', justifyContent: 'center' },
  code: { fontFamily: fonts.display, color: colors.gold, fontSize: 26, letterSpacing: 2 },
  scratch: { flex: 1, borderRadius: 16, backgroundColor: '#C5BEE2', alignItems: 'center', justifyContent: 'center' },
  scratchLabel: { fontFamily: fonts.display, color: colors.ink, fontSize: 18 },
});
