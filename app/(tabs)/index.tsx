import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import CustomButton from "../../components/CustomButton";
import GuidePath from "../../components/guide/GuidePath";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { authErrorMessage } from "../../services/authErrors";
import {
  ensureFirstUnit,
  generateAndPersistChoices,
  getGuideUnits,
  markStepDone,
  submitChoice,
  type GuideUnitFull,
} from "../../services/guide";
import { clearCareerGoal, getProfile } from "../../services/supabase";

export default function Guide() {
  const { user } = useAuth();
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [goalCareerId, setGoalCareerId] = useState<string | null>(null);
  const [specialization, setSpecialization] = useState<string | null>(null);
  const [careerPath, setCareerPath] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [units, setUnits] = useState<GuideUnitFull[]>([]);
  const [guideLoading, setGuideLoading] = useState(false);
  const [stepBusyId, setStepBusyId] = useState<string | null>(null);
  const [choiceBusyUnitId, setChoiceBusyUnitId] = useState<string | null>(null);
  const [choiceGenerating, setChoiceGenerating] = useState(false);
  const [journeyPaused, setJourneyPaused] = useState(false);
  const name = (user?.user_metadata?.full_name as string) || "Student";

  const loadGuide = useCallback(async (userId: string) => {
    setGuideLoading(true);
    try {
      await ensureFirstUnit(userId);
      const loaded = await getGuideUnits(userId);
      setUnits(loaded);

      // Detect if the journey was paused (last unit done, chosen option has no specialization)
      if (loaded.length > 0) {
        const last = loaded.reduce((a, b) => (b.unitIndex > a.unitIndex ? b : a));
        if (last.status === "done" && last.choice?.selectedOptionId) {
          const selectedOption = last.choice.options.find(
            (o) => o.id === last.choice!.selectedOptionId
          );
          if (selectedOption?.specializationLabel == null) {
            setJourneyPaused(true);
          } else {
            setJourneyPaused(false);
          }
        } else {
          setJourneyPaused(false);
        }
      }
    } catch (err: any) {
      Alert.alert("Guide error", authErrorMessage(err, "Please try again."));
    } finally {
      setGuideLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const profile = await getProfile(user.id);
    const goal = profile?.career_goal ?? null;
    setGoalTitle(goal);
    setGoalCareerId(profile?.career ?? null);
    setSpecialization(profile?.career_specialization ?? null);
    setCareerPath(profile?.career_path ?? []);
    setLoading(false);
    if (goal) {
      await loadGuide(user.id);
    } else {
      setUnits([]);
      setJourneyPaused(false);
    }
  }, [user, loadGuide]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleClear = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await clearCareerGoal(user.id);
      await load();
    } catch (err: any) {
      Alert.alert("Couldn't clear goal", authErrorMessage(err, "Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const handleMarkStepDone = async (stepId: string, unit: GuideUnitFull) => {
    if (!user) return;
    setStepBusyId(stepId);
    try {
      await markStepDone(stepId);

      // Refresh units to get updated step state
      const updatedUnits = await getGuideUnits(user.id);
      setUnits(updatedUnits);

      // Check if all steps are now done — if so, generate choices
      const updatedUnit = updatedUnits.find((u) => u.id === unit.id);
      if (
        updatedUnit &&
        updatedUnit.steps.every((s) => s.completedAt != null) &&
        !updatedUnit.choice
      ) {
        setChoiceGenerating(true);
        try {
          await generateAndPersistChoices(user.id, updatedUnit);
          setUnits(await getGuideUnits(user.id));
        } catch (err: any) {
          Alert.alert("Couldn't generate choices", authErrorMessage(err, "Please try again."));
        } finally {
          setChoiceGenerating(false);
        }
      }
    } catch (err: any) {
      Alert.alert("Couldn't mark step done", authErrorMessage(err, "Please try again."));
    } finally {
      setStepBusyId(null);
    }
  };

  const handleSubmitChoice = async (unit: GuideUnitFull, optionId: string) => {
    if (!user) return;
    setChoiceBusyUnitId(unit.id);
    try {
      const nextUnit = await submitChoice(user.id, unit, optionId);
      if (nextUnit === null) {
        setJourneyPaused(true);
      }
      // Reload profile to get updated specialization
      const profile = await getProfile(user.id);
      setSpecialization(profile?.career_specialization ?? null);
      setCareerPath(profile?.career_path ?? []);
      setUnits(await getGuideUnits(user.id));
    } catch (err: any) {
      Alert.alert("Couldn't submit choice", authErrorMessage(err, "Please try again."));
      setUnits(await getGuideUnits(user.id));
    } finally {
      setChoiceBusyUnitId(null);
    }
  };

  const handleGenerateChoices = async (unit: GuideUnitFull) => {
    if (!user) return;
    setChoiceGenerating(true);
    try {
      await generateAndPersistChoices(user.id, unit);
      setUnits(await getGuideUnits(user.id));
    } catch (err: any) {
      Alert.alert("Couldn't generate choices", authErrorMessage(err, "Please try again."));
    } finally {
      setChoiceGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Hi {name},{"\n"}your career guide</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
        ) : (
          <>
            {goalTitle ? (
              <>
                {/* Goal + Specialization header */}
                <View style={styles.card}>
                  <Text style={styles.label}>Your goal</Text>
                  <Text style={styles.title}>{goalTitle}</Text>
                  {specialization && specialization !== goalTitle ? (
                    <>
                      <Text style={styles.specHeader}>Current focus</Text>
                      <Text style={styles.specValue}>{specialization}</Text>
                    </>
                  ) : null}
                  {careerPath.length > 1 ? (
                    <Text style={styles.breadcrumb}>{careerPath.join(" → ")}</Text>
                  ) : null}
                  {goalCareerId ? (
                    <CustomButton
                      title="View career"
                      onPress={() => router.push(`/career?id=${goalCareerId}` as any)}
                    />
                  ) : null}
                  <CustomButton
                    title="Clear goal"
                    onPress={handleClear}
                    disabled={busy}
                    style={styles.clearBtn}
                  />
                </View>

                {/* Journey paused state */}
                {journeyPaused && (
                  <View style={styles.card}>
                    <Text style={styles.label}>🎓 Journey Complete</Text>
                    <Text style={styles.body}>
                      You've explored your path to {specialization ?? goalTitle} and paused your
                      journey. You can clear your goal to start a new path, or continue exploring your
                      career.
                    </Text>
                  </View>
                )}

                {/* Guide path rendering */}
                {guideLoading && units.length === 0 ? (
                  <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
                ) : (
                  <View style={styles.pathWrapper}>
                    <GuidePath
                      units={units}
                      isChoiceGenerating={choiceGenerating}
                      choiceBusyUnitId={choiceBusyUnitId}
                      stepBusyId={stepBusyId}
                      onMarkStepDone={handleMarkStepDone}
                      onSubmitChoice={handleSubmitChoice}
                      onGenerateChoices={handleGenerateChoices}
                    />
                  </View>
                )}
              </>
            ) : (
              /* No goal set — show CTAs to pick a career */
              <View style={styles.card}>
                <Text style={styles.title}>Choose a career to start your guided path</Text>
                <Text style={styles.body}>
                  Take the personality questionnaire to discover careers that match you, or browse
                  the career catalog to pick one directly.
                </Text>
                <CustomButton
                  title="Take the Questionnaire"
                  onPress={() => router.push("/(tabs)/questionnaire" as any)}
                  style={styles.ctaButton}
                />
                <CustomButton
                  title="Browse Careers"
                  onPress={() => router.push("/(tabs)/search" as any)}
                  style={styles.ctaButtonSecondary}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 22,
    paddingTop: 70,
    flexGrow: 1,
  },
  h1: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.heading,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.heading,
    marginBottom: 6,
    flexShrink: 1,
  },
  body: {
    fontFamily: fonts.body,
    color: colors.heading,
    marginBottom: 10,
  },
  clearBtn: {
    backgroundColor: colors.muted,
    marginTop: 8,
  },
  specHeader: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    fontSize: 13,
    marginTop: 6,
  },
  specValue: {
    fontFamily: fonts.heading,
    color: colors.heading,
    fontSize: 17,
    marginBottom: 6,
  },
  breadcrumb: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 13,
    marginBottom: 10,
  },
  pathWrapper: {
    flex: 1,
    width: "100%",
    minHeight: 500,
  },
  ctaButton: {
    marginBottom: 10,
  },
  ctaButtonSecondary: {
    backgroundColor: colors.accent,
  },
});
