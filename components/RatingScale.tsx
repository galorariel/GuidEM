import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts } from '../constants/theme';

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
    marginBottom: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastContainer: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 4,
  },
  label: {
    fontSize: 15,
    color: colors.heading,
    marginBottom: 7,
    fontFamily: 'Inter_400Regular',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ratingButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.muted,
    minWidth: 38,
    alignItems: 'center',
  },
  selectedRatingButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  ratingText: {
    color: colors.heading,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  selectedRatingText: {
    color: colors.card,
  },
  ratingButtonWrapper: {
    alignItems: 'center',
  },
  subLabel: {
    marginTop: 3,
    fontSize: 9.5,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
});

export default RatingScale;
