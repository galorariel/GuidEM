import React from 'react';
import { View, TextInput, Text, StyleSheet, KeyboardTypeOptions } from 'react-native';
type Props ={
  label?: string,
  value: string,
  onChangeText: (t:string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export default function CustomInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: Props) {
  return(
    <View style={{ width: '100%' }}>
      {label ? <Text style={styles.label}>{label}</Text> : null }
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor='#777'
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Inter_700Bold', color: '#107c8f', marginBottom: 6},
  input: {
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom:12,
    fontFamily: 'Inter_400Regular',
    color: '#107c8f',
  },
});
