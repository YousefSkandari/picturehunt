import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Mascot } from '@/components/mascot';
import { Display, Kicker, Screen, StageButton } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { avatars, colors, fonts } from '@/theme';

export default function Contestant() {
  const { session, refreshProfile } = useSession();
  const [picked, setPicked] = useState(0);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatar = avatars[picked];
  const stageName = name.trim() || avatar.label;

  async function takeTheStage() {
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ stage_name: stageName, avatar: avatar.key }).eq('id', session.user.id);
    setBusy(false);
    if (error) setError(error.message);
    else await refreshProfile(); // the root layout then opens the show
  }

  return (
    <Screen style={styles.screen}>
      <Animated.View entering={FadeInDown} style={{ gap: 10 }}>
        <Kicker>Final step</Kicker>
        <Display style={{ fontSize: 34 }}>Pick your contestant</Display>
      </Animated.View>

      <View style={styles.stage}>
        <Animated.View key={avatar.key} entering={ZoomIn.springify().damping(9)}>
          <Mascot size={128} color={avatar.color} />
        </Animated.View>
        <View style={styles.podium} />
        <View style={styles.nameTag}>
          <Text style={styles.nameTagText}>{stageName}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {avatars.map((a, i) => (
          <Pressable
            key={a.key}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            accessibilityState={{ selected: i === picked }}
            onPress={() => setPicked(i)}
            style={[styles.slot, i === picked && styles.slotOn]}>
            <Mascot size={52} color={a.color} still />
          </Pressable>
        ))}
      </View>

      <Text style={styles.label} nativeID="stageNameLabel">
        Stage name
      </Text>
      <TextInput
        accessibilityLabelledBy="stageNameLabel"
        style={styles.field}
        value={name}
        onChangeText={setName}
        maxLength={18}
        placeholder="e.g. Litter Legend"
        placeholderTextColor={colors.muted}
      />
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={{ flex: 1 }} />
      <StageButton label="Take the stage" onPress={takeTheStage} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingVertical: 24, gap: 14 },
  stage: { height: 210, alignItems: 'center', justifyContent: 'flex-end' },
  podium: { width: 170, height: 22, borderRadius: 85, backgroundColor: '#2A1E52', borderWidth: 3, borderColor: colors.gold, marginTop: -6 },
  nameTag: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.pink },
  nameTagText: { fontFamily: fonts.display, color: colors.text, fontSize: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  slot: { width: '30%', flexGrow: 1, height: 88, borderRadius: 22, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  slotOn: { borderColor: colors.gold, backgroundColor: '#2A1E52' },
  label: { fontFamily: fonts.bodyBold, color: colors.muted, fontSize: 14 },
  field: { height: 58, borderRadius: 18, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.bodyBold, fontSize: 18, paddingHorizontal: 18 },
  error: { fontFamily: fonts.bodyBold, color: colors.pink },
});
