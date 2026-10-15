import { useEffect } from "react";
import { Platform, StatusBar as NativeStatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/src/context/AppContext";
import { useFonts } from "expo-font";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Satoshi_400Regular: require("../assets/fonts/Satoshi-Regular.otf"),
    Satoshi_500Medium: require("../assets/fonts/Satoshi-Medium.otf"),
    Satoshi_700Bold: require("../assets/fonts/Satoshi-Bold.otf"),
    Melodrama_500Medium: require("../assets/fonts/Melodrama-Medium.otf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: "#F5F2EB" }}
    >
      <SafeAreaProvider style={styles.fill}>
        <GradientBackground style={StyleSheet.absoluteFill}>{null}</GradientBackground>
        <ErrorBoundary>
          <AppProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
                animation: "fade",
              }}
            />
          </AppProvider>
        </ErrorBoundary>
        <StatusBar style="dark" />
        {Platform.OS === "android" ? (
          <NativeStatusBar
            translucent
            barStyle="dark-content"
            backgroundColor="transparent"
          />
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
