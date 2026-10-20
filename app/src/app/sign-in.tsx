import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { BackIcon } from '@/components/icons';
import { Mascot } from '@/components/mascot';
import { Body, Display, Screen, StageButton } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme';

// Email one-time codes work on a fresh Supabase project. The concept design
// uses a phone number; switch to signInWithOtp({ phone }) once an SMS
// provider is configured.
export default function SignIn() {
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) setError(error.message);
    else setStage('code');
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    // On success the session guard in the root layout moves on to onboarding.
    if (error) setError(error.message);
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (stage === 'code' ? setStage('email') : router.back())} style={styles.back}>
          <BackIcon color={colors.text} />
        </Pressable>

        <Animated.View key={`host-${stage}`} entering={FadeInRight.springify()} style={styles.host}>
          <Mascot />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>
              {stage === 'email' ? "Welcome, contestant! First, what's your email?" : "Check your inbox. I've sent you a secret code!"}
            </Text>
          </View>
        </Animated.View>

        <Animated.View key={stage} entering={FadeInDown.springify()} style={styles.form}>
          <Display>{stage === 'email' ? 'Join the show' : 'Enter your code'}</Display>
          <Body>{stage === 'email' ? 'One account per person keeps every draw fair.' : `Sent to ${email.trim()}.`}</Body>
          <Text style={styles.label} nativeID="fieldLabel">
            {stage === 'email' ? 'Email' : '6-digit code'}
          </Text>
          {stage === 'email' ? (
            <TextInput
              accessibilityLabelledBy="fieldLabel"
              style={styles.field}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
            />
          ) : (
            <TextInput
              accessibilityLabelledBy="fieldLabel"
              style={[styles.field, styles.code]}
              value={code}
              onChangeText={setCode}
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={colors.border}
            />
          )}
          {error && <Text style={styles.error}>{error}</Text>}
        </Animated.View>

        <View style={styles.fill} />
        {stage === 'email' ? (
          <StageButton label="Send my code" onPress={sendCode} loading={busy} disabled={!email.includes('@')} />
        ) : (
          <StageButton label="Verify and continue" onPress={verify} loading={busy} disabled={code.trim().length < 6} />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  host: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 24 },
  bubble: { flex: 1, backgroundColor: colors.text, borderRadius: 20, borderBottomLeftRadius: 6, padding: 14 },
  bubbleText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 16, lineHeight: 21 },
  form: { gap: 12, marginTop: 28 },
  label: { fontFamily: fonts.bodyBold, color: colors.muted, fontSize: 14, marginTop: 8 },
  field: {
    height: 62,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    paddingHorizontal: 18,
  },
  code: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 14, textAlign: 'center' },
  error: { fontFamily: fonts.bodyBold, color: colors.pink },
});
