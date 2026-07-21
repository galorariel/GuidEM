import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ActivityCard from "../../components/ActivityCard";
import CareerCard from "../../components/CareerCard";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { searchActivities, searchCareers, type Activity, type Career } from "../../services/catalog";
import { addSaved, getProfile, getSavedActivityIds, getSavedIds, removeSaved, setCareerGoal } from "../../services/supabase";
import { authErrorMessage } from "../../services/authErrors";

type Mode = "careers" | "activities";
const CATEGORIES = ["Volunteering", "Extracurricular", "Professional Meetings", "Workshop", "Job Shadowing", "Internship", "University Visit"];

function priceLabel(a: Activity) {
  return a.priceAmount === 0 ? "Free" : `${a.priceCurrency}${a.priceAmount}`;
}

export default function Search() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("careers");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [careers, setCareers] = useState<Career[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedCareerIds, setSavedCareerIds] = useState<string[]>([]);
  const [goalCareerId, setGoalCareerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Refresh saved/goal state on focus (not just mount) so the ♥ and compass
  // reflect changes made on other tabs (e.g. clearing/setting the goal).
  useFocusEffect(
    useCallback(() => {
      if (!user) { setSavedIds([]); setSavedCareerIds([]); setGoalCareerId(null); return; }
      getSavedActivityIds(user.id).then(setSavedIds);
      getSavedIds(user.id, "career").then(setSavedCareerIds);
      getProfile(user.id).then((p) => setGoalCareerId(p?.career ?? null));
    }, [user])
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      if (mode === "careers") {
        const r = await searchCareers(query);
        if (active) setCareers(r);
      } else {
        const budget = maxBudget.trim() ? Number(maxBudget) : null;
        const r = await searchActivities(query, { category: category || undefined, maxBudget: Number.isFinite(budget as number) ? budget : null });
        if (active) setActivities(r);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [query, mode, category, maxBudget, user]);

  const toggleSave = async (id: string) => {
    if (!user) { router.push("/sign-in"); return; }
    if (savedIds.includes(id)) { await removeSaved(user.id, id); setSavedIds((p) => p.filter((x) => x !== id)); }
    else { await addSaved(user.id, id); setSavedIds((p) => [...p, id]); }
  };

  const toggleSaveCareer = async (id: string) => {
    if (!user) { router.push("/sign-in"); return; }
    if (savedCareerIds.includes(id)) { await removeSaved(user.id, id, "career"); setSavedCareerIds((p) => p.filter((x) => x !== id)); }
    else { await addSaved(user.id, id, "career"); setSavedCareerIds((p) => [...p, id]); }
  };

  const setGoalCareer = async (id: string, title: string) => {
    if (!user) { router.push("/sign-in"); return; }
    try {
      await setCareerGoal(user.id, title, id);
      router.replace("/(tabs)" as any); // jump to the Guide tab (replace refocuses it → path regenerates)
    } catch (err: any) {
      Alert.alert("Couldn't set goal", authErrorMessage(err, "Please try again."));
    }
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
        placeholder={mode === "careers" ? "Search careers (e.g. engineer)" : "Search activities by title, location, etc."}
        placeholderTextColor={colors.muted}
      />

      {mode === "activities" && (
        <View style={styles.activityFiltersRow}>
          <Pressable style={styles.dropdownBtn} onPress={() => setDropdownVisible(true)}>
            <Text style={styles.dropdownBtnText} numberOfLines={1}>
              {category ? category : "All Categories"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.heading} />
          </Pressable>

          <TextInput
            style={[styles.input, styles.budgetInput]}
            value={maxBudget}
            onChangeText={setMaxBudget}
            placeholder="Max budget"
            keyboardType="numeric"
            placeholderTextColor={colors.muted}
          />
        </View>
      )}

      {/* Category Selection Modal */}
      <Modal visible={dropdownVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            
            <Pressable
              style={[styles.modalItem, !category && styles.modalItemActive]}
              onPress={() => { setCategory(""); setDropdownVisible(false); }}
            >
              <Text style={[styles.modalItemText, !category && styles.modalItemTextActive]}>
                All Categories
              </Text>
              {!category && <Ionicons name="checkmark" size={18} color={colors.accent} />}
            </Pressable>

            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.modalItem, category === c && styles.modalItemActive]}
                onPress={() => { setCategory(c); setDropdownVisible(false); }}
              >
                <Text style={[styles.modalItemText, category === c && styles.modalItemTextActive]}>
                  {c}
                </Text>
                {category === c && <Ionicons name="checkmark" size={18} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
      ) : mode === "careers" ? (
        <FlatList
          data={careers}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CareerCard
              item={item}
              isSaved={savedCareerIds.includes(item.id)}
              onToggleSave={user ? () => toggleSaveCareer(item.id) : undefined}
              isGoal={goalCareerId === item.id}
              onSetGoal={user ? () => setGoalCareer(item.id, item.title) : undefined}
              onPress={() => router.push(`/career?id=${item.id}` as any)}
            />
          )}
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
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginBottom: 10, fontFamily: fonts.body, color: colors.heading, backgroundColor: colors.card },
  activityFiltersRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  dropdownBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card },
  dropdownBtnText: { fontFamily: fonts.body, color: colors.heading, fontSize: 14, flex: 1, marginRight: 4 },
  budgetInput: { flex: 1, marginBottom: 0 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.body, color: colors.heading, fontSize: 13 },
  chipTextActive: { color: "#fff" },
  empty: { marginTop: 12, fontFamily: fonts.body, color: colors.muted },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 22 },
  modalContent: { width: "100%", maxWidth: 340, backgroundColor: colors.card, borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 18, fontFamily: fonts.heading, color: colors.heading, marginBottom: 16, textAlign: "center" },
  modalItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  modalItemActive: { backgroundColor: "rgba(16, 124, 143, 0.08)", borderRadius: 8, paddingHorizontal: 8 },
  modalItemText: { fontFamily: fonts.body, fontSize: 15, color: colors.heading },
  modalItemTextActive: { fontFamily: fonts.bodyBold, color: colors.accent },
});
