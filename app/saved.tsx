import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import ActivityCard from "../components/ActivityCard";
import CareerCard from "../components/CareerCard";
import { colors, fonts } from "../constants/theme";
import { useAuth } from "../hooks/AuthContext";
import { getActivitiesByIds, getCareersByIds, type Activity, type Career } from "../services/catalog";
import { getSavedIds } from "../services/supabase";
import { useLanguage } from "../hooks/LanguageContext";

export default function Saved() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [careers, setCareers] = useState<Career[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const priceLabel = (a: Activity) => {
    return a.priceAmount === 0 ? t("activity_free") : `${a.priceCurrency}${a.priceAmount}`;
  };

  const load = useCallback(async () => {
    if (!user) { setCareers([]); setActivities([]); setLoading(false); return; }
    const [careerIds, activityIds] = await Promise.all([
      getSavedIds(user.id, "career"),
      getSavedIds(user.id, "activity"),
    ]);
    const [c, a] = await Promise.all([
      getCareersByIds(careerIds, language),
      getActivitiesByIds(activityIds, language)
    ]);
    setCareers(c);
    setActivities(a);
    setLoading(false);
  }, [user, language]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 22, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.section}>{t("saved_careers_header")}</Text>
      {careers.length === 0 ? (
        <Text style={styles.empty}>{t("saved_no_careers")}</Text>
      ) : (
        careers.map((c) => (
          <CareerCard key={c.id} item={c} onPress={() => router.push(`/career?id=${c.id}` as any)} />
        ))
      )}

      <Text style={styles.section}>{t("saved_activities_header")}</Text>
      {activities.length === 0 ? (
        <Text style={styles.empty}>{t("saved_no_activities")}</Text>
      ) : (
        activities.map((a) => (
          <ActivityCard
            key={a.id}
            item={{ id: a.id, title: a.title, category: a.category, location: a.location, priceLabel: priceLabel(a) }}
            isSaved
            onPress={() => router.push(`/detail?id=${a.id}` as any)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  section: { fontSize: 18, fontFamily: fonts.heading, color: colors.heading, marginTop: 18, marginBottom: 8 },
  empty: { fontFamily: fonts.body, color: colors.muted },
});
