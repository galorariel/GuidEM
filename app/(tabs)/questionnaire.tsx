import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import CustomButton from "../../components/CustomButton";
import RatingScale from "../../components/RatingScale"; // Import the new RatingScale component
import { colors, fonts } from "../../constants/theme";

const HOLLAND_CODES = ["Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional"];

const questions = [
  { text: "Study whales and other types of marine life", categories: [false, true, false, false, false, false] },
  { text: "Play a musical instrument", categories: [false, false, true, false, false, false] },
  { text: "Supervise the activities of children at a camp", categories: [false, false, false, true, false, false] },
  { text: "Manage a clothing store", categories: [false, false, false, false, true, false] },
  { text: "Operate a calculator", categories: [false, false, false, false, false, true] },
  { text: "Assemble products in a factory", categories: [true, false, false, false, false, false] },
  { text: "Work in a biology lab", categories: [false, true, false, false, false, false] },
  { text: "Perform stunts for a movie or television show", categories: [false, false, true, false, false, false] },
  { text: "Teach children how to read", categories: [false, false, false, true, false, false] },
  { text: "Sell houses", categories: [false, false, false, false, true, false] },
  { text: "Handle customers' bank transactions", categories: [false, false, false, false, false, true] },
  { text: "Install flooring in houses", categories: [true, false, false, false, false, false] },
  { text: "Make a map of the bottom of an ocean", categories: [false, true, false, false, false, false] },
  { text: "Design sets for plays", categories: [false, false, true, false, false, false] },
  { text: "Help elderly people with their daily activities", categories: [false, false, false, true, false, false] },
  { text: "Run a toy store", categories: [false, false, false, false, true, false] },
  { text: "Keep shipping and receiving records", categories: [false, false, false, false, false, true] },
  { text: "Test the quality of parts before shipment", categories: [true, false, false, false, false, false] },
  { text: "Study the structure of the human body", categories: [false, true, false, false, false, false] },
  { text: "Conduct a musical choir", categories: [false, false, true, false, false, false] },
  { text: "Give career guidance to people", categories: [false, false, false, true, false, false] },
  { text: "Sell restaurant franchises to individuals", categories: [false, false, false, false, true, false] },
  { text: "Generate the monthly payroll checks for an office", categories: [false, false, false, false, false, true] },
  { text: "Lay brick or tile", categories: [true, false, false, false, false, false] },
  { text: "Study animal behavior", categories: [false, true, false, false, false, false] },
  { text: "Direct a play", categories: [false, false, true, false, false, false] },
  { text: "Do volunteer work at a non-profit organization", categories: [false, false, false, true, false, false] },
  { text: "Sell merchandise at a department store", categories: [false, false, false, false, true, false] },
  { text: "Inventory supplies using a hand-held computer", categories: [false, false, false, false, false, true] },
  { text: "Work on an offshore oil-drilling rig", categories: [true, false, false, false, false, false] },
  { text: "Do research on plants or animals", categories: [false, true, false, false, false, false] },
  { text: "Design artwork for magazines", categories: [false, false, true, false, false, false] },
  { text: "Help people who have problems with drugs or alcohol", categories: [false, false, false, true, false, false] },
  { text: "Manage the operations of a hotel", categories: [false, false, false, false, true, false] },
  { text: "Use a computer program to generate customer bills", categories: [false, false, false, false, false, true] },
  { text: "Assemble electronic parts", categories: [true, false, false, false, false, false] },
  { text: "Develop a new medical treatment or procedure", categories: [false, true, false, false, false, false] },
  { text: "Write a song", categories: [false, false, true, false, false, false] },
  { text: "Teach an individual an exercise routine", categories: [false, false, false, true, false, false] },
  { text: "Operate a beauty salon or barber shop", categories: [false, false, false, false, true, false] },
  { text: "Maintain employee records", categories: [false, false, false, false, false, true] },
  { text: "Operate a grinding machine in a factory", categories: [true, false, false, false, false, false] },
  { text: "Conduct biological research", categories: [false, true, false, false, false, false] },
  { text: "Write books or plays", categories: [false, false, true, false, false, false] },
  { text: "Help people with family-related problems", categories: [false, false, false, true, false, false] },
  { text: "Manage a department within a large company", categories: [false, false, false, false, true, false] },
  { text: "Compute and record statistical and other numerical data", categories: [false, false, false, false, false, true] },
  { text: "Fix a broken faucet", categories: [true, false, false, false, false, false] },
];

export default function QuestionnaireTab() {
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(0)); // Initialize with 0 for no selection
  const [saving, setSaving] = useState(false);

  const calculateResults = () => {
    const scores = new Array(HOLLAND_CODES.length).fill(0);

    selectedAnswers.forEach((rating, questionIndex) => {
      if (rating > 0) { // Only process if a rating has been made
        questions[questionIndex].categories.forEach((appliesToCategory, categoryIndex) => {
          if (appliesToCategory) {
            scores[categoryIndex] += rating;
          }
        });
      }
    });

    // Pair scores with their corresponding Holland Code names
    const scoredCategories = HOLLAND_CODES.map((name, index) => ({ name, score: scores[index] }));

    // Sort categories by score in descending order
    scoredCategories.sort((a, b) => b.score - a.score);

    // Determine primary and secondary types
    const primaryType = scoredCategories[0];
    const secondaryType = scoredCategories.length > 1 ? scoredCategories[1] : null;

    if (primaryType.score > 0) {
      let resultMessage = `Your primary personality type is: **${primaryType.name}** with a score of ${primaryType.score}.`;
      if (secondaryType && secondaryType.score > 0) {
        resultMessage += `\nYour secondary personality type is: **${secondaryType.name}** with a score of ${secondaryType.score}.`;
      }
      Alert.alert("Your Personality Types", resultMessage);
    } else {
      Alert.alert("No selections made", "Please rate some activities to get your personality types.");
    }
  };

  const handleRatingChange = (index: number, value: number) => {
    setSelectedAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = value;
      return newAnswers;
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Career Questionnaire</Text>
      <Text style={styles.sub}>Rate how much you like each activity (1-5) to discover your personality types.</Text>

      {questions.map((question, index) => (
        <View key={index} style={styles.questionContainer}>
          <RatingScale
            label={question.text}
            selectedValue={selectedAnswers[index]}
            onValueChange={(value) => handleRatingChange(index, value)}
          />
        </View>
      ))}

      <CustomButton title="Get My Personality Types" onPress={calculateResults} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, paddingTop: 60, paddingBottom: 60 },
  h1: { fontSize: 28, fontFamily: fonts.heading, color: colors.heading, marginBottom: 6 },
  sub: { fontFamily: fonts.body, color: colors.accent, marginBottom: 18 },
  questionContainer: { marginBottom: 15 },
});
