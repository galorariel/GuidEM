import { router } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import CustomButton from "../../components/CustomButton";
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
      console.error(e);
      Alert.alert("Error", "Could not sign out.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Profile</Text>
      <Text style={styles.line}>Name: {name}</Text>
      <Text style={styles.line}>Email: {email}</Text>
      <View style={{ marginTop: 18 }}>
        <Text style={styles.menu} onPress={() => router.push("/personal-details")}>
          • Personal Information
        </Text>
      </View>
      <CustomButton title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 60, backgroundColor: "#e2f5ff" },
  h1: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#203b60", marginBottom: 14 },
  line: { marginTop: 6, fontFamily: "Inter_400Regular", color: "#107c8f" },
  menu: { marginTop: 10, fontFamily: "Inter_700Bold", color: "#107c8f" },
});
