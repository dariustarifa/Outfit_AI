import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";
import { useColors } from "@/src/theme";

export default function PrivacyPlaceholderScreen() {
  const colors = useColors();

  return (
    <GradientBackground style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <View style={styles.screen}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={[styles.backText, { color: colors.textPrimary }]}>
              Volver
            </Text>
          </Pressable>
          <Text style={[styles.placeholder, { color: colors.textPrimary }]}>
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
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  backButton: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  backText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 15,
  },
  placeholder: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    fontFamily: "Melodrama_500Medium",
    fontSize: 40,
  },
});
