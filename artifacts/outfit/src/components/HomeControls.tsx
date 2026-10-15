import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ArrowRight,
  Check,
  House,
  X,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import {
  getTabNavigationAction,
  getTabHighlightLayout,
  isProfileTabActive,
  TAB_HIGHLIGHT_HEIGHT,
  TAB_HIGHLIGHT_WIDTH,
  markTabSwitchStart,
  type TabRouteTarget,
} from "@/src/tab-navigation";
import Animated, {
  Easing,
  Extrapolation,
  runOnJS,
  interpolate,
  useAnimatedStyle,
  useAnimatedKeyboard,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import {
  BAR_HEIGHT,
  BAR_WIDTH,
  nativeLayout,
  radius,
  useTheme,
} from "../theme";
import { success, tapLight } from "../haptics";
import { WardrobeAddSheet } from "./WardrobeAddSheet";
import { WhiteChip } from "./WhiteChip";
import { useHomeControlsState } from "@/src/context/HomeControlsContext";

interface HomeControlsProps {
  visible?: boolean;
}

const spring = { damping: 20, stiffness: 220, mass: 1 };

function HomeControlsComponent({ visible = true }: HomeControlsProps) {
  const { colors, isDark } = useTheme();
  const {
    setPlanComposerOpen,
    dailyPlan,
    dailyPlanReady,
    setDailyPlan,
    profileEditorOpen,
  } = useHomeControlsState();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isProfile = isProfileTabActive(pathname);
  const tabBarHidden = isProfile && profileEditorOpen;
  const keyboard = useAnimatedKeyboard();
  const barWidth = BAR_WIDTH(width);
  const tabSlotWidth = barWidth / 3;
  const tabHighlight = getTabHighlightLayout(tabSlotWidth);
  const barBottom = Math.max(insets.bottom - 12, 12);
  const [expanded, setExpanded] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [text, setText] = useState("");
  const [inputHeight, setInputHeight] = useState(56);
  const [toast, setToast] = useState("");
  const inputRef = useRef<TextInput>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOffset = useSharedValue(Dimensions.get("screen").height);
  const progress = useSharedValue(0);
  const expandedHeight = useSharedValue(160);
  const activeTabProgress = useSharedValue(isProfile ? 1 : 0);
  const pressScale = useSharedValue(1);
  const closeStarted = useRef(false);
  const openStarted = useRef(false);
  const toastAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastOffset.value }],
  }));

  useEffect(() => {
    if (!toast) {
      toastOffset.value = Dimensions.get("screen").height;
      return;
    }
    toastOffset.value = Dimensions.get("screen").height;
    toastOffset.value = withSpring(0, spring);
  }, [toast, toastOffset]);

  useEffect(() => {
    const targetHeight =
      160 + Math.max(0, inputHeight - 56);
    expandedHeight.value = withTiming(targetHeight, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
    });
  }, [expandedHeight, inputHeight]);

  useEffect(() => {
    activeTabProgress.value = withSpring(
      isProfile ? 1 : 0,
      spring,
    );
  }, [activeTabProgress, isProfile]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 1900);
  };

  const navigateToTab = (target: TabRouteTarget) => {
    const action = getTabNavigationAction(pathname, target);
    if (!action) return;
    markTabSwitchStart(target);
    router.replace(action.href as never);
  };

  const finishComposerClose = useCallback(() => {
    openStarted.current = false;
    setExpanded(false);
    setPlanComposerOpen(false);
  }, [setPlanComposerOpen]);

  const closeComposer = useCallback(() => {
    if (closeStarted.current) return;
    closeStarted.current = true;
    Keyboard.dismiss();
    progress.value = withTiming(
      0,
      {
        duration: 280,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      },
      (finished) => {
        if (finished) runOnJS(finishComposerClose)();
      },
    );
  }, [finishComposerClose, progress]);

  const openComposer = () => {
    if (!dailyPlanReady) return;
    void tapLight();
    closeStarted.current = false;
    setText(dailyPlan ?? "");
    setInputHeight(56);
    setExpanded(true);
    setPlanComposerOpen(true);
  };

  useEffect(() => {
    if (!expanded || openStarted.current) return;
    openStarted.current = true;
    inputRef.current?.focus();
    progress.value = withTiming(1, {
      duration: 380,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [expanded, progress]);

  useEffect(() => {
    if (!expanded) return;
    const listener = Keyboard.addListener("keyboardDidHide", () => {
      if (!text.trim() && !closeStarted.current) closeComposer();
    });
    return () => listener.remove();
  }, [closeComposer, expanded, text]);

  const savePlan = async () => {
    const nextPlan = text.trim();
    if (!nextPlan) return;
    try {
      await setDailyPlan(nextPlan);
      void success();
      closeComposer();
      showToast("Plan guardado");
    } catch {
      showToast("No se pudo guardar el plan.");
    }
  };

  const clearPlan = async () => {
    try {
      await setDailyPlan(null);
      void tapLight();
      showToast("Plan eliminado");
    } catch {
      showToast("No se pudo eliminar el plan.");
    }
  };

  const morphStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(
        progress.value,
        [0, 1],
        [BAR_HEIGHT, expandedHeight.value],
      ),
      borderRadius: interpolate(
        progress.value,
        [0, 1],
        [radius.panel, radius.panel],
      ),
    };
  });

  const composerContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.45, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.45, 1],
          [8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const planButtonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.3],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [{ scale: pressScale.value }],
  }));

  const tabBarStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          progress.value * (BAR_HEIGHT + insets.bottom + 40),
      },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const panelBottomStyle = useAnimatedStyle(() => {
    const collapsedBottom =
      barBottom + BAR_HEIGHT + nativeLayout.baseSpacing * 3;
    return {
      bottom: Math.max(collapsedBottom, keyboard.height.value + 12),
    };
  });

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: activeTabProgress.value * tabHighlight.profileOffset },
    ],
  }));

  const canSave = Boolean(text.trim());

  return (
    <View
      style={[StyleSheet.absoluteFill, !visible && styles.hidden]}
      pointerEvents={visible ? "box-none" : "none"}
    >
      <Animated.View
        pointerEvents={expanded ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFill,
          styles.dim,
          { backgroundColor: colors.backdrop },
          backdropStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar el plan de hoy"
          onPress={closeComposer}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            toastAnimatedStyle,
            {
              top:
                Platform.OS === "web"
                  ? Math.max(insets.top, 67) + 12
                  : insets.top + 12,
            },
          ]}
          pointerEvents="none"
        >
          <GlassView borderRadius={nativeLayout.pillRadius} style={styles.toastGlass}>
            <Text style={[styles.toastText, { color: colors.textPrimary }]}>
              {toast}
            </Text>
          </GlassView>
        </Animated.View>
      ) : null}

      <View
        style={styles.footer}
        pointerEvents="box-none"
      >
        {!isProfile ? (
          <Animated.View
            style={[
              styles.morphShell,
              { width: barWidth },
              panelBottomStyle,
              morphStyle,
            ]}
          >
            <GlassView
              borderRadius={radius.panel}
              edge
              shadow={false}
              style={StyleSheet.absoluteFill}
            >
              <View style={StyleSheet.absoluteFill} />
            </GlassView>
            <Animated.View
              pointerEvents={expanded ? "auto" : "none"}
              style={[StyleSheet.absoluteFill, composerContentStyle]}
            >
              <View style={styles.composerContent}>
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  onContentSizeChange={({ nativeEvent }) => {
                    const nextHeight = Math.min(
                      140,
                      Math.max(56, nativeEvent.contentSize.height + 16),
                    );
                    setInputHeight((current) =>
                      Math.abs(current - nextHeight) < 1 ? current : nextHeight,
                    );
                  }}
                  placeholder="Ej. trabajo, paseo o cena"
                  placeholderTextColor={colors.placeholder}
                  selectionColor={colors.gold}
                  keyboardAppearance={isDark ? "dark" : "light"}
                  multiline
                  scrollEnabled
                  textAlignVertical="top"
                  maxLength={120}
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.fieldBg,
                      height: inputHeight,
                    },
                  ]}
                />

                <View style={styles.composerActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Guardar plan de hoy"
                    accessibilityState={{ disabled: !canSave }}
                    disabled={!canSave}
                    onPress={() => void savePlan()}
                    style={[
                      styles.sendButton,
                      { backgroundColor: colors.gold, opacity: canSave ? 1 : 0.4 },
                    ]}
                  >
                    <Check size={22} color={colors.onGold} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
            <Animated.View
              pointerEvents={expanded ? "none" : "auto"}
              style={[styles.planButton, planButtonStyle]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  dailyPlan ? `Editar el plan de hoy: ${dailyPlan}` : "Añadir plan para hoy"
                }
                disabled={!dailyPlanReady}
                onPress={openComposer}
                onPressIn={() => {
                  pressScale.value = withSpring(0.97, spring);
                }}
                onPressOut={() => {
                  pressScale.value = withSpring(1, spring);
                }}
                style={styles.planPressable}
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.planText, { color: colors.textPrimary }]}
                >
                  {dailyPlan ? `Hoy: ${dailyPlan}` : "¿Cuál es el plan de hoy?"}
                </Text>
                <ArrowRight size={20} color={colors.gold} strokeWidth={1.8} />
              </Pressable>
              {dailyPlan ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Borrar el plan de hoy"
                  onPress={() => void clearPlan()}
                  hitSlop={8}
                  style={styles.clearPlanButton}
                >
                  <X size={18} color={colors.textSecondary} strokeWidth={1.8} />
                </Pressable>
              ) : null}
            </Animated.View>
          </Animated.View>
        ) : null}

        <Animated.View
          style={[
            styles.tabBarEntrance,
            { bottom: barBottom },
            tabBarHidden && styles.hidden,
          ]}
          pointerEvents={tabBarHidden ? "none" : "box-none"}
        >
          <Animated.View
            style={[styles.tabBarClip, tabBarStyle]}
            pointerEvents={expanded ? "none" : "auto"}
          >
            <GlassView
              borderRadius={radius.panel}
              edge
              shadow
              style={[styles.tabBar, { width: barWidth }]}
            >
              <View style={styles.tabBarContent}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.activeHighlight,
                    {
                      left: tabHighlight.left,
                      width: tabHighlight.width,
                    },
                    highlightStyle,
                  ]}
                >
                  <WhiteChip style={StyleSheet.absoluteFill} />
                </Animated.View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Inicio"
                  accessibilityState={{ selected: !isProfile }}
                  onPress={() => {
                    void tapLight();
                    navigateToTab("home");
                  }}
                  style={[styles.tabButton, { width: tabSlotWidth }]}
                >
                  <House
                    size={28}
                    color={!isProfile ? colors.gold : colors.iconInactive}
                    strokeWidth={1.8}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Añadir"
                  testID="add-wardrobe-item-tab"
                  onPress={() => {
                    setAddSheetVisible(true);
                  }}
                  style={[styles.tabButton, { width: tabSlotWidth }]}
                >
                  <Ionicons
                    name="add-circle"
                    size={28}
                    color={colors.iconInactive}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Perfil"
                  accessibilityState={{ selected: isProfile }}
                  onPress={() => {
                    void tapLight();
                    navigateToTab("profile");
                  }}
                  style={[styles.tabButton, { width: tabSlotWidth }]}
                >
                  <Ionicons
                    name="person"
                    size={28}
                    color={isProfile ? colors.gold : colors.iconInactive}
                  />
                </Pressable>
              </View>
            </GlassView>
          </Animated.View>
        </Animated.View>
      </View>
      <WardrobeAddSheet
        visible={addSheetVisible}
        onDismiss={() => setAddSheetVisible(false)}
        onToast={showToast}
      />
    </View>
  );
}

