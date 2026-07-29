import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "../components/CustomButton";
import CustomInput from "../components/CustomInput";
import GradeSelector from "../components/GradeSelector";
import MajorsInput from "../components/MajorsInput";
import { useAuth } from "../hooks/AuthContext";
import { authErrorMessage } from "../services/authErrors";
import { getProfile, getQuestionnaire, upsertProfile, type Profile, type Questionnaire } from "../services/supabase";
import { useLanguage } from "../hooks/LanguageContext";
import { colors, fonts } from "../constants/theme";

export default function PersonalDetails() {
  const { user } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);

  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [majors, setMajors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    (async () => {
      try {
        const loadedProfile = await getProfile(user.id);
        setProfile(loadedProfile);
        if (loadedProfile) {
          setSchool(loadedProfile.school || "");
          setCity(loadedProfile.city || "");
          setGradeLevel(loadedProfile.grade_level || "");
          setMajors(loadedProfile.majors || []);
        }
        setQuestionnaire(await getQuestionnaire(user.id));
      } catch (err) {
        console.error("Failed to load details:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  const name = (user.user_metadata?.full_name as string) || t("role_student");

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertProfile(user.id, {
        school: school.trim(),
        city: city.trim(),
        grade_level: gradeLevel,
        majors,
      });
      Alert.alert(t("success_title"), t("saved_success"));
    } catch (err: any) {
      Alert.alert(t("alert_save_failed"), authErrorMessage(err, t("alert_try_again")));
    } finally {
      setSaving(false);
    }
  };

  const personalityLabel = profile?.personality_type
    ? profile.personality_type.charAt(0).toUpperCase() + profile.personality_type.slice(1)
    : t("not_taken_yet");

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.flexContainer}
    >
      {/* Top Header Row */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={15}>
          <Ionicons name="chevron-back" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("details_title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Selection Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("select_language")}</Text>
          <View style={styles.segment}>
            <Pressable
              style={[styles.chip, language === "en" && styles.chipActive]}
              onPress={() => changeLanguage("en")}
            >
              <Text style={[styles.chipText, language === "en" && styles.chipTextActive]}>{t("lang_en")}</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, language === "he" && styles.chipActive]}
              onPress={() => changeLanguage("he")}
            >
              <Text style={[styles.chipText, language === "he" && styles.chipTextActive]}>{t("lang_he")}</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, language === "ar" && styles.chipActive]}
              onPress={() => changeLanguage("ar")}
            >
              <Text style={[styles.chipText, language === "ar" && styles.chipTextActive]}>{t("lang_ar")}</Text>
            </Pressable>
          </View>
        </View>

        {/* Read-Only Account Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("details_card_account")}</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={colors.accent} style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t("details_label_name")}</Text>
              <Text style={styles.infoValue}>{name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.accent} style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t("details_label_email")}</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>

          {profile && (
            <View style={styles.infoRow}>
              <Ionicons name="shield-outline" size={20} color={colors.accent} style={styles.infoIcon} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>{t("details_label_role")}</Text>
                <Text style={styles.infoValue}>{profile.role ? profile.role.toUpperCase() : "-"}</Text>
              </View>
            </View>
          )}

          <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Ionicons name="sparkles-outline" size={20} color={colors.accent} style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t("details_label_personality")}</Text>
              <Text style={styles.infoValue}>{personalityLabel}</Text>
            </View>
          </View>
        </View>

        {/* Edit Fields Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("details_card_academic")}</Text>
          <CustomInput 
            label={t("school_label")} 
            value={school} 
            onChangeText={setSchool} 
            placeholder={t("school_placeholder")} 
          />
          <CustomInput 
            label={t("city_label")} 
            value={city} 
            onChangeText={setCity} 
            placeholder={t("city_placeholder")} 
          />
          <GradeSelector 
            value={gradeLevel} 
            onChange={setGradeLevel} 
            label={t("grade_label")} 
          />
          <View style={{ marginTop: 12 }}>
            <MajorsInput 
              label={t("majors_label")} 
              value={majors} 
              onChange={setMajors} 
            />
          </View>
        </View>

        {/* Save Button */}
        <CustomButton
          title={saving ? t("details_label_saving") : t("save_changes_btn")}
          onPress={handleSave}
          disabled={saving || !profile}
          style={styles.saveBtn}
        />
        {saving && <ActivityIndicator style={{ marginTop: 12 }} color={colors.accent} />}

        {/* Assessment Card */}
        {questionnaire && (
          <View style={[styles.card, { marginTop: 24 }]}>
            <Text style={styles.cardTitle}>{t("details_card_assessment")}</Text>
            
            <View style={styles.qaRow}>
              <Text style={styles.qaLabel}>{t("details_qa_majors")}</Text>
              <Text style={styles.qaValue}>{questionnaire.majors || "-"}</Text>
            </View>
            <View style={styles.qaRow}>
              <Text style={styles.qaLabel}>{t("details_qa_career_in_mind")}</Text>
              <Text style={styles.qaValue}>{questionnaire.career_in_mind || "-"}</Text>
            </View>
            <View style={styles.qaRow}>
              <Text style={styles.qaLabel}>{t("details_qa_hobbies")}</Text>
              <Text style={styles.qaValue}>{questionnaire.hobbies || "-"}</Text>
            </View>
            <View style={styles.qaRow}>
              <Text style={styles.qaLabel}>{t("details_qa_parents_jobs")}</Text>
              <Text style={styles.qaValue}>{questionnaire.parents_jobs || "-"}</Text>
            </View>
            <View style={styles.qaRow}>
              <Text style={styles.qaLabel}>{t("details_qa_dream_job")}</Text>
              <Text style={styles.qaValue}>{questionnaire.dream_job || "-"}</Text>
            </View>
            <View style={styles.qaRow}>
              <Text style={styles.qaLabel}>{t("details_qa_volunteer")}</Text>
              <Text style={styles.qaValue}>{questionnaire.volunteer_interest || "-"}</Text>
            </View>
            <View style={[styles.qaRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.qaLabel}>{t("details_qa_psychometric")}</Text>
              <Text style={styles.qaValue}>{questionnaire.psychometric_grade || "-"}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: "#ECF9FC", // Matches the clean signup background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ECF9FC",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.heading,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.heading,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  segment: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    fontSize: 14,
  },
  chipTextActive: {
    color: "#fff",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef3f6",
  },
  infoIcon: {
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.heading,
  },
  saveBtn: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  qaRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef3f6",
  },
  qaLabel: {
    fontSize: 12.5,
    fontFamily: fonts.bodyBold,
    color: colors.muted,
    marginBottom: 4,
  },
  qaValue: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.heading,
    lineHeight: 20,
  },
});
