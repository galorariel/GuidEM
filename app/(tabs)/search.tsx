import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ActivityCard from "../../components/ActivityCard";
import CareerCard from "../../components/CareerCard";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { searchActivities, searchCareers, type Activity, type Career } from "../../services/catalog";
import { addSaved, getSavedActivityIds, removeSaved } from "../../services/supabase";

type Mode = "careers" | "activities";
const DEMANDS = ["very_high", "high", "moderate", "stable", "low"];
const CATEGORIES = ["Volunteering", "Extracurricular", "Professional Meetings", "Workshop", "Job Shadowing", "Internship", "University Visit"];

function priceLabel(a: Activity) {
  return a.priceAmount === 0 ? "Free" : `${a.priceCurrency}${a.priceAmount}`;
}

export default function Search() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("careers");
  const [query, setQuery] = useState("");
  const [demand, setDemand] = useState("");
  const [category, setCategory] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [careers, setCareers] = useState<Career[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setSavedIds([]); return; }
    getSavedActivityIds(user.id).then(setSavedIds);
  }, [user]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      if (mode === "careers") {
        const r = await searchCareers(query, demand ? { demandLevel: demand } : {});
        if (active) setCareers(r);
      } else {
        const budget = maxBudget.trim() ? Number(maxBudget) : null;
        const r = await searchActivities(query, { category: category || undefined, maxBudget: Number.isFinite(budget as number) ? budget : null });
        if (active) setActivities(r);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [query, mode, demand, category, maxBudget, user]);

  const toggleSave = async (id: string) => {
    if (!user) { router.push("/sign-in"); return; }
    if (savedIds.includes(id)) { await removeSaved(user.id, id); setSavedIds((p) => p.filter((x) => x !== id)); }
    else { await addSaved(user.id, id); setSavedIds((p) => [...p, id]); }
  };

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Search</Text>

      <View style={styles.segment}>
        {(["careers", "activities"] as Mode[]).map((m) =>
          chip(m === "careers" ? "Careers" : "Activities", mode === m, () => setMode(m))
        )}
      </View>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={mode === "careers" ? "Search careers (e.g. engineer)" : "Search activities (e.g. internship)"}
        placeholderTextColor={colors.muted}
      />

      <View style={styles.filterRow}>
        {mode === "careers"
          ? DEMANDS.map((d) => chip(d.replace("_", " "), demand === d, () => setDemand(demand === d ? "" : d)))
          : CATEGORIES.map((c) => chip(c, category === c, () => setCategory(category === c ? "" : c)))}
      </View>
      {mode === "activities" && (
        <TextInput style={styles.input} value={maxBudget} onChangeText={setMaxBudget} placeholder="Max budget (e.g. 20)" keyboardType="numeric" placeholderTextColor={colors.muted} />
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
      ) : mode === "careers" ? (
        <FlatList
          data={careers}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CareerCard item={item} onPress={() => router.push(`/career?id=${item.id}` as any)} />}
          ListEmptyComponent={<Text style={styles.empty}>No careers found.</Text>}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <ActivityCard
              item={{ id: item.id, title: item.title, category: item.category, location: item.location, priceLabel: priceLabel(item) }}
              isSaved={savedIds.includes(item.id)}
              onToggleSave={user ? () => toggleSave(item.id) : undefined}
              onPress={() => router.push(`/detail?id=${item.id}` as any)}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No activities found.</Text>}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 60, backgroundColor: colors.bg },
  h1: { fontSize: 28, fontFamily: fonts.heading, color: colors.heading, marginBottom: 12 },
  segment: { flexDirection: "row", gap: 8, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginBottom: 10, fontFamily: fonts.body, color: colors.heading },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.body, color: colors.heading, fontSize: 13 },
  chipTextActive: { color: "#fff" },
  empty: { marginTop: 12, fontFamily: fonts.body, color: colors.muted },
});
