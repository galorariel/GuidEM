import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text } from "react-native";
import CustomButton from "../components/CustomButton";
import CustomInput from "../components/CustomInput";
import GradeSelector from "../components/GradeSelector";
import MajorsInput from "../components/MajorsInput";
import { useAuth } from "../hooks/AuthContext";
import { authErrorMessage } from "../services/authErrors";
import { getProfile, getQuestionnaire, upsertProfile, type Profile, type Questionnaire } from "../services/supabase";

export default function PersonalDetails() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);

  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [majors, setMajors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    (async () => {
      const loadedProfile = await getProfile(user.id);
      setProfile(loadedProfile);
      if (loadedProfile) {
        setSchool(loadedProfile.school || "");
        setCity(loadedProfile.city || "");
        setGradeLevel(loadedProfile.grade_level || "");
        setMajors(loadedProfile.majors || []);
      }
      setQuestionnaire(await getQuestionnaire(user.id));
    })();
  }, [user]);

  if (!user) return null;

  const name = (user.user_metadata?.full_name as string) || "Student";

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertProfile(user.id, {
        school: school.trim(),
        city: city.trim(),
        grade_level: gradeLevel,
        majors,
      });
      Alert.alert("Saved");
    } catch (err: any) {
      Alert.alert("Couldn't save", authErrorMessage(err, "Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const personalityLabel = profile?.personality_type
    ? profile.personality_type.charAt(0).toUpperCase() + profile.personality_type.slice(1)
    : "Not taken yet";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 22 }}>
      <Text style={styles.h1}>Personal Information</Text>
      <Text style={styles.field}>Name: {name}</Text>
      <Text style={styles.field}>Email: {user.email}</Text>
      {profile && <Text style={styles.field}>Role: {profile.role || "-"}</Text>}

      <CustomInput label="School" value={school} onChangeText={setSchool} placeholder="School name" />
      <CustomInput label="City" value={city} onChangeText={setCity} placeholder="Tel Aviv" />
      <GradeSelector value={gradeLevel} onChange={setGradeLevel} label="Grade level" />
      <MajorsInput label="Majors / subjects" value={majors} onChange={setMajors} />

      <Text style={styles.field}>Personality type: {personalityLabel}</Text>

      <CustomButton
        title={saving ? "Saving…" : "Save"}
        onPress={handleSave}
        disabled={saving}
      />
      {saving && <ActivityIndicator style={{ marginTop: 10 }} />}

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
