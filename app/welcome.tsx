import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import CustomButton from "../components/CustomButton";
import LogoAnimation from "../components/LogoAnimation";
import { colors, fonts } from "../constants/theme";

export default function WelcomeScreen() {
  const [animKey, setAnimKey] = useState(0);

  // Re-trigger logo animation every 20 seconds cleanly
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimKey((prev) => prev + 1);
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Full-Screen Image Background */}
      <Image
        source={require("../assets/images/welcome-page.png")}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        priority="high"
        transition={0}
      />

      {/* Subtle Readability Overlay */}
      <View style={styles.overlay} />

      {/* Foreground Content */}
      <View style={styles.content}>
        {/* SVGator Animated Logo */}
        <View style={styles.logoWrapper}>
          <LogoAnimation key={animKey} />
        </View>

        <Text style={styles.title}>GuidEM</Text>
        <Text style={styles.subtitle}>Discover. Grow. Build Your Future</Text>

        <View style={styles.buttonContainer}>
          <CustomButton
            title="Sign Up"
            onPress={() => router.push("/sign-up")}
            style={styles.signUpBtn}
            textStyle={{ color: "#ffffff" }}
          />
          <CustomButton
            title="Sign In"
            onPress={() => router.push("/sign-in")}
            style={styles.signInBtn}
            textStyle={{ color: "#ffffff" }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.10)",
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    zIndex: 2,
  },
  logoWrapper: {
    width: 300,
    height: 300,
    marginBottom: -16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoSvg: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 48,
    fontFamily: fonts.heading,
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: fonts.bodyBold,
    color: "#e2f8ff",
    marginBottom: 52,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  signUpBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.accent, // Dark blue/cyan #107c8f
    marginTop: 0,
  },
  signInBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.button, // Teal #55C5B1
    marginTop: 0,
  },
});
