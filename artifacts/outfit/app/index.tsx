import { useEffect, useMemo, useState } from "react";
import {
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { ArrowRight, CloudSun, Plus, Shirt } from "lucide-react-native";
import Animated, {
  Easing,
  FadeInDown,
  SlideInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";
import { HomeControls } from "@/src/components/HomeControls";
import OnboardingScreen from "@/src/components/ProgressiveOnboardingScreen";
import { useApp } from "@/src/context/AppContext";
import { fetchWeather } from "@/src/services/weather";
import { getHomeWeatherText, refreshWeatherForProfile } from "@/src/services/home-weather";
import { recommendDailyOutfit } from "@/src/services/daily-recommendation";
import { useTheme } from "@/src/theme";
import { selection } from "@/src/haptics";
import { getStartupScreen } from "@/src/onboarding-progress";

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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, wardrobe, weather, setWeather, loading } = useApp();
  const startupScreen = getStartupScreen(loading, profile);
  const [planComposerOpen, setPlanComposerOpen] = useState(false);
  const [clockDate, setClockDate] = useState(() => new Date());
  const dailyItems = useMemo(
    () => recommendDailyOutfit(wardrobe, clockDate, weather),
    [clockDate, wardrobe, weather],
  );

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
    const refreshWeather = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        await refreshWeatherForProfile(profile, fetchWeather, async (snapshot) => {
          if (mounted) await setWeather(snapshot);
        });
      } catch {
        // Keep the cached local weather visible when refresh is unavailable.
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
  const timeAndWeather = getHomeWeatherText(
    formatClock(clockDate),
    weather,
    profile?.city ?? "",
  );

  const openWardrobe = () => {
    void selection();
    router.push("/wardrobe" as never);
  };

  const addFirstItem = () => {
    void selection();
    router.push({
      pathname: "/onboarding/wardrobe",
      params: { from: "plus" },
    } as never);
  };

  if (startupScreen === "loading") {
    return (
      <View style={styles.fill}>
        <View
          style={[
            styles.loadingContent,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
            <View style={[styles.skeletonLine, styles.skeletonDate, { backgroundColor: colors.muted }]} />
            <View style={[styles.skeletonLine, styles.skeletonTitle, { backgroundColor: colors.muted }]} />
            <GlassView style={styles.skeletonCard}>
              <View style={styles.skeletonCardContent}>
                <View style={[styles.skeletonLine, styles.skeletonLabel, { backgroundColor: colors.muted }]} />
                <View style={[styles.skeletonPhoto, { backgroundColor: colors.muted }]} />
                <View style={[styles.skeletonLine, styles.skeletonLabel, { backgroundColor: colors.muted }]} />
              </View>
            </GlassView>
        </View>
      </View>
    );
  }

  if (startupScreen === "gender") {
    return <Redirect href="/onboarding/gender" />;
  }

  if (startupScreen === "onboarding") {
    return <OnboardingScreen />;
  }

  return (
    <View style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={
          Platform.OS === "ios" && !planComposerOpen ? "padding" : undefined
        }
        keyboardVerticalOffset={0}
      >
        <View style={styles.screen}>
              <ScrollView
                style={styles.fill}
                contentInsetAdjustmentBehavior="never"
                contentContainerStyle={[
                  styles.homeContent,
                  {
                    paddingTop:
                      Platform.OS === "web"
                        ? Math.max(insets.top, 67) + 16
                        : insets.top + 16,
                    paddingBottom:
                      Platform.OS === "web"
                        ? Math.max(insets.bottom, 34) + 120
                        : insets.bottom + 120,
                  },
                ]}
                showsVerticalScrollIndicator={false}
                scrollIndicatorInsets={{ right: 1 }}
              >
                <Animated.Text
                  entering={FadeInDown.duration(250)}
                  style={[styles.date, { color: colors.textSecondary }]}
                >
                  {formatDate(clockDate)}
                </Animated.Text>
                <Animated.Text
                  entering={FadeInDown.duration(250).delay(70)}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[styles.greeting, { color: colors.textPrimary }]}
                >
                  Hola, {displayName}
                </Animated.Text>
                <Animated.View
                  entering={FadeInDown.duration(250).delay(130)}
                  style={styles.weatherRow}
                >
                  <CloudSun size={17} color={colors.textSecondary} strokeWidth={1.7} />
                  <Text
                    numberOfLines={1}
                    style={[styles.weather, { color: colors.textSecondary }]}
                  >
                    {timeAndWeather}
                  </Text>
                </Animated.View>

                <Animated.View
                  entering={SlideInDown.duration(320)
                    .easing(Easing.out(Easing.cubic))
                    .delay(190)}
                  style={styles.recommendationSection}
                >
                  <View style={styles.sectionHeading}>
                    <View>
                      <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
                        TU IDEA DE HOY
                      </Text>
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        Un look para ti
                      </Text>
                    </View>
                    <View style={[styles.dayMark, { backgroundColor: colors.muted }]}>
                      <Shirt size={19} color={colors.primary} strokeWidth={1.7} />
                    </View>
                  </View>

                  {dailyItems.items.length > 0 ? (
                    <GlassView testID="daily-recommendation" style={styles.recommendationCard}>
                      <View style={styles.recommendationContent}>
                        <Text style={[styles.cardIntro, { color: colors.textSecondary }]}>
                          {dailyItems.mode === "outfit"
                            ? "Una combinación con prendas de tu armario"
                            : dailyItems.items.length > 1
                              ? "Un punto de partida y una capa exterior"
                              : "Una pieza de tu armario para empezar"}
                        </Text>
                        <View style={styles.outfitItems}>
                          {dailyItems.items.map(({ item, reason }, index) => (
                            <Animated.View
                              key={item.id}
                              entering={FadeInDown.duration(360)
                                .delay(index * 60)
                                .easing(Easing.out(Easing.cubic))}
                              style={styles.outfitItemMotion}
                            >
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Editar prenda: ${item.note.trim() || "sin nota"}`}
                                testID={`recommended-item-${index + 1}`}
                                onPress={() => {
                                  void selection();
                                  router.push({ pathname: "/item", params: { id: item.id } });
                                }}
                                style={({ pressed }) => [
                                  styles.outfitItem,
                                  dailyItems.items.length === 1 && styles.singleOutfitItem,
                                  pressed && styles.pressed,
                                ]}
                              >
                                <View
                                  style={[
                                    styles.photoFrame,
                                    {
                                      borderRadius: nativeLayout.cardRadius,
                                      backgroundColor: colors.muted,
                                    },
                                  ]}
                                >
                                  <Image
                                    source={{ uri: item.imageUri }}
                                    style={styles.photo}
                                    resizeMode="cover"
                                    accessibilityLabel={item.note.trim() || "Prenda guardada"}
                                  />
                                </View>
                                <Text
                                  numberOfLines={2}
                                  style={[styles.itemNote, { color: colors.textPrimary }]}
                                >
                                  {item.note.trim() || "Una pieza de tu armario"}
                                </Text>
                                <Text style={[styles.itemReason, { color: colors.textSecondary }]}>
                                  {reason}
                                </Text>
                              </Pressable>
                            </Animated.View>
                          ))}
                        </View>
                        <View style={[styles.weatherTip, { borderTopColor: colors.border }]}>
                          <Text style={[styles.weatherTipText, { color: colors.textSecondary }]}>
                            {dailyItems.explanation}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          testID="open-wardrobe"
                          onPress={openWardrobe}
                          style={({ pressed }) => [
                            styles.secondaryAction,
                            { borderColor: colors.border },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>
                            Ver mi armario
                          </Text>
                          <ArrowRight size={17} color={colors.primary} strokeWidth={1.8} />
                        </Pressable>
                      </View>
                    </GlassView>
                  ) : (
                    <GlassView testID="empty-wardrobe-recommendation" style={styles.emptyCard}>
                      <View style={styles.emptyContent}>
                        <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                          <Shirt size={25} color={colors.primary} strokeWidth={1.7} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                          Empezamos con lo que ya tienes
                        </Text>
                        <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
                          Añade una foto de una prenda de tu armario. Cada día te propondremos una idea para vestirla.
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          testID="add-first-wardrobe-item"
                          onPress={addFirstItem}
                          style={({ pressed }) => [
                            styles.primaryAction,
                            { backgroundColor: colors.primaryBg },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Plus size={18} color={colors.onPrimary} strokeWidth={2} />
                          <Text style={[styles.primaryActionText, { color: colors.onPrimary }]}>
                            Añadir primera prenda
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          testID="empty-state-open-wardrobe"
                          onPress={openWardrobe}
                          style={styles.textAction}
                        >
                          <Text style={[styles.textActionText, { color: colors.textSecondary }]}>
                            Ver mi armario
                          </Text>
                        </Pressable>
                      </View>
                    </GlassView>
                  )}
                </Animated.View>
              </ScrollView>
          <HomeControls
            onComposerExpandedChange={setPlanComposerOpen}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: {
    flex: 1,
    position: "relative",
  },
  homeContent: {
    paddingHorizontal: nativeLayout.screenHorizontalPadding,
  },
  date: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 11,
    letterSpacing: 1.4,
  },
  greeting: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 43,
    lineHeight: 49,
    marginTop: nativeLayout.baseSpacing * 2,
    includeFontPadding: false,
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeLayout.baseSpacing * 2,
    marginTop: nativeLayout.baseSpacing * 2,
  },
  weather: {
    flexShrink: 1,
    fontFamily: "Satoshi_500Medium",
    fontSize: 14,
  },
  recommendationSection: {
    marginTop: nativeLayout.baseSpacing * 7,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: nativeLayout.baseSpacing * 3,
  },
  eyebrow: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  sectionTitle: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 29,
    lineHeight: 34,
    marginTop: nativeLayout.baseSpacing,
  },
  dayMark: {
    width: nativeLayout.baseSpacing * 11,
    height: nativeLayout.baseSpacing * 11,
    borderRadius: nativeLayout.baseSpacing * 6,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationCard: {
    minHeight: 330,
  },
  recommendationContent: {
    padding: nativeLayout.baseSpacing * 3,
  },
  cardIntro: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    marginBottom: nativeLayout.baseSpacing * 3,
  },
  outfitItems: {
    flexDirection: "row",
    gap: nativeLayout.baseSpacing * 3,
  },
  outfitItemMotion: {
    flex: 1,
    minWidth: 0,
  },
  outfitItem: {
    flex: 1,
    minWidth: 0,
    gap: nativeLayout.baseSpacing * 2,
  },
  singleOutfitItem: {
    flex: 1,
  },
  photoFrame: {
    width: "100%",
    aspectRatio: 0.9,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  itemNote: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    lineHeight: 17,
    paddingHorizontal: 0,
  },
  itemReason: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  weatherTip: {
    borderTopWidth: 1,
    paddingTop: nativeLayout.baseSpacing * 3,
    marginTop: nativeLayout.baseSpacing,
  },
  weatherTipText: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  secondaryAction: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: nativeLayout.pillRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
    marginTop: nativeLayout.baseSpacing * 3,
  },
  secondaryActionText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 13,
  },
  emptyCard: {
    minHeight: 320,
  },
  emptyContent: {
    alignItems: "center",
    paddingHorizontal: nativeLayout.baseSpacing * 5,
    paddingTop: nativeLayout.baseSpacing * 6,
    paddingBottom: nativeLayout.baseSpacing * 5,
  },
  emptyIcon: {
    width: nativeLayout.baseSpacing * 13,
    height: nativeLayout.baseSpacing * 13,
    borderRadius: nativeLayout.baseSpacing * 7,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: nativeLayout.baseSpacing * 3,
  },
  emptyTitle: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 17,
    lineHeight: 23,
    textAlign: "center",
  },
  emptyCopy: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: nativeLayout.baseSpacing * 2,
    maxWidth: 290,
  },
  primaryAction: {
    minHeight: nativeLayout.primaryButtonHeight,
    width: "100%",
    borderRadius: nativeLayout.pillRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
    marginTop: nativeLayout.baseSpacing * 4,
  },
  primaryActionText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 14,
  },
  textAction: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    marginTop: nativeLayout.baseSpacing,
  },
  textActionText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: nativeLayout.screenHorizontalPadding,
    gap: nativeLayout.baseSpacing * 4,
  },
  skeletonLine: {
    height: nativeLayout.baseSpacing * 2,
    borderRadius: nativeLayout.pillRadius,
    opacity: 0.55,
  },
  skeletonDate: { width: "45%" },
  skeletonTitle: {
    width: "76%",
    height: nativeLayout.baseSpacing * 8,
    marginBottom: nativeLayout.baseSpacing * 2,
  },
  skeletonCard: { minHeight: 310 },
  skeletonCardContent: {
    flex: 1,
    padding: nativeLayout.baseSpacing * 4,
    gap: nativeLayout.baseSpacing * 3,
  },
  skeletonLabel: { width: "54%" },
  skeletonPhoto: {
    flex: 1,
    minHeight: 190,
    borderRadius: nativeLayout.cardRadius,
    opacity: 0.45,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
