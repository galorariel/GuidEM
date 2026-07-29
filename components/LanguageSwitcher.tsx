import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useLanguage } from "../hooks/LanguageContext";
import { type Language } from "../constants/translations";
import { colors, fonts } from "../constants/theme";

const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "he", label: "עב" },
  { code: "ar", label: "عر" },
];

export default function LanguageSwitcher() {
  const { language, changeLanguage, t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t("language_label")}</Text>
      <View style={styles.row}>
        {LANGUAGE_OPTIONS.map((opt) => {
          const isActive = language === opt.code;
          return (
            <Pressable
              key={opt.code}
              onPress={() => changeLanguage(opt.code)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.heading,
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
});
