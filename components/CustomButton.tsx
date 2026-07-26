import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export default function CustomButton ({ title, onPress, disabled, style, textStyle }: Props) {
  return(
    <Pressable 
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, disabled && styles.disabled, style]}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.button,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  text: {fontWeight: '700', color: '#fff'}
});