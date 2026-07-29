import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, Linking } from "react-native";
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
import { useTutorial } from "../hooks/TutorialContext";

function priceLabel(a: Activity) {
  return a.priceAmount === 0 ? "Free" : `${a.priceCurrency}${a.priceAmount}`;
}

import { useLanguage } from "../hooks/LanguageContext";

export default function CareerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showTutorial } = useTutorial();
  const { language, t } = useLanguage();
  const [career, setCareer] = useState<Career | null>(null);
  const [related, setRelated] = useState<Activity[]>([]);
  const [subCareers, setSubCareers] = useState<Career[]>([]);
  const [ancestors, setAncestors] = useState<Career[]>([]);
  
  // Track saved career IDs and the active goal career ID
  const [savedCareerIds, setSavedCareerIds] = useState<string[]>([]);
  const [goalCareerId, setGoalCareerId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading && career && role === "student") {
      showTutorial("career_detail");
    }
  }, [loading, career, role]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const careerId = String(id);
      const c = await getCareer(careerId, language);
      if (!isMounted) return;
      setCareer(c);
      if (c) {
        const [actRes, subRes, ancRes, savedIdsRes, profileRes] = await Promise.all([
          getActivitiesForCareer(c.id, language),
          getSubCareers(c.id, language),
          getAncestorCareers(c.id, language),
          user ? getSavedIds(user.id, "career") : Promise.resolve([]),
          user ? getProfile(user.id) : Promise.resolve(null),
        ]);
        if (!isMounted) return;
        setRelated(actRes);
        setSubCareers(subRes);
        setAncestors(ancRes);
        setSavedCareerIds(savedIdsRes);
        setGoalCareerId(profileRes?.career ?? null);
        const userRole = (profileRes?.role && profileRes.role.trim() !== '') ? profileRes.role.toLowerCase() : "student";
        setRole(userRole);
      }
      setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [id, user, language]);

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

        {/* Dedicated Centered Hero Title Header */}
        <View style={styles.heroHeaderContainer}>
          <Text style={styles.heroTitleText}>{career.title}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.demandBadge, { backgroundColor: "#0b5360" }]}>
              <Text style={styles.demandBadgeText}>
                {career.demandLevel.replace(/_/g, " ").toUpperCase()}
              </Text>
            </View>
          </View>

          {user && (
            <View style={styles.heroActionsCenter}>
              {/* 3D Set Goal Button */}
              <ToyNodeButton
                size={54}
                topColor={isMainGoal ? "#55C5B1" : "#107c8f"}
                sideColor={isMainGoal ? "#389e8d" : "#0b5360"}
                iconName={isMainGoal ? "compass" : "compass-outline"}
                iconSize={26}
                onPress={() => chooseGoalCareer(career)}
              />
              <View style={{ width: 16 }} />
              {/* 3D Save Button */}
              <ToyNodeButton
                size={54}
                topColor={isMainSaved ? "#ec4899" : "#cbd5e1"}
                sideColor={isMainSaved ? "#be185d" : "#94a3b8"}
                iconName={isMainSaved ? "heart" : "heart-outline"}
                iconSize={26}
                onPress={() => toggleSaveCareer(career)}
              />
            </View>
          )}
        </View>

        {/* Block 1: Career Description */}
        <Soft3DBlock
          title={t("career_overview")}
          iconName="document-text-outline"
          theme="blue"
          index={1}
        >
          <Text style={styles.bodyText}>{career.description}</Text>
        </Soft3DBlock>

        {/* Block 2: Salary & Earnings */}
        <Soft3DBlock
          title={t("career_salary")}
          subtitle={salary}
          iconName="cash-outline"
          theme="green"
          index={2}
        >
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t("career_estimated_range")}</Text>
            <Text style={styles.detailValue}>{salary}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t("career_job_demand")}</Text>
            <Text style={[styles.detailValue, { color: colors.button, fontFamily: fonts.bodyBold }]}>
              {career.demandLevel.replace(/_/g, " ")}
            </Text>
          </View>
        </Soft3DBlock>

        {/* Block 3: Work Environment */}
        <Soft3DBlock
          title={t("career_work_env")}
          subtitle={t("career_work_env_sub")}
          iconName="business-outline"
          theme="teal"
          index={3}
        >
          <Text style={styles.bodyText}>{career.workEnvironment}</Text>
        </Soft3DBlock>

        {/* Block 3.5: Contact a Professional (database-driven mentor info) */}
        {(() => {
          const name = career.mentorName || "Alex Rivers";
          const title = career.mentorTitle || `Senior ${career.title} & Mentor`;
          const contactType = career.mentorContactType || "linkedin";
          const contactValue = career.mentorContactValue || "https://www.linkedin.com";

          return (
            <Soft3DBlock
              title={t("career_contact_pro")}
              subtitle={t("career_contact_pro_sub")}
              iconName="people-outline"
              theme="teal"
              index={3.5}
            >
              <View style={styles.proContainer}>
                <View style={styles.proHeader}>
                  <View style={styles.proAvatar}>
                    <Ionicons name="person" size={24} color="#8b5cf6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.proName}>{name}</Text>
                    <Text style={styles.proTitle}>{title}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  {contactType === "linkedin" ? (
                    <Pressable
                      style={styles.proContactBtn}
                      onPress={() => Linking.openURL(contactValue)}
                    >
                      <Ionicons name="logo-linkedin" size={18} color="#0077b5" />
                      <Text style={styles.proContactBtnText}>{t("career_connect_linkedin")}</Text>
                    </Pressable>
                  ) : contactType === "email" ? (
                    <Pressable
                      style={styles.proContactBtn}
                      onPress={() => Linking.openURL(`mailto:${contactValue}?subject=Question regarding ${career.title}`)}
                    >
                      <Ionicons name="mail-outline" size={18} color={colors.accent} />
                      <Text style={styles.proContactBtnText}>{t("career_email_prefix")}{contactValue}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.proContactBtn}
                      onPress={() => Linking.openURL(`tel:${contactValue.replace(/\s+/g, '')}`)}
                    >
                      <Ionicons name="call-outline" size={18} color="#16a34a" />
                      <Text style={styles.proContactBtnText}>{t("career_call_prefix")}{contactValue}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Soft3DBlock>
          );
        })()}

        {/* Block 4: Required Education & Skills */}
        <Soft3DBlock
          title={t("career_edu_skills")}
          subtitle={t("career_edu_skills_sub")}
          iconName="school-outline"
          theme="blue"
          index={4}
        >
          <Text style={styles.sectionHeading}>{t("career_required_edu")}</Text>
          {career.requiredEducation.map((e) => (
            <View key={e} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={styles.bulletText}>{e}</Text>
            </View>
          ))}

          <Text style={[styles.sectionHeading, { marginTop: 14 }]}>{t("career_key_skills")}</Text>
          {career.requiredSkills.map((s) => (
            <View key={s} style={styles.bulletRow}>
              <Ionicons name="sparkles-outline" size={16} color="#8b5cf6" style={{ marginRight: 8 }} />
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}

          {career.recommendedSubjects.length > 0 && (
            <>
              <Text style={[styles.sectionHeading, { marginTop: 14 }]}>{t("career_school_subjects")}</Text>
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
            title={t("career_specializations")}
            subtitle={`${subCareers.length}${t("career_focus_areas_suffix")}`}
            iconName="git-network-outline"
            theme="green"
            index={5}
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
                        topColor={isSubGoal ? "#55C5B1" : "#107c8f"}
                        sideColor={isSubGoal ? "#389e8d" : "#0b5360"}
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
            title={t("career_recommended_activities")}
            subtitle={t("career_activities_sub")}
            iconName="sparkles-outline"
            theme="teal"
            index={6}
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
  proContainer: {
    paddingVertical: 4,
  },
  proHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  proAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  proName: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.heading,
  },
  proTitle: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.muted,
  },
  proContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  proContactBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.heading,
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
  heroHeaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 22,
    paddingHorizontal: 8,
  },
  heroTitleText: {
    fontFamily: fonts.heading,
    fontSize: 28,
    lineHeight: 34,
    color: colors.heading,
    textAlign: "center",
    marginBottom: 10,
  },
  heroBadgeRow: {
    marginBottom: 12,
  },
  demandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  demandBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#fff",
  },
  heroActionsCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
});
