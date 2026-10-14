import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView } from "@/src/components/GlassView";
import { GradientBackground } from "@/src/components/GradientBackground";
import { useApp } from "@/src/context/AppContext";
import { nativeLayout, useColors } from "@/src/theme";

export default function SetupScreen() {
  const colors = useColors();
  const { loading, error } = useApp();

  const message = error
    ? "No se pudieron cargar los datos locales."
    : loading
      ? "Preparando los datos locales…"
      : "Setup OK";

  return (
    <GradientBackground style={styles.fill}>
      <SafeAreaView
        style={[
          styles.safeArea,
          Platform.OS === "web" ? styles.webSafeArea : undefined,
        ]}
      >
        <View style={styles.center}>
          <GlassView
            testID="setup-glass-pill"
            borderRadius={nativeLayout.pillRadius}
            style={styles.glassPill}
          >
            <View style={styles.pillContent}>
              <Text
                accessibilityRole="text"
                testID="setup-status"
                style={[styles.status, { color: colors.textPrimary }]}
              >
                {message}
              </Text>
            </View>
          </GlassView>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  webSafeArea: {
    paddingTop: 67,
    paddingBottom: 34,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: nativeLayout.screenHorizontalPadding,
  },
  glassPill: {
    width: 300,
    height: 64,
  },
  pillContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  status: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
