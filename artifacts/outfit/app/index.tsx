import { useEffect, useState } from "react";
import {
  AppState,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Shirt } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";
import { HomeControls } from "@/src/components/HomeControls";
import OnboardingScreen from "@/src/components/ProgressiveOnboardingScreen";
import { useApp } from "@/src/context/AppContext";
import { fetchWeather } from "@/src/services/weather";
import { useColors } from "@/src/theme";
import { selection } from "@/src/haptics";

type Screen = "home" | "profile";

const MADRID_LATITUDE = 40.4168;
const MADRID_LONGITUDE = -3.7038;

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatDate(date: Date): string {
  return date
    .toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
}

export default function HomeScreen() {
  const colors = useColors();
  const { profile, weather, setWeather, loading } = useApp();
  const [screen, setScreen] = useState<Screen>("home");
  const [clockDate, setClockDate] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const updateAtNextMinute = () => {
      setClockDate(new Date());
      const delay = 60_000 - (Date.now() % 60_000);
      timer = setTimeout(updateAtNextMinute, delay);
    };
    timer = setTimeout(
      updateAtNextMinute,
      60_000 - (Date.now() % 60_000),
    );
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !profile?.onboardingCompleted) return;
    let mounted = true;
    let requestInFlight = false;
    const latitude = profile?.latitude ?? MADRID_LATITUDE;
    const longitude = profile?.longitude ?? MADRID_LONGITUDE;

    const refreshWeather = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const snapshot = await fetchWeather(latitude, longitude);
        if (mounted) await setWeather(snapshot);
      } catch {
        // The existing cached result remains visible; without a cache the UI shows time only.
      } finally {
        requestInFlight = false;
      }
    };

    void refreshWeather();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshWeather();
    });
    const interval = setInterval(() => void refreshWeather(), 30 * 60 * 1000);

    return () => {
      mounted = false;
      appState.remove();
      clearInterval(interval);
    };
  }, [
    loading,
    profile?.latitude,
    profile?.longitude,
    profile?.onboardingCompleted,
    setWeather,
  ]);

  const displayName =
    profile?.preferredName?.trim() || profile?.name.trim() || "Tú";
  const timeAndWeather = weather
    ? `${formatClock(clockDate)} • ${Math.round(weather.temperatureC)}° ${weather.condition}`
    : formatClock(clockDate);

  if (loading) {
    return (
      <GradientBackground style={styles.fill}>
        <SafeAreaView style={[styles.fill, styles.loading]}>
          <ActivityIndicator color={colors.textPrimary} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!profile?.onboardingCompleted) {
    return <OnboardingScreen />;
  }

  return (
    <GradientBackground style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.screen}>
            {screen === "home" ? (
              <View style={styles.homeContent}>
                <Text
                  style={[
                    styles.date,
                    { color: colors.textSecondary },
                  ]}
                >
                  {formatDate(clockDate)}
                </Text>
                <View style={styles.greeting}>
                  <Animated.Text
                    entering={FadeInDown.duration(250)}
                    style={[styles.greetingLine, { color: colors.textPrimary }]}
                  >
                    Hola,
                  </Animated.Text>
                  <Animated.Text
                    entering={FadeInDown.duration(250).delay(80)}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                    style={[styles.greetingLine, { color: colors.textPrimary }]}
                  >
                    {displayName}
                  </Animated.Text>
                </View>
                <Animated.Text
                  entering={FadeInDown.duration(250).delay(160)}
                  style={[styles.weather, { color: colors.textSecondary }]}
                >
                  {timeAndWeather}
                </Animated.Text>
                <Pressable
                  accessibilityRole="button"
                  testID="open-wardrobe"
                  onPress={() => {
                    void selection();
                    router.push("/wardrobe" as never);
                  }}
                  style={({ pressed }) => [
                    styles.wardrobeButton,
                    { borderColor: colors.border },
                    pressed && styles.wardrobeButtonPressed,
                  ]}
                >
                  <Shirt size={18} color={colors.textPrimary} />
                  <Text style={[styles.wardrobeButtonText, { color: colors.textPrimary }]}>
                    Ver mi armario
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.profileContent}>
                <Text style={[styles.profileTitle, { color: colors.textPrimary }]}>
                  Perfil
                </Text>
              </View>
            )}
            <HomeControls screen={screen} onScreenChange={setScreen} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    flex: 1,
    position: "relative",
  },
  homeContent: {
    paddingTop: 90,
    paddingHorizontal: 20,
  },
  date: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  greeting: {
    marginTop: 12,
  },
  greetingLine: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 100,
    lineHeight: 104,
    includeFontPadding: false,
  },
  weather: {
    marginTop: 16,
    fontFamily: "Satoshi_500Medium",
    fontSize: 17,
  },
  wardrobeButton: {
    alignSelf: "flex-start",
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  wardrobeButtonText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 14,
  },
  wardrobeButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  profileContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 120,
  },
  profileTitle: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 24,
  },
});
