import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import ActivityCard from "../../components/ActivityCard";
import { activities, type Activity } from "../../data/activities";
import { useAuth } from "../../hooks/AuthContext";
import { getSavedActivityIds } from "../../services/supabase";

export default function Saved() {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = async () => {
    if (!user) {
      setSavedIds([]);
      setLoading(false);
      return;
    }
    try {
      setSavedIds(await getSavedActivityIds(user.id));
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load saved items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSaved();
    setRefreshing(false);
  };

  const savedItems: Activity[] = savedIds
    .map((id) => activities.find((a) => a.id === id))
    .filter(Boolean) as Activity[];

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Saved</Text>
      {loading ? (
        <Text style={{ marginTop: 12 }}>Loading...</Text>
      ) : (
        <>
          <Text style={styles.sub}>You have saved {savedItems.length} items</Text>
          <FlatList
            data={savedItems}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <ActivityCard
                item={{ id: item.id, title: item.title, category: item.category, location: item.location, priceLabel: item.price }}
                isSaved
                onPress={() => router.push(`/detail?id=${item.id}`)}
              />
            )}
            ListEmptyComponent={<Text style={{ marginTop: 12 }}>No saved items yet.</Text>}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 60, backgroundColor: "#e2f5ff" },
  h1: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#203b60" },
  sub: { marginTop: 6, marginBottom: 14, fontFamily: "Inter_400Regular", color: "#107c8f" },
});