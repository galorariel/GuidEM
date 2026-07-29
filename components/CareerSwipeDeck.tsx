import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ToyNodeButton from "./guide/ToyNodeButton";
import { colors, fonts } from "../constants/theme";
import { useLanguage } from "../hooks/LanguageContext";
import { type Career } from "../services/catalog";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

type Props = {
  careers: Career[];
  savedCareerIds: string[];
  goalCareerId: string | null;
  userPersonalityType?: string | null;
  onToggleSave: (id: string) => void;
  onSetGoal: (id: string, title: string) => void;
  onPressCareer: (id: string) => void;
};

type HistoryItem = {
  career: Career;
  wasSaved: boolean;
};

// Helper: Calculate Holland code match percentage
function getMatchScore(userType: string | null | undefined, careerCodes: string[] | undefined): number | null {
  if (!userType || !careerCodes || careerCodes.length === 0) return null;

  const normalizedUser = userType.trim().toLowerCase();
  const userFirstChar = normalizedUser.charAt(0);

  // Check if primary code matches
  const matchIndex = careerCodes.findIndex((code) => {
    const norm = code.trim().toLowerCase();
    return norm === normalizedUser || norm.charAt(0) === userFirstChar;
  });

  if (matchIndex === 0) {
    // Top match: 88% - 96%
    return 88 + (normalizedUser.length % 9);
  } else if (matchIndex > 0) {
    // Secondary match: 72% - 84%
    return 72 + (normalizedUser.length % 13);
  } else {
    // Base potential match: 55% - 68%
    return 55 + (normalizedUser.length % 14);
  }
}

