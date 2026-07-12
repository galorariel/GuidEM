import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useAuth } from "../hooks/AuthContext";
import { getProfile, getQuestionnaire, type Profile, type Questionnaire } from "../services/supabase";

export default function PersonalDetails() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    (async () => {
      setProfile(await getProfile(user.id));
      setQuestionnaire(await getQuestionnaire(user.id));
    })();
  }, [user]);

  if (!user) return null;

  const name = (user.user_metadata?.full_name as string) || "Student";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 22 }}>
      <Text style={styles.h1}>Personal Information</Text>
      <Text style={styles.field}>Name: {name}</Text>
      <Text style={styles.field}>Email: {user.email}</Text>
      {profile && (
        <>
          <Text style={styles.field}>Role: {profile.role || "-"}</Text>
          <Text style={styles.field}>School: {profile.school || "-"}</Text>
        </>
      )}
      {questionnaire && (
        <>
          <Text style={styles.h2}>Questionnaire Answers</Text>
          <Text style={styles.field}>Majors: {questionnaire.majors}</Text>
          <Text style={styles.field}>Career in Mind: {questionnaire.career_in_mind}</Text>
          <Text style={styles.field}>Hobbies: {questionnaire.hobbies}</Text>
          <Text style={styles.field}>Parents&apos; Jobs: {questionnaire.parents_jobs}</Text>
          <Text style={styles.field}>Dream Job: {questionnaire.dream_job}</Text>
          <Text style={styles.field}>Volunteer Interest: {questionnaire.volunteer_interest}</Text>
          <Text style={styles.field}>Psychometric Grade: {questionnaire.psychometric_grade}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e2f5ff" },
  h1: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#203b60", marginBottom: 16 },
  h2: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#203b60", marginTop: 20, marginBottom: 8 },
  field: { marginVertical: 4, fontFamily: "Inter_400Regular", color: "#107c8f" },
});
