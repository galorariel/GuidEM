import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../constants/theme";

type Props = {
  item: { id: string; title: string; category: string; location: string; priceLabel: string };
  onPress: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
};
export default function ActivityCard({ item, onPress, isSaved, onToggleSave }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imgStub} />
      <View style={styles.row}>
        <Text style={styles.title}>{item.title}</Text>
        {onToggleSave ? (<Pressable onPress={onToggleSave} hitSlop={10}><Text style={styles.heart}>{isSaved ? "♥" : "♡"}</Text></Pressable>) : null}
      </View>
      <Text style={styles.meta}>{item.category} • {item.location} • {item.priceLabel}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: colors.card },
  imgStub: { height: 120, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: "#E0E0E0", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: fonts.heading, color: colors.heading, flex: 1, paddingRight: 10 },
  heart: { fontSize: 18, color: colors.accent },
  meta: { marginTop: 6, fontFamily: fonts.body, color: colors.accent },
});
