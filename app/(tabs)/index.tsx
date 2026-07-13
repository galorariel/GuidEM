import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import CustomButton from "../../components/CustomButton";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { getCareer, type Career } from "../../services/catalog";
import { getProfile } from "../../services/supabase";

export default function Guide() {
  const { user } = useAuth();
  const [career, setCareer] = useState<Career | null>(null);
  const [loading, setLoading] = useState(true);
  const name = (user?.user_metadata?.full_name as string) || "Student";

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const profile = await getProfile(user.id);
      if (profile?.career) setCareer(await getCareer(profile.career));
      setLoading(false);
    })();
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Hi {name},{"\n"}your career guide</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
      ) : career ? (
        <View style={styles.card}>
          <Text style={styles.label}>Your career path</Text>
          <Text style={styles.title}>{career.title}</Text>
          <Text style={styles.body} numberOfLines={3}>{career.description}</Text>
          <CustomButton title="View career details" onPress={() => router.push(`/career?id=${career.id}`)} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>No career set yet</Text>
          <Text style={styles.body}>Take the questionnaire or search careers to start building your guide.</Text>
          <CustomButton title="Go to Questionnaire" onPress={() => router.push({ pathname: "questionnaire" } as any)} />
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.label}>Your roadmap</Text>
        <Text style={styles.body}>A personalized, step-by-step plan to reach your career goal — coming soon.</Text>
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
});
