import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ActivityCard from "../components/ActivityCard";
import Soft3DBlock from "../components/Soft3DBlock";
import ToyNodeButton from "../components/guide/ToyNodeButton";
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
      router.replace("/(tabs)" as any);
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
    <View style={styles.mainWrapper}>
      {/* Decorative background shapes (low opacity) */}
      <View style={styles.bgDecorCircle1} />
      <View style={styles.bgDecorCircle2} />

      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        {/* Clickable Breadcrumbs for Hierarchical Navigation */}
        {ancestors.length > 0 && (
          <View style={styles.breadcrumbs}>
            {ancestors.map((ancestor) => (
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

        {/* Hero Title Block */}
        <Soft3DBlock
          title={career.title}
          iconName="briefcase-outline"
          theme="teal"
          index={0}
          badgeText={career.demandLevel.replace(/_/g, " ").toUpperCase()}
        >
          <View style={styles.heroActionsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSalaryText}>{salary}</Text>
            </View>

            {user ? (
              <View style={styles.heroButtons}>
                {/* 3D Set Goal Button */}
                <ToyNodeButton
                  size={46}
                  topColor={isMainGoal ? "#27805a" : "#107c8f"}
                  sideColor={isMainGoal ? "#1b593e" : "#0b5360"}
                  iconName={isMainGoal ? "compass" : "compass-outline"}
                  iconSize={22}
                  onPress={() => chooseGoalCareer(career)}
                />
                {/* 3D Save Button */}
                <ToyNodeButton
                  size={46}
                  topColor={isMainSaved ? "#ec4899" : "#cbd5e1"}
                  sideColor={isMainSaved ? "#be185d" : "#94a3b8"}
                  iconName={isMainSaved ? "heart" : "heart-outline"}
                  iconSize={22}
                  onPress={() => toggleSaveCareer(career)}
                />
              </View>
            ) : null}
          </View>
        </Soft3DBlock>

        {/* Block 1: Career Description */}
        <Soft3DBlock
          title="Career Overview"
          iconName="document-text-outline"
          theme="blue"
          index={1}
          isExpandable={false}
        >
          <Text style={styles.bodyText}>{career.description}</Text>
        </Soft3DBlock>

        {/* Block 2: Salary & Earnings */}
        <Soft3DBlock
          title="Salary & Earnings"
          subtitle={salary}
          iconName="cash-outline"
          theme="green"
          index={2}
          isExpandable
        >
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Range:</Text>
            <Text style={styles.detailValue}>{salary}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Job Market Demand:</Text>
            <Text style={[styles.detailValue, { color: colors.button, fontFamily: fonts.bodyBold }]}>
              {career.demandLevel.replace(/_/g, " ")}
            </Text>
          </View>
        </Soft3DBlock>

        {/* Block 3: Work Environment */}
        <Soft3DBlock
          title="Work Environment"
          subtitle="Typical workplace setup & atmosphere"
          iconName="business-outline"
          theme="teal"
          index={3}
          isExpandable
        >
          <Text style={styles.bodyText}>{career.workEnvironment}</Text>
        </Soft3DBlock>

        {/* Block 4: Required Education & Skills */}
        <Soft3DBlock
          title="Education & Skills"
          subtitle="Qualifications, subjects, and key competencies"
          iconName="school-outline"
          theme="blue"
          index={4}
          isExpandable
        >
          <Text style={styles.sectionHeading}>Required Education</Text>
          {career.requiredEducation.map((e) => (
            <View key={e} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={styles.bulletText}>{e}</Text>
            </View>
          ))}

          <Text style={[styles.sectionHeading, { marginTop: 14 }]}>Key Skills</Text>
          {career.requiredSkills.map((s) => (
            <View key={s} style={styles.bulletRow}>
              <Ionicons name="sparkles-outline" size={16} color="#8b5cf6" style={{ marginRight: 8 }} />
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}

          {career.recommendedSubjects.length > 0 && (
            <>
              <Text style={[styles.sectionHeading, { marginTop: 14 }]}>Recommended School Subjects</Text>
              {career.recommendedSubjects.map((sub) => (
                <View key={sub} style={styles.bulletRow}>
                  <Ionicons name="book-outline" size={16} color="#107c8f" style={{ marginRight: 8 }} />
                  <Text style={styles.bulletText}>{sub}</Text>
                </View>
              ))}
            </>
          )}
        </Soft3DBlock>

        {/* Block 5: Specializations */}
        {subCareers.length > 0 && (
          <Soft3DBlock
            title="Available Specializations"
            subtitle={`${subCareers.length} focus areas to explore`}
            iconName="git-network-outline"
            theme="green"
            index={5}
            isExpandable
          >
            <View style={{ gap: 10 }}>
              {subCareers.map((sub) => {
                const isSubGoal = goalCareerId === sub.id;
                const isSubSaved = savedCareerIds.includes(sub.id);

                return (
                  <View key={sub.id} style={styles.specTile}>
                    <Pressable
                      onPress={() => router.push(`/career?id=${sub.id}` as any)}
                      style={styles.specMainContent}
                    >
                      <View style={styles.specHeader}>
                        <Text style={styles.specTitle}>{sub.title}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                      </View>
                      <Text numberOfLines={2} style={styles.specDesc}>
                        {sub.description}
                      </Text>
                    </Pressable>

                    <View style={styles.specActions}>
                      <ToyNodeButton
                        size={38}
                        topColor={isSubGoal ? "#27805a" : "#107c8f"}
                        sideColor={isSubGoal ? "#1b593e" : "#0b5360"}
                        iconName={isSubGoal ? "compass" : "compass-outline"}
                        iconSize={18}
                        onPress={() => chooseGoalCareer(sub)}
                      />
                      <ToyNodeButton
                        size={38}
                        topColor={isSubSaved ? "#ec4899" : "#cbd5e1"}
                        sideColor={isSubSaved ? "#be185d" : "#94a3b8"}
                        iconName={isSubSaved ? "heart" : "heart-outline"}
                        iconSize={18}
                        onPress={() => toggleSaveCareer(sub)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </Soft3DBlock>
        )}

        {/* Block 6: Related Activities */}
        {related.length > 0 && (
          <Soft3DBlock
            title="Recommended Activities"
            subtitle="Hands-on experiences for this career"
            iconName="sparkles-outline"
            theme="teal"
            index={6}
            isExpandable
          >
            {related.map((a) => (
              <ActivityCard
                key={a.id}
                item={{ id: a.id, title: a.title, category: a.category, location: a.location, priceLabel: priceLabel(a) }}
                onPress={() => router.push(`/detail?id=${a.id}` as any)}
              />
            ))}
          </Soft3DBlock>
        )}
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
  bgDecorCircle1: {
    position: "absolute",
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.accent,
    opacity: 0.05,
  },
  bgDecorCircle2: {
    position: "absolute",
    bottom: 100,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.button,
    opacity: 0.05,
  },
  breadcrumbs: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
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
  heroActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  heroSalaryText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.button,
  },
  heroButtons: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
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
  sectionHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.accent,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  bulletText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.heading,
  },
  specTile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  specMainContent: {
    flex: 1,
    paddingRight: 8,
  },
  specHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  specTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.heading,
  },
  specDesc: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted,
  },
  specActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  value: {
    fontFamily: fonts.body,
    color: colors.heading,
  },
});
