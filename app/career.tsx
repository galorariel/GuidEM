import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import ActivityCard from "../components/ActivityCard";
import CustomButton from "../components/CustomButton";
import { colors, fonts } from "../constants/theme";
import { useAuth } from "../hooks/AuthContext";
import { getActivitiesForCareer, getCareer, type Activity, type Career } from "../services/catalog";
import { addSaved, getSavedIds, removeSaved } from "../services/supabase";

function priceLabel(a: Activity) {
  return a.priceAmount === 0 ? "Free" : `${a.priceCurrency}${a.priceAmount}`;
}

export default function CareerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [career, setCareer] = useState<Career | null>(null);
  const [related, setRelated] = useState<Activity[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const c = await getCareer(String(id));
      setCareer(c);
      if (c) setRelated(await getActivitiesForCareer(c.id));
      if (user && c) {
        const ids = await getSavedIds(user.id, "career");
        setIsSaved(ids.includes(c.id));
      }
      setLoading(false);
    })();
  }, [id, user]);

  const toggleSave = async () => {
    if (!career || !user) return;
    if (isSaved) { await removeSaved(user.id, career.id, "career"); setIsSaved(false); }
    else { await addSaved(user.id, career.id, "career"); setIsSaved(true); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!career) return <View style={styles.center}><Text style={styles.value}>Career not found</Text></View>;

  const salary =
    career.salaryMin != null && career.salaryMax != null
      ? `${career.salaryCurrency}${career.salaryMin.toLocaleString()} – ${career.salaryCurrency}${career.salaryMax.toLocaleString()} / ${career.salaryPeriod}`
      : "—";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 22 }}>
      <Text style={styles.title}>{career.title}</Text>

      <CustomButton
        title={isSaved ? "Considering ✓ (tap to remove)" : "Save (considering)"}
        onPress={toggleSave}
        disabled={!user}
      />

      <Text style={styles.label}>Description</Text>
      <Text style={styles.value}>{career.description}</Text>

      <Text style={styles.label}>Required Education</Text>
      {career.requiredEducation.map((e) => (<Text key={e} style={styles.value}>• {e}</Text>))}

      <Text style={styles.label}>Required Skills</Text>
      {career.requiredSkills.map((s) => (<Text key={s} style={styles.value}>• {s}</Text>))}

      <Text style={styles.label}>Recommended Subjects</Text>
      {career.recommendedSubjects.map((s) => (<Text key={s} style={styles.value}>• {s}</Text>))}

      <Text style={styles.label}>Salary Range</Text>
      <Text style={styles.value}>{salary}</Text>

      <Text style={styles.label}>Work Environment</Text>
      <Text style={styles.value}>{career.workEnvironment}</Text>

      <Text style={styles.label}>Future Demand</Text>
      <Text style={styles.value}>{career.demandLevel.replace(/_/g, " ")}</Text>

      {related.length > 0 && (
        <>
          <Text style={styles.label}>Related activities</Text>
          {related.map((a) => (
            <ActivityCard
              key={a.id}
              item={{ id: a.id, title: a.title, category: a.category, location: a.location, priceLabel: priceLabel(a) }}
              onPress={() => router.push(`/detail?id=${a.id}` as any)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  title: { fontSize: 28, fontFamily: fonts.heading, color: colors.heading, marginBottom: 14 },
  label: { fontFamily: fonts.bodyBold, color: colors.accent, marginTop: 14 },
  value: { fontFamily: fonts.body, color: colors.accent, marginTop: 4 },
});
