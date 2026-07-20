import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../constants/theme";

const STATUS_MESSAGES = [
  "Analyzing your profile…",
  "Building your learning path…",
  "Personalizing content…",
  "Curating resources…",
  "Almost there…",
];

const TOTAL_DURATION = 14000; // 14 seconds to reach ~88%
const MESSAGE_INTERVAL = 2800; // cycle messages every 2.8s

interface Props {
  /** Optional label shown above the bar */
  label?: string;
}

export default function GeneratingProgressBar({ label }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const [messageIndex, setMessageIndex] = useState(0);

  // Animate progress from 0 → 0.88 with easing (fast start, slows down)
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0.88,
      duration: TOTAL_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => progress.stopAnimation();
  }, []);

  // Subtle pulse glow on the progress bar tip
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Cycle status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, MESSAGE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const widthPercent = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const displayPercent = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  // We need to track a numeric value for the percentage text
  const [displayNum, setDisplayNum] = useState(0);
  useEffect(() => {
    const listenerId = progress.addListener(({ value }) => {
      setDisplayNum(Math.round(value * 100));
    });
    return () => progress.removeListener(listenerId);
  }, []);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Progress bar track */}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: widthPercent,
              opacity: pulseAnim,
            },
          ]}
        />
      </View>

      {/* Percentage + status message */}
      <View style={styles.infoRow}>
        <Text style={styles.statusText}>{STATUS_MESSAGES[messageIndex]}</Text>
        <Text style={styles.percentText}>{displayNum}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  label: {
    fontFamily: fonts.bodyBold,
    color: colors.heading,
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: `${colors.accent}20`,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  statusText: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 13,
  },
  percentText: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    fontSize: 13,
  },
});
