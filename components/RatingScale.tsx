import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts } from '../constants/theme';
import * as Haptics from 'expo-haptics';

interface RatingScaleProps {
  label: string;
  selectedValue: number;
  onValueChange: (value: number) => void;
  isLast?: boolean;
}

const RatingScale: React.FC<RatingScaleProps> = ({ label, selectedValue, onValueChange, isLast = false }) => {
  return (
    <View style={[styles.container, isLast && styles.lastContainer]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((value) => (
          <View key={value} style={styles.ratingButtonWrapper}>
            <TouchableOpacity
              style={[styles.ratingButton, selectedValue === value && styles.selectedRatingButton]}
              onPressIn={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              }}
              onPressOut={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              onPress={() => onValueChange(value)}
            >
              <Text style={[styles.ratingText, selectedValue === value && styles.selectedRatingText]}>
                {value}
              </Text>
            </TouchableOpacity>
            {value === 1 && <Text style={styles.subLabel}>Like less</Text>}
            {value === 5 && <Text style={styles.subLabel}>Love</Text>}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastContainer: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 2,
  },
  label: {
    fontSize: 14.5,
    color: colors.heading,
    marginBottom: 6,
    fontFamily: fonts.heading,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  selectedRatingButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  ratingText: {
    color: colors.heading,
    fontSize: 15,
    fontFamily: fonts.heading,
  },
  selectedRatingText: {
    color: colors.card,
  },
  ratingButtonWrapper: {
    alignItems: 'center',
    minHeight: 56,
  },
  subLabel: {
    marginTop: 2,
    fontSize: 9.5,
    fontFamily: fonts.heading,
    color: colors.accent,
  },
});

export default RatingScale;
