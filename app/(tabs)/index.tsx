import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import GeneratingProgressBar from "../../components/GeneratingProgressBar";
import GuidePath from "../../components/guide/GuidePath";
import ToyNodeButton from "../../components/guide/ToyNodeButton";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { authErrorMessage } from "../../services/authErrors";
import {
  ensureFirstUnit,
  generateAndPersistChoices,
  getGuideUnits,
  markStepDone,
  submitChoice,
  type GuideUnitFull,
} from "../../services/guide";
import { clearCareerGoal, getProfile } from "../../services/supabase";
import {
  getLinkedChildren,
  getChildProgress,
  linkChild,
  unlinkChild,
  type LinkedChild,
  type ProgressSummary,
} from "../../services/parents";

const QUEST_CHARS = "QUESTIONNAIRE • QUESTIONNAIRE • ".split("");
const BROWSE_CHARS = "BROWSE • BROWSE • BROWSE • ".split("");

function Spinning3DButton({
  size,
  topColor,
  sideColor,
  iconName,
  iconSize,
  chars,
  radius,
  onPress,
  labelColor = "#107c8f",
  fontSize = 11,
}: {
  size: number;
  topColor: string;
  sideColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconSize: number;
  chars: string[];
  radius: number;
  onPress: () => void;
  labelColor?: string;
  fontSize?: number;
}) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rotateAnim.setValue(0);
    const anim = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const outerDim = (radius + 16) * 2;

  return (
    <View style={{ width: outerDim, height: outerDim, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: outerDim,
          height: outerDim,
          borderRadius: outerDim / 2,
          justifyContent: "center",
          alignItems: "center",
          transform: [{ rotate: spin }],
        }}
      >
        {chars.map((char, index) => {
          const angle = (index / chars.length) * 360;
          return (
            <View
              key={index}
              style={{
                position: "absolute",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotate: `${angle}deg` }, { translateY: -radius }],
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyBold,
                  fontSize: fontSize,
                  color: labelColor,
                  letterSpacing: 1,
                }}
              >
                {char}
              </Text>
            </View>
          );
        })}
      </Animated.View>

      <ToyNodeButton
        size={size}
        topColor={topColor}
        sideColor={sideColor}
        iconName={iconName}
        iconSize={iconSize}
        onPress={onPress}
      />
    </View>
  );
}

