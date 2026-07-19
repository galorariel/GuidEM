import React, { useRef, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
} from "react-native";
import { colors } from "../../constants/theme";
import type { GuideUnitFull, GuideStep, GuideChoice } from "../../services/guide";
import type { ChoiceOption } from "../../services/guide/generator";
import PathCurve from "./PathCurve";
import PathNode from "./PathNode";
import CompletedUnitNode from "./CompletedUnitNode";
import ChoiceNode from "./ChoiceNode";
import StepDetailSheet from "./StepDetailSheet";

interface GuidePathProps {
  units: GuideUnitFull[];
  isChoiceGenerating: boolean;
  choiceBusyUnitId: string | null;
  stepBusyId: string | null;
  onMarkStepDone: (stepId: string, unit: GuideUnitFull) => void;
  onSubmitChoice: (unit: GuideUnitFull, optionId: string) => void;
  onGenerateChoices: (unit: GuideUnitFull) => void;
}

// Layout configuration constants
const CONTAINER_WIDTH = 340;
const CENTER_X = CONTAINER_WIDTH / 2;
const VERTICAL_SPACING = 110;
const WAVE_AMPLITUDE = 65;
const WAVE_FREQUENCY = 0.9;
const START_Y = 50;

type FlatPathNode =
  | {
      type: "completed-unit";
      key: string;
      unit: GuideUnitFull;
      decision: string | null;
      x: number;
      y: number;
    }
  | {
      type: "step";
      key: string;
      step: GuideStep;
      unit: GuideUnitFull;
      state: "completed" | "current" | "locked";
      x: number;
      y: number;
      labelPosition: "left" | "right";
    }
  | {
      type: "choice";
      key: string;
      unit: GuideUnitFull;
      choice: GuideChoice | null;
      state: "locked" | "generating" | "pending";
      x: number;
      y: number;
    };

