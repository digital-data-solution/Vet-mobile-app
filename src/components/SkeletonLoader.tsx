import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

// ─── Pulse animation shared across all skeletons on screen ───────────────────

function usePulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
    return () => opacity.stopAnimation();
  }, []);
  return opacity;
}

// ─── SkeletonRect — a single shimmer rectangle ────────────────────────────────

interface RectProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonRect({ width = '100%', height = 14, borderRadius = 6, style }: RectProps) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: '#E2E8F0' },
        { opacity },
        style,
      ]}
    />
  );
}

// ─── SkeletonCard — a card skeleton (avatar + 3 text lines) ──────────────────

interface CardProps {
  avatarShape?: 'circle' | 'rounded';
}

export function SkeletonCard({ avatarShape = 'rounded' }: CardProps) {
  const opacity = usePulse();
  const radius = avatarShape === 'circle' ? 26 : 14;
  return (
    <Animated.View style={[s.card, { opacity }]}>
      <View style={[s.avatar, { borderRadius: radius }]} />
      <View style={s.lines}>
        <View style={[s.line, { width: '65%', height: 14 }]} />
        <View style={[s.line, { width: '40%', height: 11, marginTop: 6 }]} />
        <View style={[s.line, { width: '80%', height: 11, marginTop: 6 }]} />
      </View>
    </Animated.View>
  );
}

// ─── SkeletonList — renders N cards for list screens ─────────────────────────

export default function SkeletonList({ count = 5, avatarShape = 'rounded' as 'circle' | 'rounded' }) {
  return (
    <View style={s.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} avatarShape={avatarShape} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  lines: { flex: 1 },
  line:  { backgroundColor: '#E2E8F0', borderRadius: 6 },
});
