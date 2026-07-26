import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface AnimatedGradientBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export default function AnimatedGradientBackground({
  children,
  style,
}: AnimatedGradientBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={["#FFFFFF", "#ECF9FC", "#19BAD8"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ECF9FC",
  },
});
