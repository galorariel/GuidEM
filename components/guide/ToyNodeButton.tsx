import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface ToyNodeButtonProps {
  size?: number;
  topColor: string;
  sideColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  disabled?: boolean;
  onPress?: () => void;
  isCurrent?: boolean;
  isLoading?: boolean;
}

export default function ToyNodeButton({
  size = 60,
  topColor,
  sideColor,
  iconName,
  iconSize,
  iconColor = "#ffffff",
  disabled = false,
  onPress,
  isCurrent = false,
  isLoading = false,
}: ToyNodeButtonProps) {
  // 0 = raised (default 3D state), 1 = pressed down flat
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 50,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.delay(40),
      Animated.timing(pressAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const DEPTH = Math.max(5, Math.round(size * 0.1)); // 3D side wall height (5-6px)
  const actualIconSize = iconSize ?? Math.round(size * 0.44);

  // Top face moves down by DEPTH - 1px when pressed
  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DEPTH, -1],
  });

  // Scale slightly compresses for tactile physical feel
  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.97],
  });

  return (
    <View style={[styles.outerContainer, { width: size, height: size + DEPTH }]}>
      {/* Soft ambient drop shadow underneath */}
      <View
        style={[
          styles.shadowBase,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            bottom: 0,
          },
        ]}
      />

      {/* 3D Darker Side Wall (molded plastic base) */}
      <View
        style={[
          styles.sideWall,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: sideColor,
            bottom: 0,
          },
        ]}
      />

      {/* Interactive 3D Top Face */}
      <Pressable
        onPress={disabled || isLoading ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        style={styles.pressableArea}
      >
        <Animated.View
          style={[
            styles.topFace,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: topColor,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          {/* Subtle glossy top highlight curve */}
          <View style={[styles.glossHighlight, { borderRadius: (size - 6) / 2 }]} />

          {isLoading ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Ionicons name={iconName} size={actualIconSize} color={iconColor} />
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    justifyContent: "flex-end",
    alignItems: "center",
  },
  shadowBase: {
    position: "absolute",
    backgroundColor: "#000",
    opacity: 0.12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  sideWall: {
    position: "absolute",
  },
  pressableArea: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  topFace: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    overflow: "hidden",
  },
  glossHighlight: {
    position: "absolute",
    top: 2,
    left: 4,
    right: 4,
    height: "35%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
});
