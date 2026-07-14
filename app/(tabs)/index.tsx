import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from "react-native";
import CustomButton from "../../components/CustomButton";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { authErrorMessage } from "../../services/authErrors";
import { clearCareerGoal, getProfile, setCareerGoal } from "../../services/supabase";

export default function Guide() {
  const { user } = useAuth();
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [goalCareerId, setGoalCareerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const name = (user?.user_metadata?.full_name as string) || "Student";

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const profile = await getProfile(user.id);
    setGoalTitle(profile?.career_goal ?? null);
    setGoalCareerId(profile?.career ?? null);
    setLoading(false);
  }, [user]);

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

  return (
    <View style={styles.container}>
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
        </>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Your roadmap</Text>
        <Text style={styles.body}>A personalized, step-by-step plan to reach your goal — coming soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 70, backgroundColor: colors.bg },
  h1: { fontSize: 28, fontFamily: fonts.heading, color: colors.heading, marginBottom: 18 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 16 },
  label: { fontFamily: fonts.bodyBold, color: colors.accent, marginBottom: 4 },
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.heading, marginBottom: 6 },
  body: { fontFamily: fonts.body, color: colors.heading, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginBottom: 10, fontFamily: fonts.body, color: colors.heading },
  clearBtn: { backgroundColor: colors.muted },
});
