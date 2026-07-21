import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts } from '../constants/theme';

interface RatingScaleProps {
  label: string;
  selectedValue: number;
  onValueChange: (value: number) => void;
}

const RatingScale: React.FC<RatingScaleProps> = ({ label, selectedValue, onValueChange }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((value) => (
          <View key={value} style={styles.ratingButtonWrapper}>
            <TouchableOpacity
              style={[styles.ratingButton, selectedValue === value && styles.selectedRatingButton]}
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
    marginBottom: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 16,
    color: colors.heading,
    marginBottom: 8,
    fontFamily: 'Inter_400Regular', // Assuming you have Inter_400Regular in your fonts
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ratingButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.muted,
    minWidth: 40,
    alignItems: 'center',
  },
  selectedRatingButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  ratingText: {
    color: colors.heading,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  selectedRatingText: {
    color: colors.card,
  },
  ratingButtonWrapper: {
    alignItems: 'center',
  },
  subLabel: {
    marginTop: 4,
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
});

export default RatingScale;
