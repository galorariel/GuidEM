import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../constants/theme";

export type BlockTheme = "blue" | "teal" | "green" | "card";

interface Soft3DBlockProps {
  title: string;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  theme?: BlockTheme;
  index?: number; // for staggered entry animation
  children?: React.ReactNode;
  style?: ViewStyle;
  badgeText?: string;
  onPress?: () => void;
}

const THEME_STYLES: Record<
  BlockTheme,
  { top: string; side: string; tintBg: string; text: string; headerIconBg: string }
> = {
  card: {
    top: "#ffffff",
    side: "#0369a1",
    tintBg: "#f0f9ff",
    text: colors.heading,
    headerIconBg: "#e0f2fe",
  },
  teal: {
    top: "#ffffff",
    side: "#0b5360",
    tintBg: "#f0fdfa",
    text: colors.heading,
    headerIconBg: "#ccfbf1",
  },
  green: {
    top: "#ffffff",
    side: "#389e8d",
    tintBg: "#f0fdf4",
    text: colors.heading,
    headerIconBg: "#e6f8f5",
  },
  blue: {
    top: "#ffffff",
    side: "#0369a1",
    tintBg: "#f0f9ff",
    text: colors.heading,
    headerIconBg: "#e0f2fe",
  },
};

export default function Soft3DBlock({
  title,
  subtitle,
  iconName,
  theme = "teal",
  index = 0,
  children,
  style,
  badgeText,
  onPress,
}: Soft3DBlockProps) {
  // Staggered entry assembly animation
  const entryFade = useRef(new Animated.Value(0)).current;
  const entryRise = useRef(new Animated.Value(20)).current;

  // Tactile press animation
  const pressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = Math.min(index * 70, 400);
    Animated.parallel([
      Animated.timing(entryFade, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(entryRise, {
        toValue: 0,
        duration: 450,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    onPress?.();
  };

  const themeConfig = THEME_STYLES[theme] || THEME_STYLES.teal;
  const DEPTH = 6; // 3D side wall height

  // Tactile press translates top face 3px down into colorful 3D housing with subtle scale
  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DEPTH - 3],
  });

  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.988],
  });

  return (
    <Animated.View
      style={[
        styles.entryWrapper,
        style,
        {
          opacity: entryFade,
          transform: [{ translateY: entryRise }],
        },
      ]}
    >
      <View style={[styles.blockContainer, { paddingBottom: DEPTH }]}>
        {/* Soft diffuse ambient shadow behind the block */}
        <View style={styles.shadowBase} />

        {/* 3D Side Wall Base (anchored strictly at bottom: 0, top: 40 so NO color is present at the top bezel) */}
        <View
          style={[
            styles.sideWall,
            {
              backgroundColor: themeConfig.side,
              top: 40,
            },
          ]}
        />

        {/* Interactive Top Face Container */}
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
          disabled={!onPress}
        >
          <Animated.View
            style={[
              styles.topFace,
              {
                backgroundColor: themeConfig.top,
                borderColor: themeConfig.side + "30",
                transform: [{ translateY }, { scale }],
              },
            ]}
          >
            {/* Upper edge subtle glossy highlight */}
            <View style={styles.glossHighlight} />

            {/* Block Header */}
            <View style={styles.headerRow}>
              {iconName && (
                <View style={[styles.iconWrapper, { backgroundColor: themeConfig.headerIconBg }]}>
                  <Ionicons name={iconName} size={20} color={themeConfig.side} />
                </View>
              )}

              <View style={styles.headerTextCol}>
                <Text style={[styles.blockTitle, { color: themeConfig.text }]}>{title}</Text>
                {subtitle && <Text style={styles.blockSubtitle}>{subtitle}</Text>}
              </View>

              {badgeText && (
                <View style={[styles.badge, { backgroundColor: themeConfig.side }]}>
                  <Text style={styles.badgeText}>{badgeText}</Text>
                </View>
              )}
            </View>

            {/* Block Body Content (Displayed directly now, no expand/collapse aspect) */}
            {children && <View style={styles.bodyContent}>{children}</View>}
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entryWrapper: {
    marginVertical: 8,
  },
  blockContainer: {
    position: "relative",
    width: "100%",
  },
  shadowBase: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
    borderRadius: 22,
    backgroundColor: "#000",
    opacity: 0.08,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  sideWall: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
  },
  pressable: {
    width: "100%",
  },
  topFace: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    overflow: "hidden",
    position: "relative",
  },
  glossHighlight: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  blockTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: 22,
  },
  blockSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#fff",
  },
  bodyContent: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.06)",
  },
});
