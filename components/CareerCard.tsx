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
      <Text style={styles.title}>{item.title}</Text>
      <Text numberOfLines={4} style={styles.meta}>{item.description}</Text>
      
      {(onSetGoal || onToggleSave) && (
        <View style={styles.actions}>
          {onSetGoal ? (
            <Pressable onPress={onSetGoal} hitSlop={10} style={styles.actionButton}>
              <Ionicons name={isGoal ? "compass" : "compass-outline"} size={24} color={isGoal ? colors.button : colors.muted} />
              <Text style={[styles.actionText, { color: isGoal ? colors.button : colors.muted }]}>
                {isGoal ? "Current Goal" : "Set Goal"}
              </Text>
            </Pressable>
          ) : null}
          
          {onToggleSave ? (
            <Pressable onPress={onToggleSave} hitSlop={10} style={styles.actionButton}>
              <Ionicons name={isSaved ? "heart" : "heart-outline"} size={24} color={isSaved ? colors.accent : colors.muted} />
              <Text style={[styles.actionText, { color: isSaved ? colors.accent : colors.muted }]}>
                {isSaved ? "Saved" : "Save"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 16, backgroundColor: colors.card },
  title: { fontSize: 20, fontFamily: fonts.heading, color: colors.heading, marginBottom: 8 },
  meta: { fontFamily: fonts.body, color: colors.accent, lineHeight: 22 },
  actions: { flexDirection: "row", justifyContent: "space-around", marginTop: 16, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", paddingTop: 16 },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
