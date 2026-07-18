import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import CustomButton from "../../components/CustomButton";
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
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
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
    if (!user) { setLoading(false); return; }
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
      setExpandedStepId(null);

      // Refresh units to get updated step state
      const updatedUnits = await getGuideUnits(user.id);
      setUnits(updatedUnits);

      // Check if all steps are now done — if so, generate choices
      const updatedUnit = updatedUnits.find((u) => u.id === unit.id);
      if (updatedUnit && updatedUnit.steps.every((s) => s.completedAt != null) && !updatedUnit.choice) {
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
        // Pause/graduate — journey ended
        setJourneyPaused(true);
      }
      // Reload profile to get updated specialization
      const profile = await getProfile(user.id);
      setSpecialization(profile?.career_specialization ?? null);
      setCareerPath(profile?.career_path ?? []);
      setUnits(await getGuideUnits(user.id));
    } catch (err: any) {
      Alert.alert("Couldn't submit choice", authErrorMessage(err, "Please try again."));
      // Refresh so a retry sees committed state
      setUnits(await getGuideUnits(user.id));
    } finally {
      setChoiceBusyUnitId(null);
    }
  };

  const renderChoiceSection = (unit: GuideUnitFull) => {
    // Unit is done — show what was chosen
    if (unit.status === "done" && unit.choice) {
      const selected = unit.choice.options.find((o) => o.id === unit.choice!.selectedOptionId);
      return (
        <View style={styles.choiceBox}>
          <Text style={styles.label}>Your decision</Text>
          <Text style={styles.body}>
            You chose: {selected?.label ?? unit.choice.selectedOptionId}
          </Text>
          {selected?.specializationLabel ? (
            <Text style={styles.hint}>
              Narrowed to: {selected.specializationLabel}
            </Text>
          ) : (
            <Text style={styles.hint}>Journey paused — career summary generated</Text>
          )}
        </View>
      );
    }

    if (unit.status !== "active") return null;

    const allStepsDone = unit.steps.every((s) => s.completedAt != null);

    // Steps not done — show hint
    if (!allStepsDone) {
      return (
        <View style={styles.choiceBox}>
          <Text style={styles.hint}>Finish the steps to unlock your path choices</Text>
        </View>
      );
    }

    // All steps done but choices not generated yet — show loading
    if (!unit.choice) {
      if (choiceGenerating) {
        return (
          <View style={styles.choiceBox}>
            <Text style={styles.label}>Generating your path choices…</Text>
            <ActivityIndicator style={{ marginTop: 8 }} color={colors.accent} />
          </View>
        );
      }
      // Edge case: all steps done but no choice and not generating — trigger generation
      return (
        <View style={styles.choiceBox}>
          <CustomButton
            title="Generate path choices"
            onPress={async () => {
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
            }}
          />
        </View>
      );
    }

    // Choices available — render them
    const isBusy = choiceBusyUnitId === unit.id;
    return (
      <View style={styles.choiceBox}>
        <Text style={styles.label}>{unit.choice.prompt}</Text>
        {unit.choice.options.map((option) => (
          <Pressable
            key={option.id}
            style={[
              styles.optionCard,
              isBusy && styles.disabled,
              option.specializationLabel == null && styles.pauseOption,
            ]}
            onPress={() => handleSubmitChoice(unit, option.id)}
            disabled={isBusy}
          >
            <Text style={styles.optionLabel}>{option.label}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
            {option.specializationLabel ? (
              <Text style={styles.specLabel}>→ {option.specializationLabel}</Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    );
  };

  // ---- Render ----------------------------------------------------------------

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
                  <Text style={styles.breadcrumb}>
                    {careerPath.join(" → ")}
                  </Text>
                ) : null}
                {goalCareerId ? (
                  <CustomButton
                    title="View career"
                    onPress={() => router.push(`/career?id=${goalCareerId}` as any)}
                  />
                ) : null}
                <CustomButton title="Clear goal" onPress={handleClear} disabled={busy} style={styles.clearBtn} />
              </View>

              {/* Journey paused state */}
              {journeyPaused ? (
                <View style={styles.card}>
                  <Text style={styles.label}>🎓 Journey Complete</Text>
                  <Text style={styles.body}>
                    You've explored your path to {specialization ?? goalTitle} and paused your journey.
                    You can clear your goal to start a new path, or continue exploring your career.
                  </Text>
                </View>
              ) : null}

              {/* Guide units */}
              {guideLoading && units.length === 0 ? (
                <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
              ) : (
                units.map((unit) => (
                  <View key={unit.id} style={styles.card}>
                    <View style={styles.unitHeaderRow}>
                      <Text style={styles.title}>{unit.title}</Text>
                      <Text style={[styles.badge, unit.status === "done" ? styles.badgeDone : styles.badgeActive]}>
                        {unit.status === "done" ? "Done" : unit.status === "active" ? "Active" : "Locked"}
                      </Text>
                    </View>
                    <Text style={styles.body}>{unit.summary}</Text>

                    {unit.steps.map((step) => {
                      const isDone = step.completedAt != null;
                      const isExpanded = expandedStepId === step.id;
                      return (
                        <View key={step.id} style={styles.stepRow}>
                          <Pressable
                            onPress={() => setExpandedStepId(isExpanded ? null : step.id)}
                            style={styles.stepHeader}
                            disabled={isDone}
                          >
                            <Text style={styles.stepMarker}>{isDone ? "✓" : "○"}</Text>
                            <Text style={styles.stepTitle}>{step.title}</Text>
                            <Text style={styles.stepKind}>{step.kind}</Text>
                          </Pressable>
                          {isExpanded && !isDone ? (
                            <View style={styles.stepBody}>
                              <Text style={styles.body}>{step.body}</Text>
                              {step.payload && (step.payload as any).externalUrl ? (
                                <CustomButton
                                  title={(step.payload as any).linkLabel || "Open Resource"}
                                  onPress={() => {
                                    Linking.openURL((step.payload as any).externalUrl);
                                  }}
                                  style={styles.linkBtn}
                                />
                              ) : null}
                              <CustomButton
                                title="Mark done"
                                onPress={() => handleMarkStepDone(step.id, unit)}
                                disabled={stepBusyId === step.id}
                              />
                            </View>
                          ) : null}
                        </View>
                      );
                    })}

                    {renderChoiceSection(unit)}
                  </View>
                ))
              )}
            </>
          ) : (
            /* No goal set — show CTAs to pick a career */
            <View style={styles.card}>
              <Text style={styles.title}>Choose a career to start your guided path</Text>
              <Text style={styles.body}>
                Take the personality questionnaire to discover careers that match you,
                or browse the career catalog to pick one directly.
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
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 22, paddingTop: 70, backgroundColor: colors.bg },
  h1: { fontSize: 28, fontFamily: fonts.heading, color: colors.heading, marginBottom: 18 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 16 },
  label: { fontFamily: fonts.bodyBold, color: colors.accent, marginBottom: 4 },
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.heading, marginBottom: 6, flexShrink: 1 },
  body: { fontFamily: fonts.body, color: colors.heading, marginBottom: 10 },
  clearBtn: { backgroundColor: colors.muted },
  specHeader: { fontFamily: fonts.bodyBold, color: colors.accent, fontSize: 13, marginTop: 6 },
  specValue: { fontFamily: fonts.heading, color: colors.heading, fontSize: 17, marginBottom: 6 },
  breadcrumb: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, marginBottom: 10 },
  unitHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 },
  badge: { fontFamily: fonts.bodyBold, fontSize: 12, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, overflow: "hidden" },
  badgeActive: { backgroundColor: colors.accent, color: "#fff" },
  badgeDone: { backgroundColor: colors.button, color: "#fff" },
  stepRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 10 },
  stepHeader: { flexDirection: "row", alignItems: "center" },
  stepMarker: { fontFamily: fonts.bodyBold, color: colors.accent, marginRight: 8, width: 18 },
  stepTitle: { fontFamily: fonts.bodyBold, color: colors.heading, flex: 1 },
  stepKind: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginLeft: 8 },
  stepBody: { marginTop: 8, paddingLeft: 26 },
  choiceBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  hint: { fontFamily: fonts.body, color: colors.muted, fontStyle: "italic" },
  optionCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 8 },
  optionLabel: { fontFamily: fonts.bodyBold, color: colors.heading, marginBottom: 2 },
  optionDescription: { fontFamily: fonts.body, color: colors.muted },
  specLabel: { fontFamily: fonts.body, color: colors.accent, fontSize: 12, marginTop: 4 },
  pauseOption: { borderColor: colors.button, borderWidth: 2, backgroundColor: "#f0faf4" },
  disabled: { opacity: 0.6 },
  ctaButton: { marginBottom: 10 },
  ctaButtonSecondary: { backgroundColor: colors.accent },
  linkBtn: { backgroundColor: colors.accent, marginBottom: 6 },
});
