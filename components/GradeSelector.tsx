import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../constants/theme";

const GRADE_OPTIONS = ["9", "10", "11", "12"];

type Props = {
  value: string;
  onChange: (grade: string) => void;
  label?: string;
};

export default function GradeSelector({ value, onChange, label }: Props) {
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.gradeRow}>
        {GRADE_OPTIONS.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.gradeOption, selected && styles.gradeOptionSelected]}
            >
              <Text style={[styles.gradeOptionText, selected && styles.gradeOptionTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    marginBottom: 6,
  },
  gradeRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  gradeOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: colors.card,
  },
  gradeOptionSelected: {
    backgroundColor: colors.button,
    borderColor: colors.button,
  },
  gradeOptionText: {
    fontFamily: fonts.body,
    color: colors.accent,
  },
  gradeOptionTextSelected: {
    fontFamily: fonts.bodyBold,
    color: "#fff",
  },
});
