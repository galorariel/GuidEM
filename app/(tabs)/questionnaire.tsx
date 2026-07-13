import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { authErrorMessage } from "../../services/authErrors";
import { getQuestionnaire, upsertQuestionnaire } from "../../services/supabase";

export default function QuestionnaireTab() {
  const { user } = useAuth();
  const [majors, setMajors] = useState("");
  const [careerInMind, setCareerInMind] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [parentsJobs, setParentsJobs] = useState("");
  const [dreamJob, setDreamJob] = useState("");
  const [volunteerInterest, setVolunteerInterest] = useState("");
  const [psychometricGrade, setPsychometricGrade] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const q = await getQuestionnaire(user.id);
      if (q) {
        setMajors(q.majors); setCareerInMind(q.career_in_mind); setHobbies(q.hobbies);
        setParentsJobs(q.parents_jobs); setDreamJob(q.dream_job);
        setVolunteerInterest(q.volunteer_interest); setPsychometricGrade(q.psychometric_grade);
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await upsertQuestionnaire(user.id, {
        majors, career_in_mind: careerInMind, hobbies, parents_jobs: parentsJobs,
        dream_job: dreamJob, volunteer_interest: volunteerInterest, psychometric_grade: psychometricGrade,
      });
      Alert.alert("Saved", "Your answers were saved.");
    } catch (err: any) {
      console.warn("questionnaire save:", err?.message ?? err);
      Alert.alert("Couldn't save", authErrorMessage(err, "Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Career Questionnaire</Text>
      <Text style={styles.sub}>Fill this out to shape your career guide. You can edit it anytime.</Text>

      <CustomInput value={majors} onChangeText={setMajors} placeholder="Subjects / majors you like" />
      <CustomInput value={careerInMind} onChangeText={setCareerInMind} placeholder="Career in mind" />
      <CustomInput value={hobbies} onChangeText={setHobbies} placeholder="Hobbies" />
      <CustomInput value={parentsJobs} onChangeText={setParentsJobs} placeholder="Parents' jobs" />
      <CustomInput value={dreamJob} onChangeText={setDreamJob} placeholder="Dream job" />
      <CustomInput value={volunteerInterest} onChangeText={setVolunteerInterest} placeholder="Volunteering interest" />
      <CustomInput value={psychometricGrade} onChangeText={setPsychometricGrade} placeholder="Psychometric grade" />

      <CustomButton title={saving ? "Saving…" : "Save"} onPress={save} disabled={saving} />
      <CustomButton title="Get career recommendations (coming soon)" onPress={() => {}} disabled />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, paddingTop: 60, paddingBottom: 60 },
  h1: { fontSize: 28, fontFamily: fonts.heading, color: colors.heading, marginBottom: 6 },
  sub: { fontFamily: fonts.body, color: colors.accent, marginBottom: 18 },
});
