import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ActivityCard from "../components/ActivityCard";
import { colors, fonts } from "../constants/theme";
import { useAuth } from "../hooks/AuthContext";
import {
  getActivitiesForCareer,
  getCareer,
  getSubCareers,
  getAncestorCareers,
  type Activity,
  type Career,
} from "../services/catalog";
import { addSaved, getProfile, getSavedIds, removeSaved, setCareerGoal } from "../services/supabase";
import { authErrorMessage } from "../services/authErrors";

function priceLabel(a: Activity) {
  return a.priceAmount === 0 ? "Free" : `${a.priceCurrency}${a.priceAmount}`;
}

export default function CareerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [career, setCareer] = useState<Career | null>(null);
  const [related, setRelated] = useState<Activity[]>([]);
  const [subCareers, setSubCareers] = useState<Career[]>([]);
  const [ancestors, setAncestors] = useState<Career[]>([]);
  
  // Track saved career IDs and the active goal career ID
  const [savedCareerIds, setSavedCareerIds] = useState<string[]>([]);
  const [goalCareerId, setGoalCareerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const c = await getCareer(String(id));
      setCareer(c);
      if (c) {
        setRelated(await getActivitiesForCareer(c.id));
        setSubCareers(await getSubCareers(c.id));
        setAncestors(await getAncestorCareers(c.id));
      }
      if (user && c) {
        const savedIds = await getSavedIds(user.id, "career");
        setSavedCareerIds(savedIds);
        
        const profile = await getProfile(user.id);
        setGoalCareerId(profile?.career ?? null);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const toggleSaveCareer = async (targetCareer: Career) => {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    const isCurrentlySaved = savedCareerIds.includes(targetCareer.id);
    try {
      if (isCurrentlySaved) {
        await removeSaved(user.id, targetCareer.id, "career");
        setSavedCareerIds((p) => p.filter((x) => x !== targetCareer.id));
      } else {
        await addSaved(user.id, targetCareer.id, "career");
        setSavedCareerIds((p) => [...p, targetCareer.id]);
      }
    } catch (err: any) {
      Alert.alert("Couldn't update saved state", authErrorMessage(err, "Please try again."));
    }
  };

  const chooseGoalCareer = async (targetCareer: Career) => {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    try {
      await setCareerGoal(user.id, targetCareer.title, targetCareer.id);
      setGoalCareerId(targetCareer.id);
      router.replace("/(tabs)" as any); // redirect to the Guide tab
    } catch (err: any) {
      Alert.alert("Couldn't set goal", authErrorMessage(err, "Please try again."));
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!career) return <View style={styles.center}><Text style={styles.value}>Career not found</Text></View>;

  const salary =
    career.salaryMin != null && career.salaryMax != null
      ? `${career.salaryCurrency}${career.salaryMin.toLocaleString()} – ${career.salaryCurrency}${career.salaryMax.toLocaleString()} / ${career.salaryPeriod}`
      : "—";

  const isMainGoal = goalCareerId === career.id;
  const isMainSaved = savedCareerIds.includes(career.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 22 }}>
      {/* Clickable Breadcrumbs for Hierarchical Navigation */}
      {ancestors.length > 0 && (
        <View style={styles.breadcrumbs}>
          {ancestors.map((ancestor, i) => (
            <React.Fragment key={ancestor.id}>
              <Pressable onPress={() => router.push(`/career?id=${ancestor.id}` as any)}>
                <Text style={styles.breadcrumbLink}>{ancestor.title}</Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={12} color={colors.muted} style={styles.breadcrumbSeparator} />
            </React.Fragment>
          ))}
          <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
            {career.title}
          </Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.title}>{career.title}</Text>
        {user ? (
          <View style={styles.actions}>
            <Pressable onPress={() => chooseGoalCareer(career)} hitSlop={10}>
              <Ionicons
                name={isMainGoal ? "compass" : "compass-outline"}
                size={26}
                color={isMainGoal ? colors.button : colors.muted}
              />
            </Pressable>
            <Pressable onPress={() => toggleSaveCareer(career)} hitSlop={10}>
              <Text style={styles.heart}>{isMainSaved ? "♥" : "♡"}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Text style={styles.label}>Description</Text>
      <Text style={styles.value}>{career.description}</Text>

      <Text style={styles.label}>Required Education</Text>
      {career.requiredEducation.map((e) => (<Text key={e} style={styles.value}>• {e}</Text>))}

      <Text style={styles.label}>Required Skills</Text>
      {career.requiredSkills.map((s) => (<Text key={s} style={styles.value}>• {s}</Text>))}

      <Text style={styles.label}>Recommended Subjects</Text>
      {career.recommendedSubjects.map((s) => (<Text key={s} style={styles.value}>• {s}</Text>))}

      <Text style={styles.label}>Salary Range</Text>
      <Text style={styles.value}>{salary}</Text>

      <Text style={styles.label}>Work Environment</Text>
      <Text style={styles.value}>{career.workEnvironment}</Text>

      <Text style={styles.label}>Future Demand</Text>
      <Text style={styles.value}>{career.demandLevel.replace(/_/g, " ")}</Text>

      {/* Specializations list if it is a parent career */}
      {subCareers.length > 0 && (
        <>
          <Text style={styles.label}>Available Specializations</Text>
          <View style={styles.specializationsContainer}>
            {subCareers.map((sub) => {
              const isSubGoal = goalCareerId === sub.id;
              const isSubSaved = savedCareerIds.includes(sub.id);

              return (
                <View key={sub.id} style={styles.specCardRow}>
                  {/* Tappable Card Content (Navigates to detail) */}
                  <Pressable
                    onPress={() => router.push(`/career?id=${sub.id}` as any)}
                    style={({ pressed }) => [
                      styles.specCardContent,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.specHeader}>
                      <Text style={styles.specTitle}>{sub.title}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                    </View>
                    <Text numberOfLines={2} style={styles.specDesc}>
                      {sub.description}
                    </Text>
                  </Pressable>

                  {/* Inline Save & Guide Actions for Sub-Careers */}
                  <View style={styles.specActions}>
                    <Pressable onPress={() => chooseGoalCareer(sub)} hitSlop={10}>
                      <Ionicons
                        name={isSubGoal ? "compass" : "compass-outline"}
                        size={24}
                        color={isSubGoal ? colors.button : colors.muted}
                      />
                    </Pressable>
                    <Pressable onPress={() => toggleSaveCareer(sub)} hitSlop={10}>
                      <Text style={styles.specHeart}>{isSubSaved ? "♥" : "♡"}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {related.length > 0 && (
        <>
          <Text style={styles.label}>Related activities</Text>
          {related.map((a) => (
            <ActivityCard
              key={a.id}
              item={{ id: a.id, title: a.title, category: a.category, location: a.location, priceLabel: priceLabel(a) }}
              onPress={() => router.push(`/detail?id=${a.id}` as any)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  breadcrumbs: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  breadcrumbLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.accent,
  },
  breadcrumbSeparator: {
    marginHorizontal: 4,
  },
  breadcrumbCurrent: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    flex: 1,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 28, fontFamily: fonts.heading, color: colors.heading, flex: 1, paddingRight: 10 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  heart: { fontSize: 26, color: colors.accent },
  label: { fontFamily: fonts.bodyBold, color: colors.accent, marginTop: 14 },
  value: { fontFamily: fonts.body, color: colors.accent, marginTop: 4 },
  
  specializationsContainer: {
    marginTop: 8,
    gap: 10,
  },
  specCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border + "10",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  specCardContent: {
    flex: 1,
    padding: 14,
    paddingRight: 4,
  },
  specHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  specTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.heading,
  },
  specDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  specActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 14,
    paddingLeft: 4,
  },
  specHeart: {
    fontSize: 24,
    color: colors.accent,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
