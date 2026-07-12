import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import ActivityCard from "../components/ActivityCard";
import CareerCard from "../components/CareerCard";
import CustomButton from "../components/CustomButton";
import CustomInput from "../components/CustomInput";
import { activities, type Category } from "../data/activities";
import { careers } from "../data/careers";
import { useAuth } from "../hooks/AuthContext";
import { addSaved, getSavedActivityIds, removeSaved } from "../services/supabase";

export default function Results() {
  const params = useLocalSearchParams<{ query?: string }>();
  const query = (params.query || "").toString();

  const [filterOpen, setFilterOpen] = useState(false);

  const [location, setLocation] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [careerFilter, setCareerFilter] = useState(false);

  // keywords that should automatically select an activity category
  const categoryKeywords: Record<string, Category> = {
    volunteer: "Volunteering",
    volunteering: "Volunteering",
    extracurricular: "Extracurricular",
    professional: "Professional Meetings",
    workshop: "Workshop",
    "job shadowing": "Job Shadowing",
    internship: "Internship",
    university: "University Visit",
    "university visit": "University Visit",
  };

  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Load user + saved list
  useEffect(() => {
    (async () => {
      if (!user) {
        setSavedIds([]);
        setLoadingSaved(false);
        return;
      }
      setSavedIds(await getSavedActivityIds(user.id));
      setLoadingSaved(false);
    })();
  }, [user]);

  const parsedMaxBudget = useMemo(() => {
    if (maxBudget.trim() === "") return null;

    const n = Number(maxBudget);
    return Number.isFinite(n) ? n : null;
  }, [maxBudget]);

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase();

    // if user hasn't manually picked a category, see whether query implies one
    const derivedCategory: Category | "" =
      !category && q && categoryKeywords[q] ? categoryKeywords[q] : category;

    const activityMatches = careerFilter
      ? []
      : activities.filter((a) => {
      const matchesQuery =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q);

      const matchesLocation =
        location.trim() === "" ||
        a.location.toLowerCase().includes(location.toLowerCase().trim());

      const matchesCategory = !derivedCategory || a.category === derivedCategory;

      const rawPrice = a.price.trim().toLowerCase();
      const normalizedPrice = rawPrice.replace(/[^0-9.,-]/g, "").replace(",", ".");
      const priceNumber = rawPrice === "free" ? 0 : Number(normalizedPrice);

      const matchesBudget =
        parsedMaxBudget === null
          ? true
          : Number.isFinite(priceNumber)
          ? priceNumber <= parsedMaxBudget
          : true;

      return (
        matchesQuery &&
        matchesLocation &&
        matchesCategory &&
        matchesBudget
      );
    });

    const careerMatches = careers.filter((c) => {
      if (!q) return true; // show all careers if there's no query at all
      const title = c.title.toLowerCase();
      return (
        title.includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.requiredSkills.some((s) => s.toLowerCase().includes(q)) ||
        c.recommendedHighSchoolSubjects.some((s) =>
          s.toLowerCase().includes(q)
        )
      );
    });

    const wrappedActivities = activityMatches.map((a) => ({
      kind: "activity" as const,
      item: a,
    }));
    const wrappedCareers = careerMatches.map((c) => ({
      kind: "career" as const,
      item: c,
    }));

    // If user picked an experience category, show only activity results for that category.
    if (derivedCategory) {
      return wrappedActivities;
    }

    // Careers chip means careers-only mode.
    if (careerFilter) {
      return wrappedCareers;
    }

    // Default mode: show both activity + career matches.
    return [...wrappedActivities, ...wrappedCareers];
  }, [query, location, category, parsedMaxBudget, careerFilter]);

  const setCategoryQuick = (c: Category) =>
    setCategory((prev) => (prev === c ? "" : c));

  const toggleSave = async (activityId: string) => {
    if (!user) {
      Alert.alert("Not signed in", "Please sign in first.");
      router.replace("/sign-in");
      return;
    }
    try {
      if (savedIds.includes(activityId)) {
        await removeSaved(user.id, activityId);
        setSavedIds((prev) => prev.filter((id) => id !== activityId));
      } else {
        await addSaved(user.id, activityId);
        setSavedIds((prev) => [...prev, activityId]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not update saved list.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.h1}>
          {careerFilter ? "Career results" : "Search results"}
        </Text>

        <Pressable
          onPress={() => setFilterOpen(true)}
          style={styles.filterBtn}
        >
          <Text style={{ fontWeight: "800" }}>Filter</Text>
        </Pressable>
      </View>

      <Text style={styles.sub}>
        {filteredData.length} results found{" "}
        {loadingSaved ? "• loading saved..." : ""}
      </Text>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => `${item.kind}-${item.item.id}`}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) =>
          item.kind === "activity" ? (
            <ActivityCard
              item={item.item}
              isSaved={savedIds.includes(item.item.id)}
              onToggleSave={user ? () => toggleSave(item.item.id) : undefined}
              onPress={() => router.push(`/detail?id=${item.item.id}`)}
            />
          ) : (
            <CareerCard
              item={item.item}
              onPress={() =>
                router.push({
                  pathname: "/career",
                  params: { id: item.item.id },
                })
              }
            />
          )
        }
        ListEmptyComponent={
          <Text style={{ marginTop: 10 }}>No results found.</Text>
        }
      />

      <Modal visible={filterOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 24, fontWeight: "900" }}>
                Filter
              </Text>
              <Pressable onPress={() => setFilterOpen(false)}>
                <Text style={{ fontSize: 20, fontWeight: "900" }}>✕</Text>
              </Pressable>
            </View>

            <CustomInput
              value={location}
              onChangeText={setLocation}
              placeholder="Add a location (Haifa, Jerusalem...)"
            />

            <CustomInput
              value={maxBudget}
              onChangeText={setMaxBudget}
              placeholder="Max budget (e.g., 50)"
            />

            <Text style={styles.chipsTitle}>Experiences / Careers</Text>

            <View style={styles.chips}>
              <Pressable
                onPress={() => setCareerFilter((prev) => !prev)}
                style={[styles.chip, careerFilter && styles.chipActive]}
              >
                <Text style={{ fontWeight: "700" }}>Careers</Text>
              </Pressable>
              {(
                [
                  "Volunteering",
                  "Extracurricular",
                  "Professional Meetings",
                  "Workshop",
                  "Job Shadowing",
                  "Internship",
                  "University Visit",
                ] as Category[]
              ).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategoryQuick(c)}
                  style={[
                    styles.chip,
                    category === c && styles.chipActive,
                  ]}
                >
                  <Text style={{ fontWeight: "700" }}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <CustomButton
              title="Apply"
              onPress={() => setFilterOpen(false)}
            />

            <CustomButton
              title="Clear"
              onPress={() => {
                setLocation("");
                setMaxBudget("");
                setCategory("");
                setCareerFilter(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 60, backgroundColor: "#e2f5ff" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  h1: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#203b60', flex: 1 },
  filterBtn: {
    borderWidth: 1,
    borderColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sub: { marginTop: 8, marginBottom: 12, fontFamily: 'Inter_400Regular', color: '#107c8f' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#e2f5ff",
    padding: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  chipsTitle: { fontWeight: "900", marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: "#111",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipActive: { backgroundColor: "#E0E0E0" },
});