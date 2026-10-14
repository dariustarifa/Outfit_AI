import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";
import { useColors } from "@/src/theme";

export default function WardrobeOnboardingPlaceholderScreen() {
  const colors = useColors();

  return (
    <GradientBackground style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <View style={styles.screen}>
          <Text style={[styles.placeholder, { color: colors.textSecondary }]}>
            Próximamente
          </Text>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 17,
  },
});
