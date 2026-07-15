import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import CustomButton from "../../components/CustomButton";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { authErrorMessage } from "../../services/authErrors";
import { ensureFirstUnit, getGuideUnits, markStepDone, submitChoice, type GuideUnitFull } from "../../services/guide";
import { clearCareerGoal, getProfile, setCareerGoal } from "../../services/supabase";

export default function Guide() {
  const { user } = useAuth();
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [goalCareerId, setGoalCareerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [units, setUnits] = useState<GuideUnitFull[]>([]);
  const [guideLoading, setGuideLoading] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [stepBusyId, setStepBusyId] = useState<string | null>(null);
  const [choiceBusyUnitId, setChoiceBusyUnitId] = useState<string | null>(null);
  const name = (user?.user_metadata?.full_name as string) || "Student";

  const loadGuide = useCallback(async (userId: string) => {
    setGuideLoading(true);
    try {
      await ensureFirstUnit(userId);
      setUnits(await getGuideUnits(userId));
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
    setLoading(false);
    if (goal) {
      await loadGuide(user.id);
    } else {
      setUnits([]);
    }
  }, [user, loadGuide]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSet = async () => {
    const t = draft.trim();
    if (!t || !user) return;
    setBusy(true);
    try {
      await setCareerGoal(user.id, t); // free-text goal, no catalog link
      setDraft("");
      await load();
    } catch (err: any) {
      Alert.alert("Couldn't set goal", authErrorMessage(err, "Please try again."));
    } finally {
      setBusy(false);
    }
  };

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

  const handleMarkStepDone = async (stepId: string) => {
    if (!user) return;
    setStepBusyId(stepId);
    try {
      await markStepDone(stepId);
      setExpandedStepId(null);
      setUnits(await getGuideUnits(user.id));
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
      await submitChoice(user.id, unit, optionId);
      setUnits(await getGuideUnits(user.id));
    } catch (err: any) {
      Alert.alert("Couldn't submit choice", authErrorMessage(err, "Please try again."));
      // Refresh so a retry sees committed state (unit now 'done'), letting the
      // idempotent guard in submitChoice avoid a duplicate progress summary.
      setUnits(await getGuideUnits(user.id));
    } finally {
      setChoiceBusyUnitId(null);
    }
  };

  const renderChoiceSection = (unit: GuideUnitFull) => {
    if (!unit.choice) return null;

    if (unit.status === "done") {
      const selected = unit.choice.options.find((o) => o.id === unit.choice!.selectedOptionId);
      return (
        <View style={styles.choiceBox}>
          <Text style={styles.label}>Your decision</Text>
          <Text style={styles.body}>You chose: {selected?.label ?? unit.choice.selectedOptionId}</Text>
        </View>
      );
    }

    if (unit.status !== "active") return null;

    const allStepsDone = unit.steps.every((s) => s.completedAt != null);
    if (!allStepsDone) {
      return (
        <View style={styles.choiceBox}>
          <Text style={styles.hint}>Finish the steps to unlock your decision</Text>
        </View>
      );
    }

    const isBusy = choiceBusyUnitId === unit.id;
    return (
      <View style={styles.choiceBox}>
        <Text style={styles.label}>{unit.choice.prompt}</Text>
        {unit.choice.options.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.optionCard, isBusy && styles.disabled]}
            onPress={() => handleSubmitChoice(unit, option.id)}
            disabled={isBusy}
          >
            <Text style={styles.optionLabel}>{option.label}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Hi {name},{"\n"}your career guide</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
      ) : (
        <>
          {goalTitle ? (
            <View style={styles.card}>
              <Text style={styles.label}>Your goal</Text>
              <Text style={styles.title}>{goalTitle}</Text>
              {goalCareerId ? (
                <CustomButton
                  title="View career"
                  onPress={() => router.push(`/career?id=${goalCareerId}` as any)}
                />
              ) : null}
              <CustomButton title="Clear goal" onPress={handleClear} disabled={busy} style={styles.clearBtn} />
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.label}>{goalTitle ? "Change your goal" : "Set your goal"}</Text>
            <Text style={styles.body}>
              {goalTitle
                ? "Type a new goal to replace it, or browse Search to pick a career."
                : "Type the career you want to work toward, or browse Search to pick one."}
            </Text>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="e.g. AI Developer at Google"
              placeholderTextColor={colors.muted}
              onSubmitEditing={handleSet}
            />
            <CustomButton title="Set goal" onPress={handleSet} disabled={busy || !draft.trim()} />
          </View>

          {goalTitle ? (
            guideLoading && units.length === 0 ? (
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
                            <CustomButton
                              title="Mark done"
                              onPress={() => handleMarkStepDone(step.id)}
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
            )
          ) : null}
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
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginBottom: 10, fontFamily: fonts.body, color: colors.heading },
  clearBtn: { backgroundColor: colors.muted },
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
  disabled: { opacity: 0.6 },
});
