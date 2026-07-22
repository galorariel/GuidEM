import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../constants/theme";
import CustomButton from "../CustomButton";
import type { GuideStep, GuideUnitFull } from "../../services/guide";
import type { ChoiceOption } from "../../services/guide/generator";

import ToyNodeButton from "./ToyNodeButton";

const { height: WINDOW_HEIGHT } = Dimensions.get("window");

const CIRCULAR_TEXT = "MARK AS DONE • MARK AS DONE • ";
const CIRCULAR_CHARS = CIRCULAR_TEXT.split("");
const RADIUS = 46;

interface StepDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  // If rendering a step:
  step?: GuideStep | null;
  unitOfStep?: GuideUnitFull | null;
  isStepBusy?: boolean;
  onMarkDone?: () => void;
  // If rendering a completed unit:
  completedUnit?: GuideUnitFull | null;
  decisionText?: string | null;
  // If rendering an active choice option:
  choiceOption?: ChoiceOption | null;
  onChooseOption?: () => void;
  isChoiceBusy?: boolean;
}

export default function StepDetailSheet({
  visible,
  onClose,
  step,
  unitOfStep,
  isStepBusy = false,
  onMarkDone,
  completedUnit,
  decisionText,
  choiceOption,
  onChooseOption,
  isChoiceBusy = false,
}: StepDetailSheetProps) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(400);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      // Infinite rotation for the orbital text ring
      rotateAnim.setValue(0);
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Infinite pulsing animation for the COMPLETED badge
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open URL:", err)
    );
  };

  const renderInnerContent = () => {
    if (completedUnit) {
      // Milestone unit details
      return (
        <>
          <View style={styles.header}>
            <View style={styles.titleWrapper}>
              <View style={[styles.kindBadge, { backgroundColor: colors.button }]}>
                <Ionicons name="ribbon" size={12} color="#fff" />
                <Text style={styles.kindText}>Milestone</Text>
              </View>
              <Text style={styles.sheetTitle}>{completedUnit.title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.heading} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Unit Summary</Text>
            <Text style={styles.bodyText}>{completedUnit.summary}</Text>

            {completedUnit.journeySummary && (
              <>
                <Text style={styles.sectionTitle}>Journey Progress</Text>
                <Text style={styles.bodyText}>{completedUnit.journeySummary}</Text>
              </>
            )}

            {decisionText && (
              <View style={styles.decisionCard}>
                <Ionicons name="git-branch" size={20} color={colors.button} style={styles.decisionIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.decisionTitle}>Your Career Specialization Decision</Text>
                  <Text style={styles.decisionValue}>{decisionText}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <CustomButton title="Close Summary" onPress={onClose} style={styles.actionBtn} />
        </>
      );
    }

    if (choiceOption) {
      // Choice option details
      const isPause = choiceOption.specializationLabel == null;
      return (
        <>
          <View style={styles.header}>
            <View style={styles.titleWrapper}>
              <View style={[styles.kindBadge, isPause && { backgroundColor: colors.button }]}>
                <Ionicons
                  name={isPause ? "stop-circle" : "git-network"}
                  size={12}
                  color="#fff"
                />
                <Text style={styles.kindText}>
                  {isPause ? "Pause Path" : "Career Branch"}
                </Text>
              </View>
              <Text style={styles.sheetTitle}>{choiceOption.label}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.heading} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.bodyText}>{choiceOption.description}</Text>

            {choiceOption.specializationLabel && (
              <View style={styles.decisionCard}>
                <Ionicons name="git-branch" size={20} color={colors.accent} style={styles.decisionIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.decisionTitle, { color: colors.accent }]}>Career Focus Specialization</Text>
                  <Text style={styles.decisionValue}>{choiceOption.specializationLabel}</Text>
                </View>
              </View>
            )}

            {isPause && (
              <View style={[styles.decisionCard, { borderColor: colors.button + "40" }]}>
                <Ionicons name="ribbon" size={20} color={colors.button} style={styles.decisionIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.decisionTitle}>Complete Learning & Generate Roadmap</Text>
                  <Text style={styles.decisionValue}>Review your achievements so far</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {onChooseOption && (
              <CustomButton
                title={isChoiceBusy ? "Choosing..." : "Choose this Path"}
                onPress={onChooseOption}
                disabled={isChoiceBusy}
                style={isPause ? styles.completedBtn : styles.actionBtn}
              />
            )}
          </View>
        </>
      );
    }

    if (step) {
      // Step details
      const isCompleted = step.completedAt != null;
      const payload = (step.payload || {}) as Record<string, any>;
      const hasLink = !!payload.externalUrl;

      return (
        <>
          <View style={styles.header}>
            <View style={styles.titleWrapper}>
              <View style={[styles.kindBadge, isCompleted && { backgroundColor: colors.button }]}>
                <Ionicons
                  name={isCompleted ? "checkmark-circle" : "arrow-forward-circle"}
                  size={12}
                  color="#fff"
                />
                <Text style={styles.kindText}>
                  {isCompleted ? "Completed" : step.kind}
                </Text>
              </View>
              <Text style={styles.sheetTitle}>{step.title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.heading} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.bodyText}>{step.body}</Text>

            {hasLink && (
              <Pressable
                onPress={() => openLink(payload.externalUrl)}
                style={styles.linkCard}
              >
                <View style={styles.linkIconWrapper}>
                  <Ionicons name="open-outline" size={24} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkLabel} numberOfLines={1}>
                    {payload.linkLabel || "Open Resource"}
                  </Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>
                    {payload.externalUrl}
                  </Text>
                </View>
              </Pressable>
            )}
          </ScrollView>

          <View style={styles.doneFooterContainer}>
            {isCompleted ? (
              <Animated.View style={[styles.completedBadge, { transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name="checkmark-circle" size={22} color="#55C5B1" style={{ marginRight: 6 }} />
                <Text style={styles.completedBadgeText}>COMPLETED</Text>
              </Animated.View>
            ) : (
              <>
                {onMarkDone && (
                  <View style={styles.toyButtonWrapper}>
                    {/* Rotating Circular Wrapped Text Ring */}
                    <Animated.View style={[styles.orbitalRing, { transform: [{ rotate: spin }] }]}>
                      {CIRCULAR_CHARS.map((char, index) => {
                        const angle = (index / CIRCULAR_CHARS.length) * 360;
                        return (
                          <View
                            key={index}
                            style={[
                              styles.charWrapper,
                              {
                                transform: [
                                  { rotate: `${angle}deg` },
                                  { translateY: -RADIUS },
                                ],
                              },
                            ]}
                          >
                            <Text style={styles.orbitalChar}>{char}</Text>
                          </View>
                        );
                      })}
                    </Animated.View>

                    {/* 3D Molded Plastic Toy Checkmark Button */}
                    <ToyNodeButton
                      size={64}
                      topColor="#55C5B1"
                      sideColor="#389e8d"
                      iconName="checkmark"
                      iconSize={32}
                      isLoading={isStepBusy}
                      onPress={onMarkDone}
                    />
                  </View>
                )}
              </>
            )}
          </View>
        </>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheetContent,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {renderInnerContent()}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContent: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: WINDOW_HEIGHT * 0.85,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  titleWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  kindBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  kindText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: "#fff",
    marginLeft: 4,
    textTransform: "uppercase",
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.heading,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollBody: {
    marginBottom: 20,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.heading,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.accent,
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 10,
  },
  linkIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  linkLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.heading,
    marginBottom: 2,
  },
  linkUrl: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.accent,
  },
  decisionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0faf4",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.button + "40",
    marginTop: 16,
  },
  decisionIcon: {
    marginRight: 12,
  },
  decisionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.button,
    marginBottom: 2,
  },
  decisionValue: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.heading,
  },
  footer: {
    marginTop: 8,
  },
  actionBtn: {
    marginTop: 4,
  },
  completedBtn: {
    backgroundColor: colors.button,
    opacity: 0.9,
  },
  doneFooterContainer: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 110,
  },
  toyButtonWrapper: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  orbitalRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  charWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  orbitalChar: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: "#55C5B1",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8f5e9",
    borderWidth: 2,
    borderColor: "#55C5B1",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: "#55C5B1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completedBadgeText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: "#55C5B1",
    letterSpacing: 1,
  },
});
