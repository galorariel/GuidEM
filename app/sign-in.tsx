import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import CustomButton from "../components/CustomButton";
import CustomInput from "../components/CustomInput";
import { useAuth } from "../hooks/AuthContext";
import { authErrorMessage } from "../services/authErrors";
import { colors, fonts } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 250;

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (err: any) {
      console.warn("Sign in error:", err?.message ?? err);
      Alert.alert("Sign in failed", authErrorMessage(err, "Check your email and password."));
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
          <Text style={styles.h1}>Sign In</Text>
          <Text style={styles.subtitle}>Sign in to continue your career journey</Text>

          <View style={styles.formContainer}>
            <CustomInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <CustomInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />

            <CustomButton
              title={loading ? "Signing in…" : "Sign In"}
              onPress={handleSignIn}
              disabled={loading || !email.trim() || !password.trim()}
              style={styles.signInBtn}
            />

            {loading && <ActivityIndicator style={{ marginTop: 12 }} color={colors.accent} />}

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Pressable onPress={() => router.push("/sign-up")}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </Pressable>
            </View>
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
    marginBottom: 24,
    lineHeight: 22,
  },
  formContainer: {
    width: "100%",
  },
  signInBtn: {
    marginTop: 12,
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
  signUpLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.accent,
  },
});