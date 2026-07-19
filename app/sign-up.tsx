import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
} from "react-native";
import CustomButton from "../components/CustomButton";
import CustomInput from "../components/CustomInput";
import GradeSelector from "../components/GradeSelector";
import MajorsInput from "../components/MajorsInput";
import { useAuth } from "../hooks/AuthContext";
import { authErrorMessage } from "../services/authErrors";
import { upsertProfile } from "../services/supabase";
import { colors, fonts } from "../constants/theme";

type UserRole = "student" | "parent";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Student-only fields
  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [grade, setGrade] = useState("");
  const [majors, setMajors] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const name = username.trim() || (role === "parent" ? "Parent" : "Student");
      const { user: created, session } = await signUp(email, password, name);
      
      if (!session) {
        Alert.alert(
          "Confirm your email",
          "We sent you a confirmation link. Please verify your email, then sign in."
        );
        router.replace("/sign-in");
        return;
      }

      if (created) {
        // Upsert role and matching details
        if (role === "student") {
          await upsertProfile(created.id, {
            full_name: name,
            role: "student",
            school: school.trim(),
            city: city.trim(),
            grade_level: grade,
            majors,
          });
        } else {
          await upsertProfile(created.id, {
            full_name: name,
            role: "parent",
          });
        }
      }
      router.replace("/(tabs)");
    } catch (err: any) {
      console.warn("Sign up error:", err?.message ?? err);
      Alert.alert("Sign up failed", authErrorMessage(err, "Check your input."));
    } finally {
      setLoading(false);
    }
  };

  const isStudent = role === "student";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.logoSmall}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.h1}>Sign Up</Text>

      {/* Role Selection Segmented Control */}
      <Text style={styles.selectorLabel}>I am a...</Text>
      <View style={styles.segment}>
        <Pressable
          onPress={() => setRole("student")}
          style={[styles.chip, isStudent && styles.chipActive]}
        >
          <Text style={[styles.chipText, isStudent && styles.chipTextActive]}>Student</Text>
        </Pressable>
        <Pressable
          onPress={() => setRole("parent")}
          style={[styles.chip, !isStudent && styles.chipActive]}
        >
          <Text style={[styles.chipText, !isStudent && styles.chipTextActive]}>Parent</Text>
        </Pressable>
      </View>

      <CustomInput
        label="Email *"
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <CustomInput
        label="Name *"
        value={username}
        onChangeText={setUsername}
        placeholder={isStudent ? "Student name" : "Parent name"}
      />
      
      <CustomInput
        label="Password *"
        value={password}
        onChangeText={setPassword}
        placeholder="********"
        secureTextEntry
        autoCapitalize="none"
      />

      {/* Conditionally render Student-only fields */}
      {isStudent && (
        <View style={styles.studentFields}>
          <CustomInput
            label="School"
            value={school}
            onChangeText={setSchool}
            placeholder="School name"
          />
          <CustomInput
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="Tel Aviv"
          />
          <GradeSelector
            value={grade}
            onChange={setGrade}
            label="Grade level"
          />
          <MajorsInput
            label="Majors / subjects"
            value={majors}
            onChange={setMajors}
          />
        </View>
      )}

      <CustomButton
        title={loading ? "Signing up…" : "Sign Up"}
        onPress={handleSubmit}
        disabled={loading || !email.trim() || !password.trim() || !username.trim()}
        style={styles.signUpBtn}
      />
      
      {loading && <ActivityIndicator style={{ marginTop: 10 }} color={colors.accent} />}

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Pressable onPress={() => router.push("/sign-in")}>
          <Text style={styles.signInLink}>Sign in</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e2f5ff",
  },
  scrollContent: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 40,
    justifyContent: "center",
  },
  logoSmall: {
    width: 140,
    height: 60,
    marginBottom: 10,
    alignSelf: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  h1: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.heading,
    marginBottom: 14,
    textAlign: "center",
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
    marginBottom: 18,
  },
  chip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 8,
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
  studentFields: {
    width: "100%",
    marginTop: 4,
  },
  signUpBtn: {
    marginTop: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontFamily: fonts.body,
    color: colors.muted,
  },
  signInLink: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
});