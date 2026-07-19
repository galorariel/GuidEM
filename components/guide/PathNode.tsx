import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../constants/theme";
import type { StepKind } from "../../services/guide/generator";

interface PathNodeProps {
  x: number;
  y: number;
  title: string;
  kind: StepKind;
  state: "completed" | "current" | "locked";
  labelPosition: "left" | "right";
  onPress: () => void;
}

const NODE_SIZE = 60;

export default function PathNode({
  x,
  y,
  title,
  kind,
  state,
  labelPosition,
  onPress,
}: PathNodeProps) {
  // Pulsing animation for the current node's background ring
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (state === "current") {
      const pulse = Animated.parallel([
        Animated.timing(pulseScale, {
          toValue: 1.4,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]);

      Animated.loop(pulse).start();
    }
  }, [state]);

  // Map step kinds to vector icons
  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    if (state === "completed") return "checkmark";
    if (state === "locked") return "lock-closed";

    switch (kind) {
      case "lesson":
        return "book";
      case "task":
        return "construct";
      case "reflection":
        return "chatbubble-ellipses";
      case "resource":
        return "library";
      case "quiz":
        return "help-circle";
      default:
        return "play-forward";
    }
  };

  const getBackgroundColor = () => {
    switch (state) {
      case "completed":
        return colors.button; // Green
      case "current":
        return colors.accent; // Teal
      case "locked":
        return colors.muted + "40"; // Semi-transparent grey
    }
  };

  const isCompleted = state === "completed";
  const isCurrent = state === "current";
  const isLocked = state === "locked";

  const labelOffset = NODE_SIZE / 2 + 12;

  return (
    <View
      style={[
        styles.container,
        {
          left: x - NODE_SIZE / 2,
          top: y - NODE_SIZE / 2,
        },
      ]}
    >
      {/* Pulse effect behind current node */}
      {isCurrent && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
              borderColor: colors.accent,
            },
          ]}
        />
      )}

      {/* Main interactive node button */}
      <Pressable
        onPress={onPress}
        disabled={isLocked}
        style={({ pressed }) => [
          styles.node,
          { backgroundColor: getBackgroundColor() },
          isCurrent && styles.currentNode,
          pressed && !isLocked && styles.pressed,
        ]}
      >
        <Ionicons
          name={getIconName()}
          size={isCurrent ? 28 : 24}
          color={isLocked ? colors.muted : "#fff"}
        />
      </Pressable>

      {/* Floating step label beside the node */}
      <View
        pointerEvents="none"
        style={[
          styles.labelWrapper,
          labelPosition === "left"
            ? { right: labelOffset, alignItems: "flex-end" }
            : { left: labelOffset, alignItems: "flex-start" },
        ]}
      >
        <View style={styles.bubble}>
          <Text
            numberOfLines={2}
            style={[
              styles.labelText,
              isLocked && styles.labelLocked,
              isCurrent && styles.labelCurrent,
            ]}
          >
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: NODE_SIZE,
    height: NODE_SIZE,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 3,
    borderColor: "#fff",
  },
  currentNode: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.05 }],
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  pulseRing: {
    position: "absolute",
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 4,
  },
  labelWrapper: {
    position: "absolute",
    width: 140,
    justifyContent: "center",
  },
  bubble: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  labelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.heading,
    textAlign: "center",
  },
  labelLocked: {
    color: colors.muted,
    fontFamily: fonts.body,
  },
  labelCurrent: {
    color: colors.accent,
  },
});
