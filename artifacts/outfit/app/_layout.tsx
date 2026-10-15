import { useEffect } from "react";
import {
  Platform,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/src/context/AppContext";
import { SettingsProvider } from "@/src/context/SettingsContext";
import { ThemeProvider, useTheme } from "@/src/theme";
import { useFonts } from "expo-font";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";
import * as SystemUI from "expo-system-ui";

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
    <SettingsProvider>
      <ThemeProvider>
        <RootShell />
      </ThemeProvider>
    </SettingsProvider>
  );
}

function RootShell() {
  const theme = useTheme();
  const { colors, scheme } = theme;

  useEffect(() => {
    if (Platform.OS === "web") return;
    void SystemUI.setBackgroundColorAsync(colors.bgBottom).catch(
      (error: unknown) => {
        console.error("Unable to update the system window background.", error);
      },
    );
  }, [colors.bgBottom, scheme]);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.bgBottom }}
    >
      <SafeAreaProvider style={styles.fill}>
        <RootShellContent theme={theme} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootShellContent({
  theme,
}: {
  theme: ReturnType<typeof useTheme>;
}) {
  const insets = useSafeAreaInsets();
  const { colors, mode, scheme, systemScheme, isDark } = theme;

  return (
    <>
      <GradientBackground
        colors={colors}
        style={StyleSheet.absoluteFill}
      >
        {null}
      </GradientBackground>
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
      {__DEV__ ? (
        <View
          testID="theme-debug-badge"
          pointerEvents="none"
          style={[
            styles.debugBadge,
            { top: insets.top + 4, backgroundColor: colors.chipBg },
          ]}
        >
          <Text style={[styles.debugBadgeText, { color: colors.onChip }]}>
            {mode} · sys:{systemScheme ?? "unknown"} · {scheme}
          </Text>
        </View>
      ) : null}
      <StatusBar style={isDark ? "light" : "dark"} />
      {Platform.OS === "android" ? (
        <NativeStatusBar
          translucent
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor="transparent"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  debugBadge: {
    position: "absolute",
    right: 10,
    zIndex: 999,
    elevation: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  debugBadgeText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 11,
  },
});
