import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/theme';

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
          <TouchableOpacity
            key={value}
            style={[styles.ratingButton, selectedValue === value && styles.selectedRatingButton]}
            onPress={() => onValueChange(value)}
          >
            <Text style={[styles.ratingText, selectedValue === value && styles.selectedRatingText]}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 16,
    color: colors.heading,
    marginBottom: 10,
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
});

export default RatingScale;
