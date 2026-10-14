import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/src/context/AppContext";
import { useFonts } from "expo-font";

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
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <AppProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </AppProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
