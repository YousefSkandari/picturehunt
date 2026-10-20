// Flimpy's game-show palette and type, matching the concept designs.
export const colors = {
  ground: '#0E0A1F',
  map: '#120D27',
  surface: '#1B1336',
  surfaceRaised: '#241947',
  border: '#3A2C66',
  gold: '#FFC83D',
  goldShadow: '#B9851A',
  pink: '#FF4F9A',
  pinkShadow: '#B02E68',
  mint: '#3EE6B0',
  blue: '#5B8CFF',
  ink: '#1A1033',
  text: '#FFFFFF',
  muted: '#B9B0D9',
} as const;

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  body: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const avatars = [
  { key: 'sparkle', label: 'Sparkle', color: '#FF4F9A' },
  { key: 'goldie', label: 'Goldie', color: '#FFC83D' },
  { key: 'minty', label: 'Minty', color: '#3EE6B0' },
  { key: 'blu', label: 'Blu', color: '#5B8CFF' },
  { key: 'blaze', label: 'Blaze', color: '#FF8A3D' },
  { key: 'vee', label: 'Vee', color: '#B07CFF' },
] as const;

export function avatarColor(key: string | null | undefined) {
  return avatars.find((a) => a.key === key)?.color ?? colors.pink;
}
