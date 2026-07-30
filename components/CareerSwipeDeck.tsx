import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

type Particle = {
  id: string;
  type: "heart" | "cross";
  topPct: number;
  scale: number;
  rotationDeg: string;
  driftX: number;
  driftY: number;
  anim: Animated.Value;
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

  // Dense particle bubble emitter state
  const [particles, setParticles] = useState<Particle[]>([]);
  const lastSpawnTime = useRef(0);

  // Ref map to store individual Animated.ValueXY for each card ID to eliminate pop-in glitches
  const pansRef = useRef<Record<string, Animated.ValueXY>>({});
  const getPanForCard = (id: string) => {
    if (!pansRef.current[id]) {
      pansRef.current[id] = new Animated.ValueXY();
    }
    return pansRef.current[id];
  };

  const careersKey = careers.map((c) => c.id).join(",");

  // Reset index when careers list changes completely (e.g. search query changes)
  useEffect(() => {
    setDeck(careers);
    setHistory([]);
    pansRef.current = {};
    setParticles([]);
  }, [careersKey]);

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

  // Active top card position
  const activePan = currentCareer ? getPanForCard(currentCareer.id) : new Animated.ValueXY();

  // Fresh refs to eliminate PanResponder stale closures completely
  const activePanRef = useRef(activePan);
  activePanRef.current = activePan;

  const currentCareerRef = useRef(currentCareer);
  currentCareerRef.current = currentCareer;

  const savedCareerIdsRef = useRef(savedCareerIds);
  savedCareerIdsRef.current = savedCareerIds;

  const onToggleSaveRef = useRef(onToggleSave);
  onToggleSaveRef.current = onToggleSave;

  // Dense particle spawner logic emitting directly from the true screen edge towards the center card
  const spawnParticlesBatch = (type: "heart" | "cross", count: number = 2) => {
    const newBatch: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const id = Math.random().toString(36).substring(2, 9);
      const topPct = 2 + Math.random() * 92; // Full height distribution from top to bottom
      const scale = 0.55 + Math.random() * 0.7; // Rich size variation
      const rotationDeg = `${Math.floor(Math.random() * 34 - 17)}deg`;
      const driftX = 35 + Math.random() * 35; // Drift inward towards card
      const driftY = 25 + Math.random() * 35; // Drift upward like floating bubbles
      const anim = new Animated.Value(0);

      const particle: Particle = {
        id,
        type,
        topPct,
        scale,
        rotationDeg,
        driftX,
        driftY,
        anim,
      };

      newBatch.push(particle);

      Animated.timing(anim, {
        toValue: 1,
        duration: 600 + Math.random() * 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      });
    }

    setParticles((prev) => [...prev.slice(-35), ...newBatch]); // high capacity for dense bubble streams
  };

  const resetPosition = () => {
    const targetPan = activePanRef.current;
    Animated.spring(targetPan, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      useNativeDriver: false,
    }).start();
  };

  const swipe = (direction: SwipeDirection) => {
    const targetCareer = currentCareerRef.current;
    const targetPan = activePanRef.current;
    if (!targetCareer) return;

    // Trigger directional haptic feedback
    if (direction === "right") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    const targetX = direction === "right" ? SCREEN_WIDTH * 1.4 : -SCREEN_WIDTH * 1.4;

    Animated.timing(targetPan, {
      toValue: { x: targetX, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      let newlySaved = false;

      if (direction === "right") {
        const alreadySaved = savedCareerIdsRef.current.includes(targetCareer.id);
        if (!alreadySaved) {
          onToggleSaveRef.current(targetCareer.id);
          newlySaved = true;
        }
      }

      setHistory((prev) => [
        ...prev,
        { career: targetCareer, wasSaved: newlySaved, direction },
      ]);

      // Remove top card from deck state
      setDeck((prev) => prev.slice(1));
    });
  };

  // PanResponder gesture setup for active top card
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        idleLoopRef.current?.stop();
      },
      onPanResponderMove: (e, gestureState) => {
        activePanRef.current.setValue({ x: gestureState.dx, y: gestureState.dy });

        // Continuous high-density bubble emission during drag
        const now = Date.now();
        const absX = Math.abs(gestureState.dx);
        const progress = Math.min(1, absX / SWIPE_THRESHOLD);

        if (progress > 0.08 && now - lastSpawnTime.current > Math.max(30, 110 - progress * 80)) {
          lastSpawnTime.current = now;
          const batchCount = progress > 0.5 ? 3 : 2;
          spawnParticlesBatch(gestureState.dx > 0 ? "heart" : "cross", batchCount);
        }
      },
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

  const handleUndo = () => {
    if (history.length === 0) return;

    // Trigger heavy undo tactile haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    const lastItem = history[history.length - 1];

    // If it was saved during swipe right, revert the save
    if (lastItem.wasSaved && savedCareerIds.includes(lastItem.career.id)) {
      onToggleSave(lastItem.career.id);
    }

    // Pop history item
    setHistory((prev) => prev.slice(0, -1));

    // Get the dedicated pan value for the returning card and position it off-screen
    const returningPan = getPanForCard(lastItem.career.id);
    const initialOffscreenX = lastItem.direction === "right" ? SCREEN_WIDTH * 1.3 : -SCREEN_WIDTH * 1.3;
    returningPan.setValue({ x: initialOffscreenX, y: 0 });

    // Prepend career back to top of deck state
    setDeck((prev) => [lastItem.career, ...prev]);

    // Animate returning card sliding back to center
    Animated.spring(returningPan, {
      toValue: { x: 0, y: 0 },
      friction: 7,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  const handleRestart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setDeck(careers);
    setHistory([]);
    pansRef.current = {};
    setParticles([]);
  };

  // Top Active Card Rotations & Badges based on its dedicated activePan value
  const rotate = activePan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });

  const idleOffsetY = idleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const likeOpacity = activePan.x.interpolate({
    inputRange: [10, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = activePan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, -10],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Stack Depth Physical Card Pile Mechanics (Cards 2 & 3 peek out with distinct rotation angles & offsets)
  const card2Rotate = activePan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["0deg", "-3deg", "0deg"],
    extrapolate: "clamp",
  });

  const card2Scale = activePan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.95, 1],
    extrapolate: "clamp",
  });

  const card2TranslateY = activePan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [-14, 0, -14],
    extrapolate: "clamp",
  });

  const card3Rotate = activePan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-3deg", "3.5deg", "-3deg"],
    extrapolate: "clamp",
  });

  const card3Scale = activePan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [0.95, 0.90, 0.95],
    extrapolate: "clamp",
  });

  const card3TranslateY = activePan.x.interpolate({
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

  // Preloaded Card Inner Content Renderer (Includes preloaded controlsBar for zero button pop-in!)
  const renderCardInnerContent = (careerItem: Career, isTopCard: boolean) => {
    const itemMatch = getMatchScore(userPersonalityType, careerItem.hollandCodes);
    const itemIsGoal = goalCareerId === careerItem.id;

    return (
      <View style={{ flex: 1, justifyContent: "space-between" }}>
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

        {/* Fully Preloaded Controls Bar on ALL cards (eliminates 3D button pop-in!) */}
        <View style={styles.controlsBar} pointerEvents={isTopCard ? "auto" : "none"}>
          {/* 3D ToyNode Undo Button in Vibrant Yellow (#f59e0b / #d97706) */}
          <View style={styles.btnWrapper}>
            <ToyNodeButton
              size={54}
              topColor={history.length > 0 ? "#f59e0b" : "#e2e8f0"}
              sideColor={history.length > 0 ? "#d97706" : "#cbd5e1"}
              iconName="arrow-undo"
              iconSize={24}
              iconColor="#ffffff"
              disabled={!isTopCard || history.length === 0}
              onPress={handleUndo}
            />
          </View>

          {/* 3D ToyNode Compass Goal Button (Exact Catalog Palette: #55C5B1 / #107c8f) */}
          <View style={styles.btnWrapper}>
            <ToyNodeButton
              size={54}
              topColor={itemIsGoal ? "#55C5B1" : "#107c8f"}
              sideColor={itemIsGoal ? "#389e8d" : "#0b5360"}
              iconName={itemIsGoal ? "compass" : "compass-outline"}
              iconSize={26}
              disabled={!isTopCard}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                onSetGoal(careerItem.id, careerItem.title);
              }}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HIGH-DENSITY PARTICLE BUBBLE EMITTER LAYER (Emitting directly from screen edges INWARD towards card) */}
      <View style={styles.particleContainer} pointerEvents="none">
        {particles.map((p) => {
          const isRight = p.type === "heart";

          // Drift inward towards center card (negative X for right edge, positive X for left edge)
          const translateX = p.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, isRight ? -p.driftX : p.driftX],
          });

          // Drift upward like floating bubbles
          const translateY = p.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -p.driftY],
          });

          const particleScale = p.anim.interpolate({
            inputRange: [0, 0.25, 0.7, 1],
            outputRange: [0.3, p.scale * 1.3, p.scale, 0.4],
          });

          const opacity = p.anim.interpolate({
            inputRange: [0, 0.15, 0.65, 1],
            outputRange: [0, 0.95, 0.85, 0],
          });

          return (
            <Animated.View
              key={p.id}
              style={[
                styles.particleBase,
                isRight ? { right: -18 } : { left: -18 },
                {
                  top: `${p.topPct}%`,
                  opacity,
                  transform: [
                    { translateX },
                    { translateY },
                    { scale: particleScale },
                    { rotate: p.rotationDeg },
                  ],
                },
              ]}
            >
              <Ionicons
                name={isRight ? "heart" : "close"}
                size={18}
                color={isRight ? "#10b981" : "#ef4444"}
              />
            </Animated.View>
          );
        })}
      </View>

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

        {/* Active Card 1 (Top Active Card with Gesture Physics & Idle Float, Keyed by currentCareer.id) */}
        <Animated.View
          key={`card1_${currentCareer.id}`}
          {...panResponder.panHandlers}
          style={[
            styles.card,
            styles.topCard,
            {
              transform: [
                { translateX: activePan.x },
                { translateY: Animated.add(activePan.y, idleOffsetY) },
                { rotate },
              ],
            },
          ]}
        >
          {/* LIKE Badge Overlay (Placed in TOP-LEFT corner for Right Swipes) */}
          <Animated.View style={[styles.badgeContainer, styles.likeBadge, { opacity: likeOpacity }]}>
            <Ionicons name="heart" size={20} color="#10b981" />
            <Text style={styles.likeText}>{t("career_card_save").toUpperCase()}</Text>
          </Animated.View>

          {/* NOPE Badge Overlay (Placed in TOP-RIGHT corner for Left Swipes) */}
          <Animated.View style={[styles.badgeContainer, styles.nopeBadge, { opacity: nopeOpacity }]}>
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={styles.nopeText}>SKIP</Text>
          </Animated.View>

          {/* Full Card Content */}
          {renderCardInnerContent(currentCareer, true)}
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
    left: 20, // Swiping Right (Save) -> Badge appears on TOP-LEFT corner (trailing side)
    borderColor: "#10b981",
    backgroundColor: "rgba(236, 253, 245, 0.95)",
  },
  likeText: {
    fontSize: 14,
    fontFamily: fonts.heading,
    color: "#10b981",
  },
  nopeBadge: {
    right: 20, // Swiping Left (Skip) -> Badge appears on TOP-RIGHT corner (trailing side)
    borderColor: "#ef4444",
    backgroundColor: "rgba(254, 242, 242, 0.95)",
  },
  nopeText: {
    fontSize: 14,
    fontFamily: fonts.heading,
    color: "#ef4444",
  },
  particleContainer: {
    position: "absolute",
    top: -120,
    bottom: -120,
    left: -22,
    right: -22,
    zIndex: 88,
  },
  particleBase: {
    position: "absolute",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
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
