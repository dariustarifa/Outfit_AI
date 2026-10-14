import { useEffect, useState } from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "@/src/components/GradientBackground";
import { HomeControls } from "@/src/components/HomeControls";
import { useApp } from "@/src/context/AppContext";
import { fetchWeather } from "@/src/services/weather";
import { useColors } from "@/src/theme";

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
    if (loading) return;
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
  }, [loading, profile?.latitude, profile?.longitude, setWeather]);

  const displayName = profile?.name.trim() || "Tú";
  const timeAndWeather = weather
    ? `${formatClock(clockDate)} • ${Math.round(weather.temperatureC)}° ${weather.condition}`
    : formatClock(clockDate);

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
    fontSize: 96,
    lineHeight: 100,
    includeFontPadding: false,
  },
  weather: {
    marginTop: 16,
    fontFamily: "Satoshi_500Medium",
    fontSize: 17,
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
