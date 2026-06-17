import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  messages: string[];
  color?: string;
  bgColor?: string;
  borderColor?: string;
  intervalMs?: number;
  icon?: string;
}

export default function MarketplaceBanner({
  messages,
  color = '#1A56DB',
  bgColor = '#EFF6FF',
  borderColor,
  intervalMs = 4500,
  icon = '📢',
}: Props) {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (messages.length <= 1) return;
    const tick = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % messages.length);
        Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      });
    }, intervalMs);
    return () => clearInterval(tick);
  }, [messages.length, intervalMs, opacity]);

  if (!messages.length) return null;

  return (
    <View style={[s.wrap, { backgroundColor: bgColor, borderColor: borderColor ?? color + '40' }]}>
      <Text style={s.icon}>{icon}</Text>
      <Animated.Text style={[s.text, { color, opacity }]}>{messages[index]}</Animated.Text>
      <View style={[s.dot, { backgroundColor: color + '60' }]} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },
  icon: { fontSize: 16 },
  text: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  dot:  { width: 6, height: 6, borderRadius: 3 },
});
