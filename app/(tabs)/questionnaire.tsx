import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import CareerCard from "../../components/CareerCard";
import CustomButton from "../../components/CustomButton";
import RatingScale from "../../components/RatingScale"; // Import the new RatingScale component
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { authErrorMessage } from "../../services/authErrors";
import { recommendCareers, type Career } from "../../services/catalog";
import { addSaved, getProfile, getSavedIds, removeSaved, setCareerGoal, upsertProfile, type PersonalityType } from "../../services/supabase";

const HOLLAND_CODES = ["Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional"];

const questions = [
  { text: "Study whales and other types of marine life", categories: [false, true, false, false, false, false] },
  { text: "Play a musical instrument", categories: [false, false, true, false, false, false] },
  { text: "Supervise the activities of children at a camp", categories: [false, false, false, true, false, false] },
  { text: "Manage a clothing store", categories: [false, false, false, false, true, false] },
  { text: "Operate a calculator", categories: [false, false, false, false, false, true] },
  { text: "Assemble products in a factory", categories: [true, false, false, false, false, false] },
  { text: "Work in a biology lab", categories: [false, true, false, false, false, false] },
  { text: "Perform stunts for a movie or television show", categories: [false, false, true, false, false, false] },
  { text: "Teach children how to read", categories: [false, false, false, true, false, false] },
  { text: "Sell houses", categories: [false, false, false, false, true, false] },
  { text: "Handle customers' bank transactions", categories: [false, false, false, false, false, true] },
  { text: "Install flooring in houses", categories: [true, false, false, false, false, false] },
  { text: "Make a map of the bottom of an ocean", categories: [false, true, false, false, false, false] },
  { text: "Design sets for plays", categories: [false, false, true, false, false, false] },
  { text: "Help elderly people with their daily activities", categories: [false, false, false, true, false, false] },
  { text: "Run a toy store", categories: [false, false, false, false, true, false] },
  { text: "Keep shipping and receiving records", categories: [false, false, false, false, false, true] },
  { text: "Test the quality of parts before shipment", categories: [true, false, false, false, false, false] },
  { text: "Study the structure of the human body", categories: [false, true, false, false, false, false] },
  { text: "Conduct a musical choir", categories: [false, false, true, false, false, false] },
  { text: "Give career guidance to people", categories: [false, false, false, true, false, false] },
  { text: "Sell restaurant franchises to individuals", categories: [false, false, false, false, true, false] },
  { text: "Generate the monthly payroll checks for an office", categories: [false, false, false, false, false, true] },
  { text: "Lay brick or tile", categories: [true, false, false, false, false, false] },
  { text: "Study animal behavior", categories: [false, true, false, false, false, false] },
  { text: "Direct a play", categories: [false, false, true, false, false, false] },
  { text: "Do volunteer work at a non-profit organization", categories: [false, false, false, true, false, false] },
  { text: "Sell merchandise at a department store", categories: [false, false, false, false, true, false] },
  { text: "Inventory supplies using a hand-held computer", categories: [false, false, false, false, false, true] },
  { text: "Work on an offshore oil-drilling rig", categories: [true, false, false, false, false, false] },
  { text: "Do research on plants or animals", categories: [false, true, false, false, false, false] },
  { text: "Design artwork for magazines", categories: [false, false, true, false, false, false] },
  { text: "Help people who have problems with drugs or alcohol", categories: [false, false, false, true, false, false] },
  { text: "Manage the operations of a hotel", categories: [false, false, false, false, true, false] },
  { text: "Use a computer program to generate customer bills", categories: [false, false, false, false, false, true] },
  { text: "Assemble electronic parts", categories: [true, false, false, false, false, false] },
  { text: "Develop a new medical treatment or procedure", categories: [false, true, false, false, false, false] },
  { text: "Write a song", categories: [false, false, true, false, false, false] },
  { text: "Teach an individual an exercise routine", categories: [false, false, false, true, false, false] },
  { text: "Operate a beauty salon or barber shop", categories: [false, false, false, false, true, false] },
  { text: "Maintain employee records", categories: [false, false, false, false, false, true] },
  { text: "Operate a grinding machine in a factory", categories: [true, false, false, false, false, false] },
  { text: "Conduct biological research", categories: [false, true, false, false, false, false] },
  { text: "Write books or plays", categories: [false, false, true, false, false, false] },
  { text: "Help people with family-related problems", categories: [false, false, false, true, false, false] },
  { text: "Manage a department within a large company", categories: [false, false, false, false, true, false] },
  { text: "Compute and record statistical and other numerical data", categories: [false, false, false, false, false, true] },
  { text: "Fix a broken faucet", categories: [true, false, false, false, false, false] },
];