export const HomeControls = memo(HomeControlsComponent);

const styles = StyleSheet.create({
  hidden: {
    display: "none",
  },
  dim: {
    zIndex: 1,
  },
  footer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    zIndex: 2,
  },
  morphShell: {
    overflow: "hidden",
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 3,
  },
  planButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  planPressable: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  clearPlanButton: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  planText: {
    flexShrink: 1,
    fontFamily: "Satoshi_500Medium",
    fontSize: 18,
  },
  composerContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  input: {
    width: "100%",
    flexShrink: 1,
    minHeight: 56,
    maxHeight: 140,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 0,
    borderWidth: 0,
    borderRadius: radius.field,
    overflow: "hidden",
    outlineWidth: 0,
    outlineColor: "transparent",
    fontFamily: "Satoshi_400Regular",
    fontSize: 17,
    lineHeight: 24,
  },
  composerActions: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarClip: {
    overflow: "visible",
    width: "100%",
    alignItems: "center",
  },
  tabBarEntrance: {
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
    alignItems: "center",
  },
  tabBar: {
    height: BAR_HEIGHT,
    borderRadius: radius.panel,
  },
  tabBarContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  activeHighlight: {
    position: "absolute",
    top: (BAR_HEIGHT - TAB_HIGHLIGHT_HEIGHT) / 2,
    width: TAB_HIGHLIGHT_WIDTH,
    height: TAB_HIGHLIGHT_HEIGHT,
    borderRadius: TAB_HIGHLIGHT_HEIGHT / 2,
    overflow: "hidden",
  },
  tabButton: {
    height: BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  toast: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    zIndex: 4,
  },
  toastGlass: {
    minWidth: 112,
    height: 44,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 15,
  },
});
