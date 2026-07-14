import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "../constants/theme";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
};

export default function MajorsInput({ value, onChange, label }: Props) {
  const [draft, setDraft] = useState("");

  const addEntry = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const isDuplicate = value.some(
      (entry) => entry.toLowerCase() === trimmed.toLowerCase()
    );
    if (!isDuplicate) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  };

  const removeEntry = (entry: string) => {
    onChange(value.filter((v) => v !== entry));
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {value.length > 0 ? (
        <View style={styles.chipRow}>
          {value.map((entry) => (
            <View key={entry} style={styles.chip}>
              <Text style={styles.chipText}>{entry}</Text>
              <Pressable onPress={() => removeEntry(entry)} hitSlop={8}>
                <Text style={styles.chipRemove}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.hint}>No subjects added yet</Text>
      )}

      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add subject"
          placeholderTextColor={colors.muted}
          style={styles.input}
          onSubmitEditing={addEntry}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={addEntry}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", marginBottom: 12 },
  label: { fontFamily: fonts.bodyBold, color: colors.accent, marginBottom: 6 },
  hint: { fontFamily: fonts.body, color: colors.muted, marginBottom: 8 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontFamily: fonts.body,
    color: colors.accent,
    marginRight: 6,
  },
  chipRemove: {
    fontFamily: fonts.bodyBold,
    color: colors.muted,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    color: colors.accent,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: colors.button,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: {
    fontFamily: fonts.bodyBold,
    color: "#fff",
  },
});
