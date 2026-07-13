import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import CustomButton from "../components/CustomButton";
import { colors, fonts } from "../constants/theme";
import { useAuth } from "../hooks/AuthContext";
import { getActivity, type Activity } from "../services/catalog";
import { addSaved, getSavedActivityIds, removeSaved } from "../services/supabase";

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const a = await getActivity(String(id));
      setActivity(a);
      if (user && a) {
        const ids = await getSavedActivityIds(user.id);
        setIsSaved(ids.includes(a.id));
      }
      setLoading(false);
    })();
  }, [id, user]);

  const toggleSave = async () => {
    if (!activity) return;
    if (!user) { Alert.alert("Not signed in", "Please sign in first."); return; }
    try {
      if (isSaved) { await removeSaved(user.id, activity.id); setIsSaved(false); }
      else { await addSaved(user.id, activity.id); setIsSaved(true); }
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", "Could not update saved list.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!activity) return <View style={styles.center}><Text style={styles.value}>Activity not found</Text></View>;

  const price = activity.priceAmount === 0 ? "Free" : `${activity.priceCurrency}${activity.priceAmount}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity Details</Text>
      <View style={styles.imgStub} />

      <Text style={styles.label}>Title</Text>
      <Text style={styles.value}>{activity.title}</Text>
      <Text style={styles.label}>Category</Text>
      <Text style={styles.value}>{activity.category}</Text>
      <Text style={styles.label}>Location</Text>
      <Text style={styles.value}>{activity.location}</Text>
      <Text style={styles.label}>Price</Text>
      <Text style={styles.value}>{price}</Text>
      <Text style={styles.label}>Description</Text>
      <Text style={styles.value}>{activity.description}</Text>

      <CustomButton title={isSaved ? "Unsave" : "Save"} onPress={toggleSave} disabled={!user} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 60, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  title: { fontSize: 18, fontFamily: fonts.heading, color: colors.heading, marginBottom: 12 },
  imgStub: { height: 160, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: "#E0E0E0", marginBottom: 12 },
  label: { fontFamily: fonts.bodyBold, color: colors.accent, marginTop: 12 },
  value: { fontFamily: fonts.body, color: colors.accent, marginTop: 2 },
});
