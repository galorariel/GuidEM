import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors, fonts } from "../constants/theme";

type Props = {
  item: {
    id: string;
    title: string;
    category: string;
    location: string;
    priceLabel: string;
    imageUrl?: string | null;
  };
  onPress: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
};

const CATEGORY_IMAGES: Record<string, string> = {
  "Volunteering": "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=800&q=80",
  "Workshop": "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
  "Internship": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
  "University Visit": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80",
  "Job Shadowing": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  "Professional Meetings": "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
};

export default function ActivityCard({ item, onPress, isSaved, onToggleSave }: Props) {
  const displayImage = item.imageUrl || CATEGORY_IMAGES[item.category] || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80";

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image
        source={{ uri: displayImage }}
        style={styles.img}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.row}>
        <Text style={styles.title}>{item.title}</Text>
        {onToggleSave ? (
          <Pressable onPress={onToggleSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.heartButton}>
            <Ionicons name={isSaved ? "heart" : "heart-outline"} size={24} color={isSaved ? colors.accent : colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.meta}>{item.category} • {item.location} • {item.priceLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 12, backgroundColor: colors.card, overflow: "hidden" },
  img: { height: 130, borderRadius: 8, marginBottom: 10, backgroundColor: "rgba(0,0,0,0.05)" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: fonts.heading, color: colors.heading, flex: 1, paddingRight: 10, fontSize: 16 },
  heartButton: { padding: 4 },
  meta: { marginTop: 6, fontFamily: fonts.body, color: colors.accent },
});
