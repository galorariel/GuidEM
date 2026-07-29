import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../constants/theme";
import { useTutorial } from "../hooks/TutorialContext";
import CustomButton from "./CustomButton";

export default function TutorialOverlay() {
  const { activeTutorial, dismissActiveTutorial } = useTutorial();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (activeTutorial) {
      // Zoom & Fade In
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
    }
  }, [activeTutorial]);

  if (!activeTutorial) return null;

  const handleDismiss = () => {
    // Zoom & Fade Out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissActiveTutorial();
    });
  };

  return (
    <Modal
      transparent
      visible={true}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          // Stop propagation so clicking inside the card doesn't dismiss it
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={activeTutorial.icon as any}
                size={40}
                color={colors.accent}
              />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{activeTutorial.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{activeTutorial.description}</Text>

          {/* Bullets */}
          {activeTutorial.bullets && activeTutorial.bullets.length > 0 && (
            <View style={styles.bulletsContainer}>
              {activeTutorial.bullets.map((bullet, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Ionicons
                    name="chevron-forward-circle"
                    size={18}
                    color={colors.button}
                    style={styles.bulletIcon}
                  />
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.footer}>
            <Pressable style={styles.skipButton} onPress={handleDismiss}>
              <Text style={styles.skipText}>Skip Tutorial</Text>
            </Pressable>
            
            <View style={styles.primaryBtnWrapper}>
              <CustomButton
                title={activeTutorial.primaryActionText}
                onPress={handleDismiss}
              />
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 24, 43, 0.7)", // Sleek dark blue tint overlay
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    // Premium soft shadows
    shadowColor: "#0A182B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 124, 143, 0.1)",
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(16, 124, 143, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.heading,
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  bulletsContainer: {
    width: "100%",
    marginBottom: 24,
    backgroundColor: "rgba(85, 197, 177, 0.04)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(85, 197, 177, 0.1)",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.heading,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    borderTopWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    paddingTop: 16,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  skipText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: "underline",
  },
  primaryBtnWrapper: {
    flex: 1,
    marginLeft: 16,
    minWidth: 120,
  },
});
