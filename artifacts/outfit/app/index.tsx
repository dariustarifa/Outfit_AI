import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Redirect, router, useIsFocused } from "expo-router";
import { ArrowRight, CloudSun, Plus, Shirt } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";
import { PopTrigger } from "@/src/components/PopTrigger";
import { WardrobeItemEditor } from "./item";
import OnboardingScreen from "@/src/components/ProgressiveOnboardingScreen";
import { useApp } from "@/src/context/AppContext";
import { useHomeControlsState } from "@/src/context/HomeControlsContext";
import { fetchWeather } from "@/src/services/weather";
import { getHomeWeatherText, refreshWeatherForProfile } from "@/src/services/home-weather";
import { recommendDailyOutfit } from "@/src/services/daily-recommendation";
import { useTheme } from "@/src/theme";
import { selection } from "@/src/haptics";
import { getStartupScreen } from "@/src/onboarding-progress";
import type { WardrobeItem } from "@/src/types";

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

export function HomeScreen() {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const focusProgress = useSharedValue(0);
  const focusStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
  }));
  const insets = useSafeAreaInsets();
  const { profile, wardrobe, weather, setWeather, loading } = useApp();
  const startupScreen = getStartupScreen(loading, profile);
  const { planComposerOpen } = useHomeControlsState();
  const lastWeatherRefreshAt = useRef(0);
  const lastWeatherLocation = useRef("");
  const [clockDate, setClockDate] = useState(() => new Date());
  const dailyItems = useMemo(
    () => recommendDailyOutfit(wardrobe, clockDate, weather),
    [clockDate, wardrobe, weather],
  );

  useEffect(() => {
    if (!isFocused) return;
    focusProgress.value = 0;
    focusProgress.value = withTiming(1, { duration: 140 });
  }, [focusProgress, isFocused]);

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
    const locationKey = [
      profile.city,
      profile.latitude ?? "",
      profile.longitude ?? "",
    ].join(":");
    if (!lastWeatherLocation.current) {
      lastWeatherLocation.current = locationKey;
    }
    const refreshWeather = async (force = false) => {
      const now = Date.now();
      const locationChanged = lastWeatherLocation.current !== locationKey;
      const stale = !weather || now - weather.updatedAt >= 10 * 60 * 1000;
      const recentAttempt = now - lastWeatherRefreshAt.current < 10 * 60 * 1000;
      if (!force && !locationChanged && (!stale || recentAttempt)) return;
      if (requestInFlight) return;
      requestInFlight = true;
      lastWeatherRefreshAt.current = now;
      lastWeatherLocation.current = locationKey;
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
      if (state === "active") void refreshWeather(true);
    });
    const interval = setInterval(() => void refreshWeather(), 10 * 60 * 1000);

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
    profile?.city,
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
    <Animated.View style={[styles.fill, focusStyle]}>
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
                <Animated.Text style={[styles.date, { color: colors.textSecondary }]}>
                  {formatDate(clockDate)}
                </Animated.Text>
                <Animated.Text
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[styles.greeting, { color: colors.textPrimary }]}
                >
                  Hola, {displayName}
                </Animated.Text>
                <Animated.View style={styles.weatherRow}>
                  <CloudSun size={17} color={colors.textSecondary} strokeWidth={1.7} />
                  <Text
                    numberOfLines={1}
                    style={[styles.weather, { color: colors.textSecondary }]}
                  >
                    {timeAndWeather}
                  </Text>
                </Animated.View>

                <Animated.View style={styles.recommendationSection}>
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
                              style={styles.outfitItemMotion}
                            >
                              <HomeRecommendationItem
                                item={item}
                                reason={reason}
                                single={dailyItems.items.length === 1}
                                testID={`recommended-item-${index + 1}`}
                              />
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
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

export default function IndexRoute() {
  return <Redirect href="/home" />;
}

const HomeRecommendationItem = memo(function HomeRecommendationItem({
  item,
  reason,
  single,
  testID,
}: {
  item: WardrobeItem;
  reason: string;
  single: boolean;
  testID: string;
}) {
  const { colors } = useTheme();
  const image = item.thumbUri ?? item.imageUri;
  const content = useCallback(
    (close: () => void, glassReady: boolean) => (
      <WardrobeItemEditor
        id={item.id}
        onClose={close}
        popup
        glassReady={glassReady}
      />
    ),
    [item.id],
  );

  return (
    <PopTrigger
      id={item.id}
      image={image}
      fullImage={item.imageUri}
      radius={nativeLayout.cardRadius}
      size="large"
      content={content}
      style={[styles.outfitItem, single && styles.singleOutfitItem]}
      pressedStyle={styles.pressed}
      accessibilityLabel={`Editar prenda: ${item.note.trim() || "sin nota"}`}
      testID={testID}
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
          source={{ uri: image }}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
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
    </PopTrigger>
  );
});

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
