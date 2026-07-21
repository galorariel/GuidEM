import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, KeyboardTypeOptions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
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
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const isSecure = secureTextEntry && isPasswordHidden;

  return (
    <View style={{ width: '100%' }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor='#777'
          secureTextEntry={secureTextEntry ? isSecure : false}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.input, secureTextEntry && { paddingRight: 40 }]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setIsPasswordHidden((prev) => !prev)}
            hitSlop={8}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={isPasswordHidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#107c8f"
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Inter_700Bold', color: '#107c8f', marginBottom: 6 },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
    color: '#107c8f',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 10,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