export default function GuidePath({
  units,
  isChoiceGenerating,
  choiceBusyUnitId,
  stepBusyId,
  onMarkStepDone,
  onSubmitChoice,
  onGenerateChoices,
}: GuidePathProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Modal presentation states
  const [selectedStep, setSelectedStep] = useState<GuideStep | null>(null);
  const [selectedStepUnit, setSelectedStepUnit] = useState<GuideUnitFull | null>(null);
  
  const [selectedUnit, setSelectedUnit] = useState<GuideUnitFull | null>(null);
  
  const [selectedOption, setSelectedOption] = useState<ChoiceOption | null>(null);
  const [selectedOptionUnit, setSelectedOptionUnit] = useState<GuideUnitFull | null>(null);

  // 1. Flatten the units and steps into a sequential path array
  const flatNodes: FlatPathNode[] = [];
  let currentY = START_Y;
  let layoutStepCount = 0; // step counter for wave sine pattern

  units
    .slice()
    .sort((a, b) => a.unitIndex - b.unitIndex)
    .forEach((unit) => {
      if (unit.status === "done") {
        // Collapsed completed unit milestone
        const selectedOption = unit.choice?.options.find(
          (o) => o.id === unit.choice?.selectedOptionId
        );
        const decision = selectedOption?.label || null;

        flatNodes.push({
          type: "completed-unit",
          key: `unit-${unit.id}`,
          unit,
          decision,
          x: CENTER_X,
          y: currentY,
        });
        currentY += VERTICAL_SPACING + 20; // Extra padding for milestones
      } else {
        // Active or Locked unit: show full steps list
        let firstUncompletedIndex = unit.steps
          .slice()
          .sort((a, b) => a.stepIndex - b.stepIndex)
          .findIndex((s) => s.completedAt == null);

        if (firstUncompletedIndex === -1 && unit.steps.length > 0) {
          // If all steps are done but status is not "done" (awaiting choice)
          firstUncompletedIndex = 999;
        }

        unit.steps
          .slice()
          .sort((a, b) => a.stepIndex - b.stepIndex)
          .forEach((step, idx) => {
            let state: "completed" | "current" | "locked" = "locked";
            if (unit.status === "locked") {
              state = "locked";
            } else if (step.completedAt != null) {
              state = "completed";
            } else if (idx === firstUncompletedIndex) {
              state = "current";
            } else if (idx > firstUncompletedIndex) {
              state = "locked";
            }

            // Calculate sinusoidal left-right placement
            const angle = layoutStepCount * WAVE_FREQUENCY;
            const x = CENTER_X + WAVE_AMPLITUDE * Math.sin(angle);
            const labelPosition = Math.sin(angle) >= 0 ? "left" : "right";

            flatNodes.push({
              type: "step",
              key: `step-${step.id}`,
              step,
              unit,
              state,
              x,
              y: currentY,
              labelPosition,
            });

            layoutStepCount++;
            currentY += VERTICAL_SPACING;
          });

        // Add the Unit Choice Node at the end of the steps
        let choiceState: "locked" | "generating" | "pending" = "locked";
        if (unit.status === "active") {
          const allStepsDone = unit.steps.every((s) => s.completedAt != null);
          if (allStepsDone) {
            choiceState = unit.choice ? "pending" : (isChoiceGenerating ? "generating" : "pending");
          } else {
            choiceState = "locked";
          }
        }

        flatNodes.push({
          type: "choice",
          key: `choice-${unit.id}`,
          unit,
          choice: unit.choice,
          state: choiceState,
          x: CENTER_X,
          y: currentY,
        });

        // Spacing below choice node
        const needsFanOutSpacing = choiceState === "pending" && unit.choice && unit.choice.options.length > 0;
        currentY += needsFanOutSpacing ? VERTICAL_SPACING + 70 : VERTICAL_SPACING + 20;
      }
    });

  // 2. Auto-scroll to current node on mount or path change
  useEffect(() => {
    const currentNode = flatNodes.find((n) => n.type === "step" && n.state === "current");
    const activeChoiceNode = flatNodes.find((n) => n.type === "choice" && n.state === "pending");
    
    // Scroll target prioritizes active choice node, then current step node
    const scrollTarget = activeChoiceNode || currentNode;

    if (scrollTarget) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, scrollTarget.y - Dimensions.get("window").height / 2.5),
          animated: true,
        });
      }, 300);
    }
  }, [units, isChoiceGenerating]);

  // Handle marking a step as done in detail modal
  const handleMarkDonePress = () => {
    if (selectedStep && selectedStepUnit) {
      onMarkStepDone(selectedStep.id, selectedStepUnit);
      setSelectedStep(null);
      setSelectedStepUnit(null);
    }
  };

  // Handle submitting choice from options detail modal
  const handleChooseOptionPress = () => {
    if (selectedOption && selectedOptionUnit) {
      onSubmitChoice(selectedOptionUnit, selectedOption.id);
      setSelectedOption(null);
      setSelectedOptionUnit(null);
    }
  };

  const totalHeight = currentY + 120;

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { height: totalHeight }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.innerContainer, { height: totalHeight }]}>
          
          {/* 3. Render connection curves between adjacent nodes */}
          {flatNodes.map((node, i) => {
            if (i === flatNodes.length - 1) return null;
            const nextNode = flatNodes[i + 1];

            // Curve color logic: if the target node is completed, mark curve completed
            let isSegmentCompleted = false;
            if (nextNode.type === "step" && nextNode.state === "completed") {
              isSegmentCompleted = true;
            } else if (nextNode.type === "completed-unit") {
              isSegmentCompleted = true;
            } else if (node.type === "step" && node.state === "completed" && nextNode.type === "choice") {
              isSegmentCompleted = true;
            }

            return (
              <PathCurve
                key={`curve-${node.key}`}
                startX={node.x}
                startY={node.y}
                endX={nextNode.x}
                endY={nextNode.y}
                completed={isSegmentCompleted}
              />
            );
          })}

          {/* 4. Render nodes */}
          {flatNodes.map((node) => {
            if (node.type === "completed-unit") {
              return (
                <CompletedUnitNode
                  key={node.key}
                  x={node.x}
                  y={node.y}
                  unit={node.unit}
                  decision={node.decision}
                  onPress={() => setSelectedUnit(node.unit)}
                />
              );
            }

            if (node.type === "step") {
              return (
                <PathNode
                  key={node.key}
                  x={node.x}
                  y={node.y}
                  title={node.step.title}
                  kind={node.step.kind}
                  state={node.state}
                  labelPosition={node.labelPosition}
                  onPress={() => {
                    setSelectedStep(node.step);
                    setSelectedStepUnit(node.unit);
                  }}
                />
              );
            }

            if (node.type === "choice") {
              const isBusy = choiceBusyUnitId === node.unit.id;
              return (
                <ChoiceNode
                  key={node.key}
                  x={node.x}
                  y={node.y}
                  choice={node.choice}
                  state={node.state}
                  isBusy={isBusy}
                  onPressOption={(option) => {
                    setSelectedOption(option);
                    setSelectedOptionUnit(node.unit);
                  }}
                  onGenerateChoices={() => onGenerateChoices(node.unit)}
                />
              );
            }

            return null;
          })}
        </View>
      </ScrollView>

      {/* 5. Reusable Bottom Sheet Modal */}
      <StepDetailSheet
        visible={!!selectedStep || !!selectedUnit || !!selectedOption}
        onClose={() => {
          setSelectedStep(null);
          setSelectedStepUnit(null);
          setSelectedUnit(null);
          setSelectedOption(null);
          setSelectedOptionUnit(null);
        }}
        step={selectedStep}
        unitOfStep={selectedStepUnit}
        isStepBusy={stepBusyId === selectedStep?.id}
        onMarkDone={handleMarkDonePress}
        completedUnit={selectedUnit}
        decisionText={
          selectedUnit
            ? selectedUnit.choice?.options.find(
                (o) => o.id === selectedUnit.choice?.selectedOptionId
              )?.label || null
            : null
        }
        choiceOption={selectedOption}
        onChooseOption={handleChooseOptionPress}
        isChoiceBusy={choiceBusyUnitId === selectedOptionUnit?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
    paddingBottom: 40,
  },
  innerContainer: {
    width: CONTAINER_WIDTH,
    position: "relative",
  },
});