export default function CareerSwipeDeck({
  careers,
  savedCareerIds,
  goalCareerId,
  userPersonalityType,
  onToggleSave,
  onSetGoal,
  onPressCareer,
}: Props) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Animation values
  const pan = useRef(new Animated.ValueXY()).current;

  // Reset index when careers list changes completely
  useEffect(() => {
    setCurrentIndex(0);
    setHistory([]);
  }, [careers.length]);

  const currentCareer = careers[currentIndex];
  const nextCareer = careers[currentIndex + 1];
  const isGoal = currentCareer && goalCareerId === currentCareer.id;
  const isSaved = currentCareer && savedCareerIds.includes(currentCareer.id);

  // PanResponder gesture setup
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      useNativeDriver: false,
    }).start();
  };

  const swipeRight = () => {
    if (!currentCareer) return;
    Animated.timing(pan, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      // Save item if not saved already
      const alreadySaved = savedCareerIds.includes(currentCareer.id);
      if (!alreadySaved) {
        onToggleSave(currentCareer.id);
      }
      setHistory((prev) => [...prev, { career: currentCareer, wasSaved: !alreadySaved }]);
      pan.setValue({ x: 0, y: 0 });
      setCurrentIndex((prev) => prev + 1);
    });
  };

  const swipeLeft = () => {
    if (!currentCareer) return;
    Animated.timing(pan, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setHistory((prev) => [...prev, { career: currentCareer, wasSaved: false }]);
      pan.setValue({ x: 0, y: 0 });
      setCurrentIndex((prev) => prev + 1);
    });
  };

  const handleUndo = () => {
    if (history.length === 0 || currentIndex === 0) return;
    const lastItem = history[history.length - 1];
    
    // If we saved it on swipe right, revert the save
    if (lastItem.wasSaved && savedCareerIds.includes(lastItem.career.id)) {
      onToggleSave(lastItem.career.id);
    }

    setHistory((prev) => prev.slice(0, -1));
    setCurrentIndex((prev) => prev - 1);
    pan.setValue({ x: 0, y: 0 });
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setHistory([]);
    pan.setValue({ x: 0, y: 0 });
  };

  // Interpolated card rotation and opacity dynamics
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [10, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, -10],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const nextCardScale = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.95, 1],
    extrapolate: "clamp",
  });

  if (!currentCareer) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <Ionicons name="sparkles-outline" size={56} color={colors.accent} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>{t("swipe_no_more_cards")}</Text>
          <Pressable style={styles.restartBtn} onPress={handleRestart}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.restartBtnText}>{t("swipe_restart_deck")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const matchScore = getMatchScore(userPersonalityType, currentCareer.hollandCodes);

  return (
    <View style={styles.container}>
      {/* Deck Container */}
      <View style={styles.deckContainer}>
        {/* Next Card (Background stacked effect) */}
        {nextCareer && (
          <Animated.View
            style={[
              styles.card,
              styles.nextCard,
              { transform: [{ scale: nextCardScale }] },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{nextCareer.title}</Text>
            </View>
            <Text style={styles.cardDescription} numberOfLines={3}>{nextCareer.description}</Text>
          </Animated.View>
        )}

        {/* Top Active Card (Swipable) */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.card,
            {
              transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
            },
          ]}
        >
          {/* LIKE Badge Overlay */}
          <Animated.View style={[styles.badgeContainer, styles.likeBadge, { opacity: likeOpacity }]}>
            <Ionicons name="heart" size={20} color="#10b981" />
            <Text style={styles.likeText}>{t("career_card_save").toUpperCase()}</Text>
          </Animated.View>

          {/* NOPE Badge Overlay */}
          <Animated.View style={[styles.badgeContainer, styles.nopeBadge, { opacity: nopeOpacity }]}>
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={styles.nopeText}>SKIP</Text>
          </Animated.View>

          <Pressable style={{ flex: 1 }} onPress={() => onPressCareer(currentCareer.id)}>
            {/* Top Card Header */}
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardTitle}>{currentCareer.title}</Text>
                {currentCareer.demandLevel ? (
                  <View style={styles.demandBadge}>
                    <Ionicons name="trending-up" size={13} color={colors.accent} />
                    <Text style={styles.demandText}>{currentCareer.demandLevel}</Text>
                  </View>
                ) : null}
              </View>

              {/* Match Score Badge */}
              {matchScore !== null ? (
                <View style={styles.matchScoreBadge}>
                  <Text style={styles.matchScoreVal}>{matchScore}%</Text>
                  <Text style={styles.matchScoreLabel}>{t("swipe_match_score")}</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.quizPromptBadge}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push("/(tabs)/questionnaire");
                  }}
                >
                  <Ionicons name="sparkles" size={14} color={colors.accent} />
                  <Text style={styles.quizPromptText}>{t("swipe_take_quiz")}</Text>
                </Pressable>
              )}
            </View>

            {/* Description */}
            <Text style={styles.cardDescription} numberOfLines={4}>
              {currentCareer.description}
            </Text>

            {/* Career Stats Grid */}
            <View style={styles.statsGrid}>
              {currentCareer.salaryMin && currentCareer.salaryMax ? (
                <View style={styles.statBox}>
                  <Ionicons name="cash-outline" size={16} color={colors.accent} />
                  <Text style={styles.statValue}>
                    {currentCareer.salaryCurrency}{currentCareer.salaryMin.toLocaleString()} - {currentCareer.salaryCurrency}{currentCareer.salaryMax.toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>Salary</Text>
                </View>
              ) : null}

              {currentCareer.workEnvironment ? (
                <View style={styles.statBox}>
                  <Ionicons name="business-outline" size={16} color={colors.accent} />
                  <Text style={styles.statValue} numberOfLines={1}>
                    {currentCareer.workEnvironment}
                  </Text>
                  <Text style={styles.statLabel}>Environment</Text>
                </View>
              ) : null}
            </View>

            {/* Tags / Subjects */}
            {currentCareer.recommendedSubjects && currentCareer.recommendedSubjects.length > 0 && (
              <View style={styles.tagsRow}>
                {currentCareer.recommendedSubjects.slice(0, 3).map((sub, idx) => (
                  <View key={idx} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>🎓 {sub}</Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>

          {/* Bottom Action Controls Bar inside Card */}
          <View style={styles.controlsBar}>
            {/* Undo Button */}
            <Pressable
              onPress={handleUndo}
              disabled={history.length === 0}
              style={[styles.controlBtn, styles.undoBtn, history.length === 0 && styles.btnDisabled]}
            >
              <Ionicons name="arrow-undo" size={22} color={history.length > 0 ? "#f59e0b" : "#cbd5e1"} />
            </Pressable>

            {/* Pass / Skip (Left) Button */}
            <Pressable onPress={swipeLeft} style={[styles.controlBtn, styles.passBtn]}>
              <Ionicons name="close" size={28} color="#ef4444" />
            </Pressable>

            {/* ToyNodeButton Compass for Setting Goal */}
            <View style={styles.goalBtnWrapper}>
              <ToyNodeButton
                size={54}
                topColor={isGoal ? colors.button : "#e0f2fe"}
                sideColor={isGoal ? "#107c8f" : "#bae6fd"}
                iconName={isGoal ? "compass" : "compass-outline"}
                iconSize={26}
                onPress={() => onSetGoal(currentCareer.id, currentCareer.title)}
              />
            </View>

            {/* Save / Like (Right) Button */}
            <Pressable onPress={swipeRight} style={[styles.controlBtn, styles.likeControlBtn]}>
              <Ionicons name={isSaved ? "heart" : "heart-outline"} size={26} color="#10b981" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  deckContainer: {
    width: "100%",
    height: 480,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    width: "100%",
    height: 460,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    justifyContent: "space-between",
  },
  nextCard: {
    top: 12,
    opacity: 0.85,
    borderColor: "#cbd5e1",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.heading,
    lineHeight: 28,
  },
  demandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  demandText: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
  matchScoreBadge: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  matchScoreVal: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: "#ffffff",
  },
  matchScoreLabel: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    color: "rgba(255, 255, 255, 0.9)",
  },
  quizPromptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e0f2fe",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quizPromptText: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
  cardDescription: {
    fontSize: 14.5,
    fontFamily: fonts.body,
    color: colors.heading,
    lineHeight: 22,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statValue: {
    fontSize: 12.5,
    fontFamily: fonts.bodyBold,
    color: colors.heading,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10.5,
    fontFamily: fonts.body,
    color: colors.muted,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: "#ecf9fc",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipText: {
    fontSize: 11.5,
    fontFamily: fonts.body,
    color: colors.heading,
  },
  badgeContainer: {
    position: "absolute",
    top: 20,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
  },
  likeBadge: {
    right: 20,
    borderColor: "#10b981",
    backgroundColor: "rgba(236, 253, 245, 0.95)",
  },
  likeText: {
    fontSize: 14,
    fontFamily: fonts.heading,
    color: "#10b981",
  },
  nopeBadge: {
    left: 20,
    borderColor: "#ef4444",
    backgroundColor: "rgba(254, 242, 242, 0.95)",
  },
  nopeText: {
    fontSize: 14,
    fontFamily: fonts.heading,
    color: "#ef4444",
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  undoBtn: {
    backgroundColor: "#fffbeb",
    borderColor: "#fef3c7",
  },
  passBtn: {
    backgroundColor: "#fef2f2",
    borderColor: "#fee2e2",
  },
  likeControlBtn: {
    backgroundColor: "#ecfdf5",
    borderColor: "#d1fae5",
  },
  goalBtnWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.4,
  },
  emptyContainer: {
    width: "100%",
    height: 400,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.heading,
    textAlign: "center",
    marginBottom: 20,
  },
  restartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  restartBtnText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: "#ffffff",
  },
});
