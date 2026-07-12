import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, Image } from "react-native";
import CustomButton from "../components/CustomButton";
import CustomInput from "../components/CustomInput";
import { useAuth } from "../hooks/AuthContext";

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
      console.error("Sign in error", err);
      Alert.alert("Sign in failed", err?.message || "Check email/password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Image source={require("../assets/images/logo.png")} style={styles.logoImage} resizeMode="contain" />
      </View>

      <Text style={styles.h1}>Sign In</Text>

      <CustomInput label="Email" value={email} onChangeText={setEmail} placeholder="name@example.com" />
      <CustomInput label="Password" value={password} onChangeText={setPassword} placeholder="********" secureTextEntry />

      <CustomButton
        title={loading ? "Signing in…" : "Sign In"}
        onPress={handleSignIn}
        disabled={loading || !email.trim() || !password.trim()}
      />
      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}

      <View style={styles.footerRow}>
        <Pressable onPress={() => router.push("/sign-up")}>
          <Text style={{ fontWeight: "800" }}>Sign Up</Text>
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
  logoCircle: {
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
});