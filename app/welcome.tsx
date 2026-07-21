import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import CustomButton from "../components/CustomButton";
import { colors, fonts } from "../constants/theme";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Discover. Grow. Build Your Future</Text>

        <View style={styles.buttonContainer}>
          <CustomButton
            title="Sign Up"
            onPress={() => router.push("/sign-up")}
            style={styles.primaryButton}
          />
          <CustomButton
            title="Sign In"
            onPress={() => router.push("/sign-in")}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 42,
    fontFamily: fonts.heading,
    color: colors.heading,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.accent,
    marginBottom: 48,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 16, // Adds space between the buttons
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 16,
    marginTop: 0, // Reset default CustomButton margin
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: colors.muted,
    marginTop: 0, // Reset default CustomButton margin
  },
});
