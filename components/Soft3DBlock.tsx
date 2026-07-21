import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../constants/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type BlockTheme = "blue" | "teal" | "purple" | "green" | "amber" | "card";

interface Soft3DBlockProps {
  title: string;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  theme?: BlockTheme;
  index?: number; // for staggered entry animation
  isExpandable?: boolean;
  defaultExpanded?: boolean;
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
    side: "#cbd5e1",
    tintBg: "#ffffff",
    text: colors.heading,
    headerIconBg: "#f1f5f9",
  },
  teal: {
    top: "#ffffff",
    side: "#0b5360",
    tintBg: "#f0fdfa",
    text: colors.heading,
    headerIconBg: "#ccfbf1",
  },
  purple: {
    top: "#ffffff",
    side: "#6d28d9",
    tintBg: "#faf5ff",
    text: colors.heading,
    headerIconBg: "#f3e8ff",
  },
  green: {
    top: "#ffffff",
    side: "#1b593e",
    tintBg: "#f0fdf4",
    text: colors.heading,
    headerIconBg: "#dcfce7",
  },
  amber: {
    top: "#ffffff",
    side: "#d97706",
    tintBg: "#fffbeb",
    text: colors.heading,
    headerIconBg: "#fef3c7",
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
  theme = "card",
  index = 0,
  isExpandable = false,
  defaultExpanded = false,
  children,
  style,
  badgeText,
  onPress,
}: Soft3DBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  // Entry assembly animation (fade-in + rise upward)
  const entryFade = useRef(new Animated.Value(0)).current;
  const entryRise = useRef(new Animated.Value(20)).current;

  // Tactile press animation
  const pressAnim = useRef(new Animated.Value(0)).current;

  // Chevron rotation animation (0 = pointing right, 1 = pointing down)
  const chevronAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  useEffect(() => {
    // Staggered assembly on mount
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

  const handleToggleExpand = () => {
    if (!isExpandable) {
      onPress?.();
      return;
    }
    const nextState = !expanded;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(nextState);

    Animated.timing(chevronAnim, {
      toValue: nextState ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    onPress?.();
  };

  const themeConfig = THEME_STYLES[theme];
  const DEPTH = 6; // 3D side wall height

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DEPTH, -1],
  });

  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.992],
  });

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
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
      <View style={[styles.outerContainer, { paddingBottom: DEPTH }]}>
        {/* Soft diffuse drop shadow */}
        <View style={styles.shadowBase} />

        {/* 3D Side Wall */}
        <View style={[styles.sideWall, { backgroundColor: themeConfig.side }]} />

        {/* Interactive Top Face */}
        <Pressable
          onPress={handleToggleExpand}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
        >
          <Animated.View
            style={[
              styles.topFace,
              {
                backgroundColor: themeConfig.top,
                borderColor: themeConfig.side + "35",
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

              {isExpandable && (
                <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                  <Ionicons name="chevron-forward" size={20} color={colors.accent} />
                </Animated.View>
              )}
            </View>

            {/* Block Body Content (visible directly or when expanded) */}
            {(!isExpandable || expanded) && children && (
              <View style={styles.bodyContent}>{children}</View>
            )}
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
  outerContainer: {
    position: "relative",
    width: "100%",
  },
  shadowBase: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    backgroundColor: "#000",
    opacity: 0.08,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  sideWall: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  pressable: {
    width: "100%",
  },
  topFace: {
    borderRadius: 22,
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
