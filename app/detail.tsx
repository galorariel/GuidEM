import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import CustomButton from "../components/CustomButton";
import { activities, type Activity } from "../data/activities";
import { useAuth } from "../hooks/AuthContext";
import { addSaved, getSavedActivityIds, removeSaved } from "../services/supabase";

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activity = activities.find((item: Activity) => item.id === String(id));

  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user || !activity) {
        setLoading(false);
        return;
      }
      const ids = await getSavedActivityIds(user.id);
      setIsSaved(ids.includes(activity.id));
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
      console.error(e);
      Alert.alert("Error", "Could not update saved list.");
    }
  };

  if (!activity) {
    return (
      <View style={styles.container}>
        <Text>Activity not found</Text>
      </View>
    );
  }

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
      <Text style={styles.value}>{activity.price}</Text>

      <Text style={styles.label}>Description</Text>
      <Text style={styles.value}>{activity.description}</Text>

      <CustomButton
        title={loading ? "Loading..." : isSaved ? "Unsave" : "Save"}
        onPress={toggleSave}
        disabled={loading || !user}
      />

      <CustomButton title="Get Directions (Coming Soon)" onPress={() => {}} />
      <CustomButton title="Share (Coming Soon)" onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 60, backgroundColor: "#e2f5ff" },
  title: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#203b60', marginBottom: 12 },
  imgStub: {
    height: 160,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111",
    backgroundColor: "#E0E0E0",
    marginBottom: 12,
  },
  label: { fontFamily: 'Inter_700Bold', color: '#107c8f', marginTop: 12 },
  value: { fontFamily: 'Inter_400Regular', color: '#107c8f', marginTop: 2 },
});