type Mode = "loading" | "quiz" | "results";

export default function QuestionnaireTab() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("loading");
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(0)); // Initialize with 0 for no selection
  const [saving, setSaving] = useState(false);
  const [resultPrimary, setResultPrimary] = useState<string | null>(null);
  const [resultSecondary, setResultSecondary] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Career[]>([]);
  const [savedCareerIds, setSavedCareerIds] = useState<string[]>([]);
  const [goalCareerId, setGoalCareerId] = useState<string | null>(null);

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Stateful tab: if the test was already taken (profiles.personality_type set),
  // show the "completed" results view; otherwise the quiz. Loads on mount and on
  // user change. The tab stays mounted across tab switches and personality_type
  // only changes from a submit here, so we deliberately do NOT refresh on focus
  // (that would clobber an in-progress "Retake").
  const load = useCallback(async () => {
    if (!user) { setSavedCareerIds([]); setMode("quiz"); return; }
    setSavedCareerIds(await getSavedIds(user.id, "career"));
    const profile = await getProfile(user.id);
    setGoalCareerId(profile?.career ?? null);
    if (profile?.personality_type) {
      setResultPrimary(cap(profile.personality_type));
      setResultSecondary(null);
      setRecommendations(await recommendCareers(profile.personality_type, null, 5));
      setMode("results");
    } else {
      setMode("quiz");
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Refresh only the goal/saved state on focus (NOT the quiz/results mode, which
  // would clobber an in-progress Retake) so the recommendation cards' compass/♥
  // reflect changes made on other tabs.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getSavedIds(user.id, "career").then(setSavedCareerIds);
      getProfile(user.id).then((p) => setGoalCareerId(p?.career ?? null));
    }, [user])
  );

  const retake = () => {
    setSelectedAnswers(new Array(questions.length).fill(0));
    setRecommendations([]);
    setMode("quiz");
  };

  const toggleSaveCareer = async (id: string) => {
    if (!user) return;
    if (savedCareerIds.includes(id)) {
      await removeSaved(user.id, id, "career");
      setSavedCareerIds((p) => p.filter((x) => x !== id));
    } else {
      await addSaved(user.id, id, "career");
      setSavedCareerIds((p) => [...p, id]);
    }
  };

  const calculateResults = async () => {
    const scores = new Array(HOLLAND_CODES.length).fill(0);

    selectedAnswers.forEach((rating, questionIndex) => {
      if (rating > 0) { // Only process if a rating has been made
        questions[questionIndex].categories.forEach((appliesToCategory, categoryIndex) => {
          if (appliesToCategory) {
            scores[categoryIndex] += rating;
          }
        });
      }
    });

    // Pair scores with their corresponding Holland Code names
    const scoredCategories = HOLLAND_CODES.map((name, index) => ({ name, score: scores[index] }));

    // Sort categories by score in descending order
    scoredCategories.sort((a, b) => b.score - a.score);

    // Determine primary and secondary types
    const topCategory = scoredCategories[0];
    const secondCategory = scoredCategories.length > 1 ? scoredCategories[1] : null;

    if (topCategory.score <= 0) {
      Alert.alert("No selections made", "Please rate some activities to get your personality types.");
      return;
    }

    const primaryLabel = topCategory.name;
    const secondaryLabel = secondCategory && secondCategory.score > 0 ? secondCategory.name : null;
    // The DB CHECK on profiles.personality_type only accepts the six lowercase values.
    const primaryType = primaryLabel.toLowerCase() as PersonalityType;
    const secondaryType = secondaryLabel ? (secondaryLabel.toLowerCase() as PersonalityType) : null;

    if (!user) {
      Alert.alert("Sign in required", "Please sign in to save your results.");
      return;
    }

    setSaving(true);
    try {
      await upsertProfile(user.id, { personality_type: primaryType });
      const recs = await recommendCareers(primaryType, secondaryType, 5);
      setResultPrimary(primaryLabel);
      setResultSecondary(secondaryLabel);
      setRecommendations(recs);
      setMode("results");
    } catch (err: any) {
      Alert.alert("Something went wrong", authErrorMessage(err, "Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const onPickGoal = async (career: Career) => {
    if (!user) return;
    try {
      await setCareerGoal(user.id, career.title, career.id);
      setGoalCareerId(career.id); // reflect the new goal so the compass fills on return
      router.replace("/(tabs)" as any); // jump to the Guide tab (replace refocuses it → path regenerates)
    } catch (err: any) {
      Alert.alert("Something went wrong", authErrorMessage(err, "Please try again."));
    }
  };

  const handleRatingChange = (index: number, value: number) => {
    setSelectedAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = value;
      return newAnswers;
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Career Questionnaire</Text>

      {mode === "loading" ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={colors.accent} />
      ) : mode === "results" ? (
        <View style={styles.resultsContainer}>
          <Text style={styles.sub}>You&apos;ve completed the personality test.</Text>
          <Text style={styles.resultsTitle}>
            Your type: {resultPrimary}{resultSecondary ? ` / ${resultSecondary}` : ""}
          </Text>

          {recommendations.length > 0 ? (
            <>
              <Text style={styles.resultsSubtitle}>Recommended careers</Text>
              {recommendations.map((career) => (
                <CareerCard
                  key={career.id}
                  item={career}
                  isSaved={savedCareerIds.includes(career.id)}
                  onToggleSave={() => toggleSaveCareer(career.id)}
                  isGoal={goalCareerId === career.id}
                  onPress={() => router.push(`/career?id=${career.id}` as any)}
                  onSetGoal={() => onPickGoal(career)}
                />
              ))}
            </>
          ) : (
            <Text style={styles.sub}>No recommendations found for your type.</Text>
          )}

          <CustomButton title="Retake test" onPress={retake} style={styles.retakeBtn} />
        </View>
      ) : (
        <>
          <Text style={styles.sub}>Rate how much you like each activity (1-5) to discover your personality types.</Text>

          {questions.map((question, index) => (
            <View key={index} style={styles.questionContainer}>
              <RatingScale
                label={question.text}
                selectedValue={selectedAnswers[index]}
                onValueChange={(value) => handleRatingChange(index, value)}
              />
            </View>
          ))}

          <View style={styles.submitRow}>
            <CustomButton
              title={saving ? "Saving..." : "Get My Personality Types"}
              onPress={calculateResults}
              disabled={saving}
            />
            {saving ? <ActivityIndicator style={styles.spinner} color={colors.accent} /> : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, paddingTop: 60, paddingBottom: 60 },
  h1: { fontSize: 28, fontFamily: fonts.heading, color: colors.heading, marginBottom: 6 },
  sub: { fontFamily: fonts.body, color: colors.accent, marginBottom: 18 },
  questionContainer: { marginBottom: 15 },
  submitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  spinner: { marginTop: 10 },
  resultsContainer: { marginTop: 24 },
  resultsTitle: { fontSize: 18, fontFamily: fonts.heading, color: colors.heading, marginBottom: 12 },
  resultsSubtitle: { fontFamily: fonts.bodyBold, color: colors.accent, marginBottom: 8 },
  retakeBtn: { backgroundColor: colors.muted, marginTop: 12 },
});
