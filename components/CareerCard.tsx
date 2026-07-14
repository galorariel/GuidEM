import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../constants/theme";

type Props = {
  item: { id: string; title: string; description: string };
  onPress: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  isGoal?: boolean;
  onSetGoal?: () => void;
};

export default function CareerCard({ item, onPress, isSaved, onToggleSave, isGoal, onSetGoal }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.actions}>
          {onSetGoal ? (
            <Pressable onPress={onSetGoal} hitSlop={10}>
              <Ionicons name={isGoal ? "compass" : "compass-outline"} size={20} color={isGoal ? colors.button : colors.muted} />
            </Pressable>
          ) : null}
          {onToggleSave ? (
            <Pressable onPress={onToggleSave} hitSlop={10}>
              <Text style={styles.heart}>{isSaved ? "♥" : "♡"}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text numberOfLines={2} style={styles.meta}>{item.description}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: colors.card },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: fonts.heading, color: colors.heading, flex: 1, paddingRight: 10 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  heart: { fontSize: 18, color: colors.accent },
  meta: { marginTop: 6, fontFamily: fonts.body, color: colors.accent },
});
