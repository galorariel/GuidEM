import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../constants/theme";
import type { GuideUnitFull } from "../../services/guide";

interface CompletedUnitNodeProps {
  x: number;
  y: number;
  unit: GuideUnitFull;
  decision: string | null;
  onPress: () => void;
}

const WIDTH = 220;
const HEIGHT = 76;

export default function CompletedUnitNode({
  x,
  y,
  unit,
  decision,
  onPress,
}: CompletedUnitNodeProps) {
  return (
    <View
      style={[
        styles.container,
        {
          left: x - WIDTH / 2,
          top: y - HEIGHT / 2,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.iconWrapper}>
          <Ionicons name="ribbon" size={24} color="#fff" />
        </View>
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.title}>
            {unit.title}
          </Text>
          <Text numberOfLines={1} style={styles.decision}>
            {decision ? `Focused: ${decision}` : "Journey Complete"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#fff" style={styles.chevron} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: WIDTH,
    height: HEIGHT,
    zIndex: 10,
  },
  card: {
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: colors.button,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderBottomWidth: 6,
    borderBottomColor: "#1b593e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: "#fff",
    marginBottom: 2,
  },
  decision: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
  },
  chevron: {
    marginLeft: 4,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.95,
  },
});
