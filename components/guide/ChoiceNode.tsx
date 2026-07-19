import React from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Line } from "react-native-svg";
import { colors, fonts } from "../../constants/theme";
import type { GuideChoice } from "../../services/guide";
import type { ChoiceOption } from "../../services/guide/generator";

interface ChoiceNodeProps {
  x: number; // center X of the path
  y: number; // top Y of the choice section
  choice: GuideChoice | null;
  state: "locked" | "generating" | "pending";
  isBusy: boolean;
  onPressOption: (option: ChoiceOption) => void;
  onGenerateChoices: () => void;
}

const MAIN_NODE_SIZE = 64;
const BRANCH_NODE_SIZE = 50;
const BRANCH_OFFSET_Y = 90; // vertical distance from main node to branch options

export default function ChoiceNode({
  x,
  y,
  choice,
  state,
  isBusy,
  onPressOption,
  onGenerateChoices,
}: ChoiceNodeProps) {
  const isLocked = state === "locked";
  const isGenerating = state === "generating";
  const isPending = state === "pending";

  // Calculate branch options positions
  const getBranchPositions = () => {
    if (!choice || !isPending) return [];
    const opts = choice.options;
    const count = opts.length;

    if (count === 1) {
      return [{ x, y: y + BRANCH_OFFSET_Y, option: opts[0], index: 1 }];
    }
    if (count === 2) {
      return [
        { x: x - 75, y: y + BRANCH_OFFSET_Y, option: opts[0], index: 1 },
        { x: x + 75, y: y + BRANCH_OFFSET_Y, option: opts[1], index: 2 },
      ];
    }
    // 3 options
    return [
      { x: x - 100, y: y + BRANCH_OFFSET_Y, option: opts[0], index: 1 },
      { x, y: y + BRANCH_OFFSET_Y, option: opts[1], index: 2 },
      { x: x + 100, y: y + BRANCH_OFFSET_Y, option: opts[2], index: 3 },
    ];
  };

  const branches = getBranchPositions();

  return (
    <View style={styles.container}>
      {/* SVG branch connector lines */}
      {isPending && branches.length > 0 && (
        <Svg
          style={{
            position: "absolute",
            left: 0,
            top: y,
            width: x * 2,
            height: BRANCH_OFFSET_Y + 10,
          }}
        >
          {branches.map((b, idx) => (
            <Line
              key={idx}
              x1={x}
              y1={MAIN_NODE_SIZE / 2}
              x2={b.x}
              y2={BRANCH_OFFSET_Y}
              stroke={colors.accent}
              strokeWidth={3}
              strokeDasharray="6, 4"
            />
          ))}
        </Svg>
      )}

      {/* Main Choice Milestone Node */}
      <View
        style={[
          styles.mainNodeWrapper,
          {
            left: x - MAIN_NODE_SIZE / 2,
            top: y,
          },
        ]}
      >
        <Pressable
          onPress={isLocked || isGenerating || choice ? undefined : onGenerateChoices}
          disabled={isLocked || isGenerating || !!choice}
          style={({ pressed }) => [
            styles.mainNode,
            isLocked && styles.mainNodeLocked,
            isGenerating && styles.mainNodeGenerating,
            isPending && styles.mainNodePending,
            pressed && !isLocked && !isGenerating && !choice && styles.pressed,
          ]}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons
              name={isLocked ? "lock-closed" : "git-network"}
              size={28}
              color="#fff"
            />
          )}
        </Pressable>
      </View>

      {/* Branch Options fanning out as clean circular nodes with side/bottom labels */}
      {isPending &&
        branches.map((b) => {
          const isPause = b.option.specializationLabel == null;
          return (
            <View
              key={b.option.id}
              style={[
                styles.branchNodeWrapper,
                {
                  left: b.x - BRANCH_NODE_SIZE / 2,
                  top: b.y,
                },
              ]}
            >
              {/* Circular Branch Button */}
              <Pressable
                onPress={() => onPressOption(b.option)}
                disabled={isBusy}
                style={({ pressed }) => [
                  styles.branchNode,
                  isPause && styles.pauseNode,
                  isBusy && styles.disabled,
                  pressed && !isBusy && styles.pressed,
                ]}
              >
                <Ionicons
                  name={isPause ? "ribbon" : "git-branch"}
                  size={20}
                  color={isPause ? colors.button : colors.accent}
                />
              </Pressable>

              {/* Centered Small Label below circular branch */}
              <View style={styles.branchLabelWrapper} pointerEvents="none">
                <Text numberOfLines={2} style={styles.branchLabelText}>
                  {b.option.label}
                </Text>
              </View>
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  mainNodeWrapper: {
    position: "absolute",
    width: MAIN_NODE_SIZE,
    height: MAIN_NODE_SIZE,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  mainNode: {
    width: MAIN_NODE_SIZE,
    height: MAIN_NODE_SIZE,
    borderRadius: MAIN_NODE_SIZE / 2,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  mainNodeLocked: {
    backgroundColor: colors.muted + "60",
  },
  mainNodeGenerating: {
    backgroundColor: colors.accent,
  },
  mainNodePending: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    transform: [{ scale: 1.05 }],
  },
  branchNodeWrapper: {
    position: "absolute",
    width: BRANCH_NODE_SIZE,
    height: BRANCH_NODE_SIZE,
    zIndex: 8,
    alignItems: "center",
  },
  branchNode: {
    width: BRANCH_NODE_SIZE,
    height: BRANCH_NODE_SIZE,
    borderRadius: BRANCH_NODE_SIZE / 2,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  pauseNode: {
    borderColor: colors.button,
    backgroundColor: "#f0faf4",
  },
  branchLabelWrapper: {
    width: 90,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  branchLabelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.heading,
    textAlign: "center",
    lineHeight: 13,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
