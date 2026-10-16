import { useEffect, useRef } from "react";
import {
  Platform,
  StatusBar as NativeStatusBar,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, usePathname, useRootNavigationState, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/src/context/AppContext";
import { HomeControlsProvider } from "@/src/context/HomeControlsContext";
import { SettingsProvider } from "@/src/context/SettingsContext";
import { HomeControls } from "@/src/components/HomeControls";
import { PopHost, PopProvider } from "@/src/components/PopHost";
import { ThemeProvider, useTheme } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";
import { useFonts } from "expo-font";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";
import * as SystemUI from "expo-system-ui";
import { preparePendingGalleryPickerRecovery } from "@/src/gallery-picker-recovery-storage";

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
  const { colors, isDark } = theme;
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const recoveryStarted = useRef(false);

  useEffect(() => {
    if (
      Platform.OS !== "android" ||
      !navigationState?.key ||
      recoveryStarted.current
    ) {
      return;
    }
    recoveryStarted.current = true;

    void preparePendingGalleryPickerRecovery()
      .then((record) => {
        if (!record) return;
        const galleryRecovery = String(Date.now());
        if (record.intent.target === "item") {
          router.replace({
            pathname: "/item",
            params: {
              ...(record.intent.itemId ? { id: record.intent.itemId } : {}),
              returnTo: record.intent.returnTo,
              galleryRecovery,
            },
          } as never);
          return;
        }
        router.replace({
          pathname: "/onboarding/wardrobe",
          params: {
            ...(record.intent.fromPlus ? { from: "plus" } : {}),
            galleryRecovery,
          },
        } as never);
      })
      .catch((error: unknown) => {
        console.error("Unable to recover the pending gallery selection.", error);
      });
  }, [navigationState?.key, router]);

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
          <HomeControlsProvider>
            <PopProvider>
              <View style={styles.fill}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "transparent" },
                    animation: "none",
                  }}
                >
                  <Stack.Screen
                    name="(tabs)"
                    options={{ animation: "none" }}
                  />
                </Stack>
                <PersistentHomeControls />
                <PopHost />
              </View>
            </PopProvider>
          </HomeControlsProvider>
        </AppProvider>
      </ErrorBoundary>
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

function PersistentHomeControls() {
  const pathname = usePathname();
  const { loading, profile } = useApp();
  const visible =
    !loading &&
    Boolean(profile?.onboardingCompleted) &&
    (pathname === "/home" || pathname === "/profile-tab");

  return <HomeControls visible={visible} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
