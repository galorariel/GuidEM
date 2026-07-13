import { router } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import CustomButton from "../../components/CustomButton";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";

export default function Profile() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const name = (user.user_metadata?.full_name as string) || "Student";
  const email = user.email || "-";

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", "Could not sign out.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Profile</Text>
      <Text style={styles.line}>Name: {name}</Text>
      <Text style={styles.line}>Email: {email}</Text>
      <View style={{ marginTop: 18 }}>
        <Text style={styles.menu} onPress={() => router.push("/personal-details")}>• Personal Information</Text>
        <Text style={styles.menu} onPress={() => router.push("/saved")}>• Saved activities</Text>
      </View>
      <CustomButton title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 60, backgroundColor: colors.bg },
  h1: { fontSize: 28, fontFamily: fonts.heading, color: colors.heading, marginBottom: 14 },
  line: { marginTop: 6, fontFamily: fonts.body, color: colors.accent },
  menu: { marginTop: 10, fontFamily: fonts.bodyBold, color: colors.accent },
});