export default function Guide() {
  const { user } = useAuth();
  
  // Role & Shared loading states
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Student specific states
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [goalCareerId, setGoalCareerId] = useState<string | null>(null);
  const [specialization, setSpecialization] = useState<string | null>(null);
  const [careerPath, setCareerPath] = useState<string[]>([]);
  const [units, setUnits] = useState<GuideUnitFull[]>([]);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState(false);
  const [stepBusyId, setStepBusyId] = useState<string | null>(null);
  const [choiceBusyUnitId, setChoiceBusyUnitId] = useState<string | null>(null);
  const [choiceGenerating, setChoiceGenerating] = useState(false);
  const [journeyPaused, setJourneyPaused] = useState(false);

  // Parent specific states
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [childProgress, setChildProgress] = useState<Record<string, ProgressSummary[]>>({});
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [linkCodeInput, setLinkCodeInput] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  const name = (user?.user_metadata?.full_name as string) || "User";

  // ---- Student loader --------------------------------------------------------
  const loadGuide = useCallback(async (userId: string) => {
    setGuideLoading(true);
    setGuideError(false);
    try {
      // Check existing units first so we know if this is a fresh generation
      const existing = await getGuideUnits(userId);
      if (existing.length === 0) {
        setUnits([]);
      }
      
      await ensureFirstUnit(userId);
      const loaded = await getGuideUnits(userId);
      setUnits(loaded);

      // Detect if the journey was paused (last unit done, chosen option has no specialization)
      if (loaded.length > 0) {
        const last = loaded.reduce((a, b) => (b.unitIndex > a.unitIndex ? b : a));
        if (last.status === "done" && last.choice?.selectedOptionId) {
          const selectedOption = last.choice.options.find(
            (o) => o.id === last.choice!.selectedOptionId
          );
          if (selectedOption?.specializationLabel == null) {
            setJourneyPaused(true);
          } else {
            setJourneyPaused(false);
          }
        } else {
          setJourneyPaused(false);
        }
      }
    } catch (err: any) {
      console.warn("Guide load error:", err?.message ?? err);
      setGuideError(true);
    } finally {
      setGuideLoading(false);
    }
  }, []);

  // ---- Parent loader ---------------------------------------------------------
  const loadParentData = useCallback(async () => {
    try {
      const kids = await getLinkedChildren();
      setLinkedChildren(kids);
    } catch (err: any) {
      console.error("Failed to load linked children:", err);
    }
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const profile = await getProfile(user.id);
    const userRole = (profile?.role && profile.role.trim() !== '') ? profile.role.toLowerCase() : "student";
    setRole(userRole);

    if (userRole === "parent") {
      await loadParentData();
      setLoading(false);
    } else {
      const goal = profile?.career_goal ?? null;
      setGoalTitle(goal);
      setGoalCareerId(profile?.career ?? null);
      setSpecialization(profile?.career_specialization ?? null);
      setCareerPath(profile?.career_path ?? []);
      // Unblock top-level page loading so Student Dashboard renders immediately
      setLoading(false);

      if (goal) {
        await loadGuide(user.id);
      } else {
        setUnits([]);
        setJourneyPaused(false);
      }
    }
  }, [user, loadGuide, loadParentData]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // ---- Student handlers ------------------------------------------------------
  const handleClear = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await clearCareerGoal(user.id);
      await load();
    } catch (err: any) {
      Alert.alert("Couldn't clear goal", authErrorMessage(err, "Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const handleMarkStepDone = async (stepId: string, unit: GuideUnitFull) => {
    if (!user) return;
    setStepBusyId(stepId);
    try {
      await markStepDone(stepId);
      const updatedUnits = await getGuideUnits(user.id);
      setUnits(updatedUnits);

      const updatedUnit = updatedUnits.find((u) => u.id === unit.id);
      if (
        updatedUnit &&
        updatedUnit.steps.every((s) => s.completedAt != null) &&
        !updatedUnit.choice
      ) {
        setChoiceGenerating(true);
        try {
          await generateAndPersistChoices(user.id, updatedUnit);
          setUnits(await getGuideUnits(user.id));
        } catch (err: any) {
          Alert.alert("Couldn't generate choices", authErrorMessage(err, "Please try again."));
        } finally {
          setChoiceGenerating(false);
        }
      }
    } catch (err: any) {
      Alert.alert("Couldn't mark step done", authErrorMessage(err, "Please try again."));
    } finally {
      setStepBusyId(null);
    }
  };

  const handleSubmitChoice = async (unit: GuideUnitFull, optionId: string) => {
    if (!user) return;
    setChoiceBusyUnitId(unit.id);
    setGuideLoading(true);
    try {
      const nextUnit = await submitChoice(user.id, unit, optionId);
      if (nextUnit === null) {
        setJourneyPaused(true);
      }
      const profile = await getProfile(user.id);
      setSpecialization(profile?.career_specialization ?? null);
      setCareerPath(profile?.career_path ?? []);
      setUnits(await getGuideUnits(user.id));
    } catch (err: any) {
      Alert.alert("Couldn't submit choice", authErrorMessage(err, "Please try again."));
      setUnits(await getGuideUnits(user.id));
    } finally {
      setChoiceBusyUnitId(null);
      setGuideLoading(false);
    }
  };

  const handleGenerateChoices = async (unit: GuideUnitFull) => {
    if (!user) return;
    setChoiceGenerating(true);
    try {
      await generateAndPersistChoices(user.id, unit);
      setUnits(await getGuideUnits(user.id));
    } catch (err: any) {
      Alert.alert("Couldn't generate choices", authErrorMessage(err, "Please try again."));
    } finally {
      setChoiceGenerating(false);
    }
  };

  // ---- Parent handlers -------------------------------------------------------
  const handleLinkChild = async () => {
    if (!linkCodeInput.trim()) return;
    setLinkBusy(true);
    try {
      const res = await linkChild(linkCodeInput.trim());
      if (res.success) {
        Alert.alert("Student Linked!", `Successfully linked to ${res.childName}'s account.`);
        setLinkCodeInput("");
        await loadParentData();
      } else {
        Alert.alert("Linking failed", res.error || "Please verify the link code and try again.");
      }
    } catch (err: any) {
      Alert.alert("Error linking student", authErrorMessage(err, "Please check connection."));
    } finally {
      setLinkBusy(false);
    }
  };

  const handleUnlinkChild = (childId: string, name: string) => {
    Alert.alert(
      "Unlink Student?",
      `Are you sure you want to disconnect from ${name}'s progress summary monitoring?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            const success = await unlinkChild(childId);
            if (success) {
              await loadParentData();
              setExpandedChildId((curr) => (curr === childId ? null : curr));
            } else {
              Alert.alert("Error", "Could not remove child connection. Please try again.");
            }
          },
        },
      ]
    );
  };

  const toggleChildExpansion = async (childId: string) => {
    if (expandedChildId === childId) {
      setExpandedChildId(null);
      return;
    }

    setExpandedChildId(childId);
    
    // Fetch progress summaries if they are not already loaded
    if (!childProgress[childId]) {
      const progress = await getChildProgress(childId);
      setChildProgress((prev) => ({ ...prev, [childId]: progress }));
    }
  };

  // ---- Parent Dashboard UI Render --------------------------------------------
  const renderParentDashboard = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Hi {name},{"\n"}your parent dashboard</Text>

        {/* Link Child Input Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Link a Student</Text>
          <Text style={[styles.body, { marginBottom: 12 }]}>
            Enter the 6-character sharing code generated inside your child's profile screen to follow their progress.
          </Text>
          <View style={styles.linkRow}>
            <TextInput
              style={styles.codeTextInput}
              value={linkCodeInput}
              onChangeText={setLinkCodeInput}
              placeholder="E.g., A3X9T2"
              autoCapitalize="characters"
              maxLength={6}
              placeholderTextColor={colors.muted}
            />
            <Pressable
              onPress={handleLinkChild}
              disabled={linkBusy || !linkCodeInput.trim()}
              style={({ pressed }) => [
                styles.linkButton,
                pressed && styles.pressed,
                (!linkCodeInput.trim() || linkBusy) && styles.disabled,
              ]}
            >
              {linkBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.linkButtonText}>Link</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Linked Children list */}
        <Text style={[styles.sectionHeading, { marginTop: 10 }]}>Your Connected Students</Text>
        {linkedChildren.length === 0 ? (
          <View style={[styles.card, { alignItems: "center", paddingVertical: 32 }]}>
            <Ionicons name="people-outline" size={48} color={colors.muted} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No linked student accounts yet.</Text>
            <Text style={[styles.body, { textAlign: "center", fontSize: 13, marginTop: 4 }]}>
              Link your child's account above to view their career decisions.
            </Text>
          </View>
        ) : (
          linkedChildren.map((child) => {
            const isExpanded = expandedChildId === child.childId;
            const progressList = childProgress[child.childId] || [];

            return (
              <View key={child.childId} style={styles.childContainer}>
                {/* Child header card */}
                <Pressable
                  onPress={() => toggleChildExpansion(child.childId)}
                  style={({ pressed }) => [
                    styles.childHeaderCard,
                    isExpanded && styles.childHeaderCardExpanded,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.childAvatar}>
                    <Text style={styles.avatarText}>
                      {child.childName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.childNameText}>{child.childName}</Text>
                    <Text style={styles.childGoalText} numberOfLines={1}>
                      {child.careerGoal
                        ? `Goal: ${child.careerGoal}${child.currentSpecialization && child.currentSpecialization !== child.careerGoal ? ` (${child.currentSpecialization})` : ""}`
                        : "No goal selected yet"}
                    </Text>
                  </View>
                  <View style={styles.childHeaderActions}>
                    <Pressable
                      onPress={() => handleUnlinkChild(child.childId, child.childName)}
                      hitSlop={10}
                      style={styles.unlinkBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </Pressable>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.accent}
                    />
                  </View>
                </Pressable>

                {/* Expanded child progress history */}
                {isExpanded && (
                  <View style={styles.progressHistoryBody}>
                    <Text style={styles.timelineLabel}>Progression History</Text>
                    {progressList.length === 0 ? (
                      <Text style={styles.emptyProgressText}>
                        No milestones completed yet. As the student works through their learning unit steps, updates will appear here.
                      </Text>
                    ) : (
                      progressList.map((item, idx) => (
                        <View key={item.id} style={styles.timelineItem}>
                          {/* Left bullet marker */}
                          <View style={styles.timelineMarkerCol}>
                            <View
                              style={[
                                styles.timelineBullet,
                                {
                                  backgroundColor:
                                    item.kind === "milestone" ? colors.button : colors.accent,
                                },
                              ]}
                            />
                            {idx < progressList.length - 1 && <View style={styles.timelineLine} />}
                          </View>
                          {/* Right text box */}
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineDate}>
                              {new Date(item.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                            <Text style={styles.timelineTitle}>{item.title}</Text>
                            <Text style={styles.timelineBody}>{item.body}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  // ---- Main UI Render --------------------------------------------------------
  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : role === "parent" ? (
        renderParentDashboard()
      ) : (
        /* Student Dashboard */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.h1}>Hi {name},{"\n"}your career guide</Text>

          {goalTitle ? (
            <>
              {/* Goal + Specialization header */}
              <View style={styles.card}>
                <Text style={styles.label}>Your goal</Text>
                <Text style={styles.title}>{goalTitle}</Text>
                {specialization && specialization !== goalTitle ? (
                  <>
                    <Text style={styles.specHeader}>Current focus</Text>
                    <Text style={styles.specValue}>{specialization}</Text>
                  </>
                ) : null}
                {careerPath.length > 1 ? (
                  <Text style={styles.breadcrumb}>{careerPath.join(" → ")}</Text>
                ) : null}
                {goalCareerId ? (
                  <CustomButton
                    title="View career"
                    onPress={() => router.push(`/career?id=${goalCareerId}` as any)}
                  />
                ) : null}
                <CustomButton
                  title="Clear goal"
                  onPress={handleClear}
                  disabled={busy}
                  style={styles.clearBtn}
                />
              </View>

              {/* Journey paused state */}
              {journeyPaused && (
                <View style={styles.card}>
                  <Text style={styles.label}>🎓 Journey Complete</Text>
                  <Text style={styles.body}>
                    You've explored your path to {specialization ?? goalTitle} and paused your
                    journey. You can clear your goal to start a new path, or continue exploring your
                    career.
                  </Text>
                </View>
              )}

              {/* Guide path rendering */}
              {guideLoading && units.length === 0 ? (
                <GeneratingProgressBar label="Generating your learning path" />
              ) : guideError && units.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.title}>Generation temporarily unavailable</Text>
                  <Text style={styles.body}>
                    Our AI is a bit busy right now. Tap below to try again — it usually works on the
                    second attempt.
                  </Text>
                  <CustomButton
                    title="Retry"
                    onPress={() => user && loadGuide(user.id)}
                    style={{ marginTop: 12 }}
                  />
                </View>
              ) : (
                <View style={styles.pathWrapper}>
                  <GuidePath
                    units={units}
                    isChoiceGenerating={choiceGenerating}
                    choiceBusyUnitId={choiceBusyUnitId}
                    stepBusyId={stepBusyId}
                    onMarkStepDone={handleMarkStepDone}
                    onSubmitChoice={handleSubmitChoice}
                    onGenerateChoices={handleGenerateChoices}
                  />
                </View>
              )}
            </>
          ) : (
            /* No goal set — Main Event Card */
            <View style={styles.mainEventCard}>
              <Text style={styles.mainEventTitle}>Choose a career to start your guided path</Text>
              
              <View style={styles.buttonsColumn}>
                {/* Questionnaire 3D Button Section */}
                <View style={styles.buttonCol}>
                  <Text style={[styles.mainEventSubLabel, { marginBottom: 10 }]}>Take the questionnaire:</Text>
                  <Spinning3DButton
                    size={136}
                    topColor="#107c8f"
                    sideColor="#0b5360"
                    iconName="clipboard-outline"
                    iconSize={58}
                    chars={QUEST_CHARS}
                    radius={84}
                    fontSize={11.5}
                    labelColor="#107c8f"
                    onPress={() => router.push("/(tabs)/questionnaire" as any)}
                  />
                </View>

                {/* "or browse" middle label */}
                <Text style={[styles.mainEventSubLabel, { marginTop: 16, marginBottom: 16 }]}>or browse:</Text>

                {/* Browse Careers 3D Button Section */}
                <View style={styles.buttonCol}>
                  <Spinning3DButton
                    size={112}
                    topColor="#8b5cf6"
                    sideColor="#6d28d9"
                    iconName="compass-outline"
                    iconSize={48}
                    chars={BROWSE_CHARS}
                    radius={70}
                    fontSize={10.5}
                    labelColor="#8b5cf6"
                    onPress={() => router.push("/(tabs)/search" as any)}
                  />
                </View>

                {/* Bottom label */}
                <Text style={[styles.mainEventSubLabel, { marginTop: 12 }]}>to find what YOU like!</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 22,
    paddingTop: 70,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  h1: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.heading,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.heading,
    marginBottom: 6,
    flexShrink: 1,
  },
  body: {
    fontFamily: fonts.body,
    color: colors.heading,
    fontSize: 14,
    lineHeight: 20,
  },
  clearBtn: {
    backgroundColor: colors.muted,
    marginTop: 8,
  },
  specHeader: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    fontSize: 13,
    marginTop: 6,
  },
  specValue: {
    fontFamily: fonts.heading,
    color: colors.heading,
    fontSize: 17,
    marginBottom: 6,
  },
  breadcrumb: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 13,
    marginBottom: 10,
  },
  pathWrapper: {
    flex: 1,
    width: "100%",
    minHeight: 500,
  },
  ctaButton: {
    marginBottom: 10,
  },
  ctaButtonSecondary: {
    backgroundColor: colors.accent,
  },

  // ---- Parent Dashboard Styles ----------------------------------------------
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  codeTextInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.heading,
    backgroundColor: "#f8fafc",
  },
  linkButton: {
    width: 80,
    height: 48,
    backgroundColor: colors.button,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  linkButtonText: {
    fontFamily: fonts.bodyBold,
    color: "#fff",
    fontSize: 14,
  },
  sectionHeading: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.heading,
    marginBottom: 12,
  },
  childContainer: {
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  childHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
  },
  childHeaderCardExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#f8fafc",
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.accent,
  },
  childNameText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.heading,
    marginBottom: 2,
  },
  childGoalText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  childHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginLeft: 10,
  },
  unlinkBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  progressHistoryBody: {
    padding: 16,
    backgroundColor: "#fff",
  },
  timelineLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.accent,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  emptyProgressText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    textAlign: "center",
    paddingVertical: 12,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 64,
  },
  timelineMarkerCol: {
    alignItems: "center",
    marginRight: 12,
    width: 16,
  },
  timelineBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#e2e8f0",
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineDate: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
  },
  timelineTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.heading,
    marginBottom: 2,
  },
  timelineBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  emptyText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.heading,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  mainEventCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    alignItems: "center",
    marginTop: 8,
  },
  mainEventTitle: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.heading,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 20,
  },
  buttonsColumn: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  mainEventSubLabel: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.muted,
    textAlign: "center",
  },
});
