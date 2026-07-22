import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const BRAND_COLORS = [
  "#107c8f", // Teal
  "#55C5B1", // Mint Green
  "#8b5cf6", // Purple
  "#f59e0b", // Gold
  "#ec4899", // Pink
  "#0284c7", // Sky Blue
];

interface Particle {
  id: number;
  color: string;
  size: number;
  isCircle: boolean;
  angle: number; // in radians
  distance: number;
  rotation: number; // in degrees
}

interface ConfettiPopProps {
  active: boolean;
  onAnimationEnd?: () => void;
}

export default function ConfettiPop({ active, onAnimationEnd }: ConfettiPopProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const particles = useRef<Particle[]>([]);

  if (particles.current.length === 0) {
    const NUM_PARTICLES = 20;
    particles.current = Array.from({ length: NUM_PARTICLES }, (_, i) => {
      const angle = (i / NUM_PARTICLES) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
      return {
        id: i,
        color: BRAND_COLORS[i % BRAND_COLORS.length],
        size: Math.floor(Math.random() * 5) + 6, // 6px - 10px
        isCircle: Math.random() > 0.4,
        angle,
        distance: Math.floor(Math.random() * 45) + 45, // 45px - 90px
        rotation: Math.floor(Math.random() * 360),
      };
    });
  }

  useEffect(() => {
    if (active) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        onAnimationEnd?.();
      });
    }
  }, [active]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      {particles.current.map((p) => {
        const targetX = Math.cos(p.angle) * p.distance;
        const targetY = Math.sin(p.angle) * p.distance;

        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, targetX],
        });

        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, targetY + 15], // gravity pull downwards
        });

        const scale = anim.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0.2, 1.2, 0.9, 0],
        });

        const rotate = anim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${p.rotation}deg`],
        });

        const opacity = anim.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 1, 0],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                width: p.size,
                height: p.isCircle ? p.size : p.size * 1.5,
                borderRadius: p.isCircle ? p.size / 2 : 2,
                backgroundColor: p.color,
                transform: [{ translateX }, { translateY }, { rotate }, { scale }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
  particle: {
    position: "absolute",
  },
});
