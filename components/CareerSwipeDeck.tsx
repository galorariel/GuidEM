import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  Easing,
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
const SWIPE_THRESHOLD = 0.22 * SCREEN_WIDTH;

type Props = {
  careers: Career[];
  savedCareerIds: string[];
  goalCareerId: string | null;
  userPersonalityType?: string | null;
  onToggleSave: (id: string) => void;
  onSetGoal: (id: string, title: string) => void;
  onPressCareer: (id: string) => void;
};

type SwipeDirection = "right" | "left";

type HistoryItem = {
  career: Career;
  wasSaved: boolean;
  direction: SwipeDirection;
};

// Helper: Calculate Holland code match percentage
function getMatchScore(userType: string | null | undefined, careerCodes: string[] | undefined): number | null {
  if (!userType || !careerCodes || careerCodes.length === 0) return null;

  const normalizedUser = userType.trim().toLowerCase();
  const userFirstChar = normalizedUser.charAt(0);

  const matchIndex = careerCodes.findIndex((code) => {
    const norm = code.trim().toLowerCase();
    return norm === normalizedUser || norm.charAt(0) === userFirstChar;
  });

  if (matchIndex === 0) {
    return 88 + (normalizedUser.length % 9);
  } else if (matchIndex > 0) {
    return 72 + (normalizedUser.length % 13);
  } else {
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
  
  // Local deck state to manage seamless card slicing & undo fly-in without pop-in glitches
  const [deck, setDeck] = useState<Career[]>(careers);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Sync deck when careers list prop changes significantly
  useEffect(() => {
    setDeck(careers);
    setHistory([]);
  }, [careers]);

  // Active top card position
  const pan = useRef(new Animated.ValueXY()).current;

  // Subtle Idle Floating animation for active top card
  const idleAnim = useRef(new Animated.Value(0)).current;
  const idleLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    idleLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(idleAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(idleAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    idleLoopRef.current.start();
    return () => idleLoopRef.current?.stop();
  }, [idleAnim]);

  const currentCareer = deck[0];
  const nextCareer = deck[1];
  const thirdCareer = deck[2];
  const isGoal = currentCareer && goalCareerId === currentCareer.id;

  // PanResponder gesture setup for active top card
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        idleLoopRef.current?.stop();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        idleLoopRef.current?.start();

        if (gestureState.dx > SWIPE_THRESHOLD) {
          swipe("right");
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          swipe("left");
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

  const swipe = (direction: SwipeDirection) => {
    if (!currentCareer) return;

    const targetX = direction === "right" ? SCREEN_WIDTH * 1.4 : -SCREEN_WIDTH * 1.4;

    Animated.timing(pan, {
      toValue: { x: targetX, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      let newlySaved = false;

      if (direction === "right") {
        const alreadySaved = savedCareerIds.includes(currentCareer.id);
        if (!alreadySaved) {
          onToggleSave(currentCareer.id);
          newlySaved = true;
        }
      }

      setHistory((prev) => [
        ...prev,
        { career: currentCareer, wasSaved: newlySaved, direction },
      ]);

      // Remove top card from deck state, then reset pan coordinates for the next card
      setDeck((prev) => prev.slice(1));
      pan.setValue({ x: 0, y: 0 });
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const lastItem = history[history.length - 1];

    // If it was saved during swipe right, revert the save
    if (lastItem.wasSaved && savedCareerIds.includes(lastItem.career.id)) {
      onToggleSave(lastItem.career.id);
    }

    // Pop history item
    setHistory((prev) => prev.slice(0, -1));

    // Pre-position top card off-screen on the side it left from (right or left)
    const initialOffscreenX = lastItem.direction === "right" ? SCREEN_WIDTH * 1.3 : -SCREEN_WIDTH * 1.3;
    pan.setValue({ x: initialOffscreenX, y: 0 });

    // Prepend career back to top of deck
    setDeck((prev) => [lastItem.career, ...prev]);

    // Animate top card sliding BACK IN smoothly to center
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 7,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  const handleRestart = () => {
    setDeck(careers);
    setHistory([]);
    pan.setValue({ x: 0, y: 0 });
  };

  // Top Active Card Rotations & Badges
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });

  const idleOffsetY = idleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
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

  // Physical Card Stack Depth Mechanics (Cards 2 & 3 peek out with distinct rotation angles & offsets)
  const card2Rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["0deg", "-3deg", "0deg"],
    extrapolate: "clamp",
  });

  const card2Scale = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.95, 1],
    extrapolate: "clamp",
  });

  const card2TranslateY = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [-14, 0, -14],
    extrapolate: "clamp",
  });

  const card3Rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-3deg", "3.5deg", "-3deg"],
    extrapolate: "clamp",
  });

  const card3Scale = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [0.95, 0.90, 0.95],
    extrapolate: "clamp",
  });

  const card3TranslateY = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [-14, 0, -14],
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

  // Preloaded Card Inner Content Renderer
  const renderCardInnerContent = (careerItem: Career, isTopCard: boolean) => {
    const itemMatch = getMatchScore(userPersonalityType, careerItem.hollandCodes);
    return (
      <Pressable
        style={{ flex: 1 }}
        onPress={() => isTopCard && onPressCareer(careerItem.id)}
        pointerEvents={isTopCard ? "auto" : "none"}
      >
        {/* Card Header */}
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.cardTitle}>{careerItem.title}</Text>
            {careerItem.demandLevel ? (
              <View style={styles.demandBadge}>
                <Ionicons name="trending-up" size={13} color={colors.accent} />
                <Text style={styles.demandText}>{careerItem.demandLevel}</Text>
              </View>
            ) : null}
          </View>

          {/* Match Score Badge */}
          {itemMatch !== null ? (
            <View style={styles.matchScoreBadge}>
              <Text style={styles.matchScoreVal}>{itemMatch}%</Text>
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
          {careerItem.description}
        </Text>

        {/* Career Stats Grid */}
        <View style={styles.statsGrid}>
          {careerItem.salaryMin && careerItem.salaryMax ? (
            <View style={styles.statBox}>
              <Ionicons name="cash-outline" size={16} color={colors.accent} />
              <Text style={styles.statValue}>
                {careerItem.salaryCurrency}{careerItem.salaryMin.toLocaleString()} - {careerItem.salaryCurrency}{careerItem.salaryMax.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Salary</Text>
            </View>
          ) : null}

          {careerItem.workEnvironment ? (
            <View style={styles.statBox}>
              <Ionicons name="business-outline" size={16} color={colors.accent} />
              <Text style={styles.statValue} numberOfLines={1}>
                {careerItem.workEnvironment}
              </Text>
              <Text style={styles.statLabel}>Environment</Text>
            </View>
          ) : null}
        </View>

        {/* Tags / Subjects */}
        {careerItem.recommendedSubjects && careerItem.recommendedSubjects.length > 0 && (
          <View style={styles.tagsRow}>
            {careerItem.recommendedSubjects.slice(0, 3).map((sub, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagChipText}>🎓 {sub}</Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Outer Card Deck Container with Height Padding for Stack */}
      <View style={styles.deckContainer}>
        {/* Card 3 (Bottom Card in Stack - Peeked right with +3.5deg angle) */}
        {thirdCareer && (
          <Animated.View
            key={`card3_${thirdCareer.id}`}
            style={[
              styles.card,
              styles.thirdCard,
              {
                transform: [
                  { translateY: card3TranslateY },
                  { scale: card3Scale },
                  { rotate: card3Rotate },
                ],
              },
            ]}
          >
            {renderCardInnerContent(thirdCareer, false)}
          </Animated.View>
        )}

        {/* Card 2 (Middle Card in Stack - Peeked left with -3deg angle) */}
        {nextCareer && (
          <Animated.View
            key={`card2_${nextCareer.id}`}
            style={[
              styles.card,
              styles.nextCard,
              {
                transform: [
                  { translateY: card2TranslateY },
                  { scale: card2Scale },
                  { rotate: card2Rotate },
                ],
              },
            ]}
          >
            {renderCardInnerContent(nextCareer, false)}
          </Animated.View>
        )}

        {/* Active Card 1 (Top Active Card with Gesture Physics & Idle Float) */}
        <Animated.View
          key={`card1_${currentCareer.id}`}
          {...panResponder.panHandlers}
          style={[
            styles.card,
            styles.topCard,
            {
              transform: [
                { translateX: pan.x },
                { translateY: Animated.add(pan.y, idleOffsetY) },
                { rotate },
              ],
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

          {/* Full Card Content */}
          {renderCardInnerContent(currentCareer, true)}

          {/* Controls Bar: Yellow 3D ToyNodeButton for Undo + Compass 3D ToyNodeButton for Goal */}
          <View style={styles.controlsBar}>
            {/* 3D ToyNode Undo Button in Vibrant Yellow (#f59e0b / #d97706) */}
            <View style={styles.btnWrapper}>
              <ToyNodeButton
                size={54}
                topColor={history.length > 0 ? "#f59e0b" : "#e2e8f0"}
                sideColor={history.length > 0 ? "#d97706" : "#cbd5e1"}
                iconName="arrow-undo"
                iconSize={24}
                iconColor="#ffffff"
                disabled={history.length === 0}
                onPress={handleUndo}
              />
            </View>

            {/* 3D ToyNode Compass Goal Button (Exact Catalog Palette: #55C5B1 / #107c8f) */}
            <View style={styles.btnWrapper}>
              <ToyNodeButton
                size={54}
                topColor={isGoal ? "#55C5B1" : "#107c8f"}
                sideColor={isGoal ? "#389e8d" : "#0b5360"}
                iconName={isGoal ? "compass" : "compass-outline"}
                iconSize={26}
                onPress={() => onSetGoal(currentCareer.id, currentCareer.title)}
              />
            </View>
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
    height: 495,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 10,
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
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 6,
    justifyContent: "space-between",
  },
  topCard: {
    top: 0,
    zIndex: 3,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
  },
  nextCard: {
    top: 14,
    zIndex: 2,
    backgroundColor: "#fcfdfe",
    borderColor: "#cbd5e1",
    shadowOpacity: 0.05,
    elevation: 4,
  },
  thirdCard: {
    top: 26,
    zIndex: 1,
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    shadowOpacity: 0.03,
    elevation: 2,
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
    justifyContent: "center",
    gap: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  btnWrapper: {
    alignItems: "center",
    justifyContent: "center",
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
