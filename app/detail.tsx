import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Soft3DBlock from "../components/Soft3DBlock";
import ToyNodeButton from "../components/guide/ToyNodeButton";
import { colors, fonts } from "../constants/theme";
import { useAuth } from "../hooks/AuthContext";
import { getActivity, type Activity } from "../services/catalog";
import { addSaved, getProfile, getSavedActivityIds, removeSaved } from "../services/supabase";
import { useTutorial } from "../hooks/TutorialContext";

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showTutorial } = useTutorial();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading && activity && role === "student") {
      showTutorial("activity_detail");
    }
  }, [loading, activity, role]);

  useEffect(() => {
    (async () => {
      const a = await getActivity(String(id));
      setActivity(a);
      if (user && a) {
        const [ids, p] = await Promise.all([
          getSavedActivityIds(user.id),
          getProfile(user.id),
        ]);
        setIsSaved(ids.includes(a.id));
        const userRole = (p?.role && p.role.trim() !== '') ? p.role.toLowerCase() : "student";
        setRole(userRole);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const toggleSave = async () => {
    if (!activity) return;
    if (!user) {
      Alert.alert("Not signed in", "Please sign in first.");
      return;
    }
    try {
      if (isSaved) {
        await removeSaved(user.id, activity.id);
        setIsSaved(false);
      } else {
        await addSaved(user.id, activity.id);
        setIsSaved(true);
      }
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", "Could not update saved list.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!activity) return <View style={styles.center}><Text style={styles.value}>Activity not found</Text></View>;

  const price = activity.priceAmount === 0 ? "Free" : `${activity.priceCurrency}${activity.priceAmount}`;

  const CATEGORY_IMAGES: Record<string, string> = {
    "Volunteering": "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=800&q=80",
    "Workshop": "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
    "Internship": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    "University Visit": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80",
    "Job Shadowing": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    "Professional Meetings": "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
  };
  const displayImage = activity.imageUrl || CATEGORY_IMAGES[activity.category] || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80";

  return (
    <View style={styles.mainWrapper}>
      {/* Subtle decorative background shapes */}
      <View style={styles.bgDecor1} />
      <View style={styles.bgDecor2} />

      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          <Image source={{ uri: displayImage }} style={styles.bannerImg} contentFit="cover" transition={200} />
        </View>

        {/* Hero Title Block */}
        <Soft3DBlock
          title={activity.title}
          subtitle={`${activity.category} • ${price}`}
          iconName="sparkles-outline"
          theme="teal"
          index={0}
          badgeText={price.toUpperCase()}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroCategory}>{activity.category}</Text>
            </View>
            {user ? (
              <ToyNodeButton
                size={44}
                topColor={isSaved ? "#ec4899" : "#cbd5e1"}
                sideColor={isSaved ? "#be185d" : "#94a3b8"}
                iconName={isSaved ? "heart" : "heart-outline"}
                iconSize={22}
                onPress={toggleSave}
              />
            ) : null}
          </View>
        </Soft3DBlock>

        {/* Block 1: Activity Overview */}
        <Soft3DBlock
          title="Activity Overview"
          iconName="document-text-outline"
          theme="blue"
          index={1}
        >
          <Text style={styles.bodyText}>{activity.description}</Text>
        </Soft3DBlock>

        {/* Block 2: Location & Event Format */}
        <Soft3DBlock
          title="Location & Event Format"
          subtitle={activity.location}
          iconName="location-outline"
          theme="teal"
          index={2}
        >
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Venue / Location:</Text>
            <Text style={styles.detailValue}>{activity.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{activity.category}</Text>
          </View>
        </Soft3DBlock>

        {/* Block 3: Pricing & Access */}
        <Soft3DBlock
          title="Pricing & Access"
          subtitle={`Cost: ${price}`}
          iconName="pricetag-outline"
          theme="green"
          index={3}
        >
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Registration Fee:</Text>
            <Text style={[styles.detailValue, { color: colors.button }]}>{price}</Text>
          </View>
        </Soft3DBlock>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  bgDecor1: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#8b5cf6",
    opacity: 0.05,
  },
  bgDecor2: {
    position: "absolute",
    bottom: 80,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#107c8f",
    opacity: 0.05,
  },
  bannerContainer: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  heroCategory: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.accent,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.heading,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  detailValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.heading,
  },
  value: {
    fontFamily: fonts.body,
    color: colors.heading,
  },
});
