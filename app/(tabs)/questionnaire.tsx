import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../../constants/theme";

export default function QuestionnaireScreen() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Questionnaire — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  t: { fontFamily: fonts.heading, color: colors.heading, fontSize: 20 },
});
