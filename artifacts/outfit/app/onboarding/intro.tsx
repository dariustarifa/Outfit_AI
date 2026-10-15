import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";
import { tapLight } from "@/src/haptics";

export default function IntroScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const [starting, setStarting] = useState(false);

  const startWardrobe = () => {
    if (starting) return;
    if (!profile) {
      router.replace("/");
      return;
    }
    setStarting(true);
    void tapLight();
    router.replace("/onboarding/wardrobe" as never);
  };

  return (
    <View style={styles.fill}>
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
        ]}
      >
          <View style={styles.content}>
            <Animated.Text
              entering={FadeInDown.duration(250)}
              style={[styles.headline, { color: colors.textPrimary }]}
            >
              Ahora empieza la aventura
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.duration(250).delay(100)}
              style={[styles.subtitle, { color: colors.textSecondary }]}
            >
              Registra tu armario
            </Animated.Text>
          </View>
          <Animated.View entering={FadeInDown.duration(250).delay(200)}>
            <Pressable
              accessibilityRole="button"
              disabled={starting}
              onPress={startWardrobe}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.textPrimary },
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.backgroundTop }]}>
                {starting ? "Abriendo…" : "Vamos"}
              </Text>
            </Pressable>
          </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
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
