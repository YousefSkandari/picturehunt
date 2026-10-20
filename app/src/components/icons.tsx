import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { size?: number; color: string };

const stroke = (color: string) => ({ stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' });

export function MapIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" {...stroke(color)} />
    </Svg>
  );
}

export function TrophyIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4c0 3 1.5 4.5 3.5 5M17 6h3c0 3-1.5 4.5-3.5 5M12 14v4M8 21h8" {...stroke(color)} />
    </Svg>
  );
}

export function GiftIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8C9 8 7 4 9.5 3.5S12 8 12 8zm0 0c3 0 5-4 2.5-4.5S12 8 12 8z" {...stroke(color)} />
    </Svg>
  );
}

export function CameraIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...stroke(color)} />
      <Circle cx={12} cy={13} r={3.5} {...stroke(color)} />
    </Svg>
  );
}

export function LockIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={11} width={14} height={10} rx={2} {...stroke(color)} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...stroke(color)} />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke(color)} strokeWidth={3} />
    </Svg>
  );
}

export function StarIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" fill={color} />
    </Svg>
  );
}

export function BackIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M19 12H5M11 6l-6 6 6 6" {...stroke(color)} strokeWidth={2.4} />
    </Svg>
  );
}
