import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import CustomButton from "../components/CustomButton";
import CustomInput from "../components/CustomInput";
import GradeSelector from "../components/GradeSelector";
import MajorsInput from "../components/MajorsInput";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuth } from "../hooks/AuthContext";
import { useLanguage } from "../hooks/LanguageContext";
import { authErrorMessage } from "../services/authErrors";
import { colors, fonts } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { type Language } from "../constants/translations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 250;

type UserRole = "student" | "parent";

const LANG_OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "he", label: "עברית" },
  { code: "ar", label: "العربية" },
];

export default function SignUp() {
  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  
  // Student-only fields
  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [grade, setGrade] = useState("");
  const [majors, setMajors] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { language, changeLanguage, t } = useLanguage();

  // Preferred language
  const [preferredLang, setPreferredLang] = useState<Language>(language);

  // Keep preferredLang in sync with LanguageContext
  useEffect(() => {
    setPreferredLang(language);
  }, [language]);

  const isStudent = role === "student";

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const name = username.trim() || (role === "parent" ? "Parent" : "Student");
      const metadata = isStudent
        ? { role, school: school.trim(), city: city.trim(), grade_level: grade, majors, language: preferredLang }
        : { role, language: preferredLang };

      const res = await signUp(email, password, name, metadata);

      // Save the preferred language to profile + AsyncStorage
      await changeLanguage(preferredLang);

      if (res?.session) {
        router.replace("/(tabs)");
      } else {
        Alert.alert(t("alert_confirm_email"), t("alert_confirm_email_msg"));
        router.replace("/sign-in");
      }
    } catch (err: any) {
      console.warn("Sign up error:", err?.message ?? err);
      Alert.alert(t("alert_sign_up_failed"), authErrorMessage(err, t("alert_sign_up_failed_msg")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.flexContainer}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Decorative Hero Banner */}
        <View style={styles.heroContainer}>
          <Image
            source={require("../assets/images/sign_img.png")}
            style={styles.heroImage}
            contentFit="cover"
            priority="high"
            transition={0}
          />
          {/* Floating Back Button */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={15}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.heading} />
          </Pressable>
        </View>

        {/* Large Floating Content Card Overlapping Hero Image */}
        <View style={styles.floatingCard}>
          <Text style={styles.h1}>{t("sign_up_title")}</Text>
          <Text style={styles.subtitle}>{t("sign_up_subtitle")}</Text>

          {/* Role Selection Segmented Control */}
          <Text style={styles.selectorLabel}>{t("role_label")}</Text>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setRole("student")}
              style={[styles.chip, isStudent && styles.chipActive]}
            >
              <Text style={[styles.chipText, isStudent && styles.chipTextActive]}>{t("role_student")}</Text>
            </Pressable>
            <Pressable
              onPress={() => setRole("parent")}
              style={[styles.chip, !isStudent && styles.chipActive]}
            >
              <Text style={[styles.chipText, !isStudent && styles.chipTextActive]}>{t("role_parent")}</Text>
            </Pressable>
          </View>

          <View style={styles.formContainer}>
            <CustomInput
              label={`${t("email_label")} *`}
              value={email}
              onChangeText={setEmail}
              placeholder={t("email_placeholder")}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <CustomInput
              label={t("full_name_label")}
              value={username}
              onChangeText={setUsername}
              placeholder={isStudent ? t("student_name_placeholder") : t("parent_name_placeholder")}
            />
            
            <CustomInput
              label={`${t("password_label")} *`}
              value={password}
              onChangeText={setPassword}
              placeholder={t("password_placeholder")}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* Conditionally render Student-only fields */}
            {isStudent && (
              <View style={styles.studentFields}>
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
                  value={grade}
                  onChange={setGrade}
                  label={t("grade_label")}
                />
                <MajorsInput
                  label={t("majors_label")}
                  value={majors}
                  onChange={setMajors}
                />
              </View>
            )}

            {/* Preferred Language */}
            <Text style={[styles.selectorLabel, { marginTop: 16 }]}>{t("preferred_language")}</Text>
            <View style={styles.segment}>
              {LANG_OPTIONS.map((opt) => {
                const isActive = preferredLang === opt.code;
                return (
                  <Pressable
                    key={opt.code}
                    onPress={() => {
                      setPreferredLang(opt.code);
                      changeLanguage(opt.code);
                    }}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <CustomButton
              title={loading ? t("signing_up") : t("sign_up_btn")}
              onPress={handleSubmit}
              disabled={loading || !email.trim() || !password.trim() || !username.trim()}
              style={styles.signUpBtn}
            />
            
            {loading && <ActivityIndicator style={{ marginTop: 12 }} color={colors.accent} />}

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{t("already_have_account")}{" "}</Text>
              <Pressable onPress={() => router.push("/sign-in")}>
                <Text style={styles.signInLink}>{t("sign_in_btn")}</Text>
              </Pressable>
            </View>

            <LanguageSwitcher />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: "#ECF9FC",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: "#ECF9FC",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 44,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingCard: {
    flex: 1,
    marginTop: -44, // Smooth overlapping transition onto hero image
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  h1: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.heading,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.muted,
    marginBottom: 20,
    lineHeight: 22,
  },
  selectorLabel: {
    fontFamily: fonts.bodyBold,
    color: colors.heading,
    fontSize: 14,
    marginBottom: 8,
  },
  segment: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
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
  formContainer: {
    width: "100%",
  },
  studentFields: {
    width: "100%",
    marginTop: 4,
  },
  signUpBtn: {
    marginTop: 16,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  signInLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.accent,
  },
});