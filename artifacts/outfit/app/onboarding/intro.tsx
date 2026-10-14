import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";
import { useColors } from "@/src/theme";
import { tapLight } from "@/src/haptics";

export default function IntroScreen() {
  const colors = useColors();

  return (
    <GradientBackground style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <View style={styles.screen}>
          <View style={styles.content}>
            <Animated.Text
              entering={FadeInDown.duration(250)}
              style={[styles.headline, { color: colors.textPrimary }]}
            >
              Ahora sí empieza lo bueno
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.duration(250).delay(100)}
              style={[styles.subtitle, { color: colors.textSecondary }]}
            >
              Empecemos a registrar tu armario
            </Animated.Text>
          </View>
          <Animated.View entering={FadeInDown.duration(250).delay(200)}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void tapLight();
                router.replace("/onboarding/wardrobe" as never);
              }}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.textPrimary },
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.backgroundTop }]}>
                Vamos
              </Text>
            </Pressable>
          </Animated.View>
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
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  headline: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 48,
    lineHeight: 56,
  },
  subtitle: {
    marginTop: 16,
    fontFamily: "Satoshi_400Regular",
    fontSize: 18,
    lineHeight: 26,
  },
  button: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 17,
  },
});
