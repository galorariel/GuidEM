import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, Image } from "react-native";
import CustomButton from "../components/CustomButton";
import CustomInput from "../components/CustomInput";
import MajorsInput from "../components/MajorsInput";
import { colors, fonts } from "../constants/theme";
import { useAuth } from "../hooks/AuthContext";
import { authErrorMessage } from "../services/authErrors";
import { upsertProfile } from "../services/supabase";

const GRADE_OPTIONS = ["9", "10", "11", "12"];

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [grade, setGrade] = useState("");
  const [majors, setMajors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const name = username.trim() || "Student";
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
        // profile row is auto-created by the DB trigger; fill in extra fields
        await upsertProfile(created.id, {
          full_name: name,
          role: role.trim(),
          school: school.trim(),
          city: city.trim(),
          grade_level: grade,
          majors,
        });
      }
      router.replace("/(tabs)");
    } catch (err: any) {
      console.warn("Sign up error:", err?.message ?? err);
      Alert.alert("Sign up failed", authErrorMessage(err, "Check your input."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoSmall}>
        <Image source={require("../assets/images/logo.png")} style={styles.logoImage} resizeMode="contain" />
      </View>

      <Text style={styles.h1}>Sign Up</Text>

      <CustomInput label="Email *" value={email} onChangeText={setEmail} placeholder="name@example.com" />
      <CustomInput label="Role *" value={role} onChangeText={setRole} placeholder="student / teacher ..." />
      <CustomInput label="UserName *" value={username} onChangeText={setUsername} placeholder="username" />
      <CustomInput label="Password *" value={password} onChangeText={setPassword} placeholder="********" secureTextEntry />
      <CustomInput label="School" value={school} onChangeText={setSchool} placeholder="School name" />
      <CustomInput label="City" value={city} onChangeText={setCity} placeholder="Tel Aviv" />

      <Text style={styles.label}>Grade level</Text>
      <View style={styles.gradeRow}>
        {GRADE_OPTIONS.map((option) => {
          const selected = grade === option;
          return (
            <Pressable
              key={option}
              onPress={() => setGrade(option)}
              style={[styles.gradeOption, selected && styles.gradeOptionSelected]}
            >
              <Text style={[styles.gradeOptionText, selected && styles.gradeOptionTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <MajorsInput label="Majors / subjects" value={majors} onChange={setMajors} />

      <CustomButton
        title={loading ? "Signing up…" : "Sign Up"}
        onPress={handleSubmit}
        disabled={loading || !email.trim() || !password.trim()}
      />
      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}

      <View style={styles.footerRow}>
        <Pressable onPress={() => router.push("/sign-in")}>
          <Text style={{ fontWeight: "800" }}>Sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#e2f5ff",
  },
  logoSmall: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 70,
  },
  h1: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#203b60',
    marginBottom: 20,
    textAlign: "center",
  },
  footerRow: {
    marginTop: 20,
    alignItems: "center",
  },
  label: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    marginBottom: 6,
  },
  gradeRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  gradeOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: colors.card,
  },
  gradeOptionSelected: {
    backgroundColor: colors.button,
    borderColor: colors.button,
  },
  gradeOptionText: {
    fontFamily: fonts.body,
    color: colors.accent,
  },
  gradeOptionTextSelected: {
    fontFamily: fonts.bodyBold,
    color: "#fff",
  },
});