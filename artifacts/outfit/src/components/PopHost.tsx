import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";
import { radius, useTheme } from "@/src/theme";
import { tapLight } from "@/src/haptics";

export interface PopRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PopSize = "card" | "large";
export type PopContent = (close: () => void, glassReady: boolean) => ReactNode;

export interface PopOptions {
  id: string;
  rect: PopRect;
  radius: number;
  size: PopSize;
  image: string;
  content: PopContent;
}

interface PopContextValue {
  activeId: string | null;
  open: (options: PopOptions) => void;
  close: () => void;
}

interface PopHostState extends PopContextValue {
  pop: PopOptions | null;
  closing: boolean;
  finishClose: () => void;
}

const PopContext = createContext<PopHostState | null>(null);

export function PopProvider({ children }: { children: ReactNode }) {
  const [pop, setPop] = useState<PopOptions | null>(null);
  const [closing, setClosing] = useState(false);

  const open = useCallback((options: PopOptions) => {
    void tapLight();
    setClosing(false);
    setPop(options);
  }, []);

  const close = useCallback(() => {
    if (pop) setClosing(true);
  }, [pop]);

  const finishClose = useCallback(() => {
    setPop(null);
    setClosing(false);
  }, []);

  const value = useMemo(
    () => ({
      activeId: pop?.id ?? null,
      open,
      close,
      pop,
      closing,
      finishClose,
    }),
    [close, closing, finishClose, open, pop],
  );

  return <PopContext.Provider value={value}>{children}</PopContext.Provider>;
}

export function usePop() {
  const context = useContext(PopContext);
  if (!context) {
    throw new Error("usePop must be used within PopProvider.");
  }
  return context;
}

export function PopHost() {
  const { pop, closing, close, finishClose } = usePop();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const progress = useSharedValue(0);
  const [glassReady, setGlassReady] = useState(false);

  useEffect(() => {
    if (!pop) {
      progress.value = 0;
      setGlassReady(false);
      return;
    }

    if (closing) {
      progress.value = withTiming(
        0,
        { duration: 300, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(finishClose)();
        },
      );
      return;
    }

    setGlassReady(false);
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [closing, finishClose, pop, progress]);

  useAnimatedReaction(
    () => progress.value >= 0.95,
    (ready, previousReady) => {
      if (ready && !previousReady) runOnJS(setGlassReady)(true);
    },
  );

  const sheetHeight =
    pop?.size === "large"
      ? Math.max(0, screenHeight - insets.top)
      : Math.min(screenHeight * 0.72, 560);
  const frameStyle = useAnimatedStyle(() => ({
    height: sheetHeight,
    transform: [
      {
        translateY: interpolate(
      progress.value,
      [0, 1],
          [sheetHeight + 24, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.55, 0.9],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .onEnd((event) => {
          if (event.translationY > 48 || event.velocityY > 650) {
            runOnJS(close)();
          }
        }),
    [close],
  );

  if (!pop) return null;

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Animated.View
        pointerEvents="auto"
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { backgroundColor: colors.backdrop },
          backdropStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar detalle"
          testID="pop-backdrop"
          style={StyleSheet.absoluteFill}
          onPress={close}
        />
      </Animated.View>
      <Animated.View
        testID="pop-container"
        style={[
          styles.container,
          { backgroundColor: colors.bgTop },
          frameStyle,
        ]}
      >
        <GestureDetector gesture={panGesture}>
          <View collapsable={false} style={styles.dragHandleArea}>
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: colors.textSecondary },
              ]}
            />
          </View>
        </GestureDetector>
        <Animated.View
          pointerEvents={glassReady ? "auto" : "none"}
          style={[
            StyleSheet.absoluteFill,
            styles.detail,
            { paddingBottom: insets.bottom + nativeLayout.baseSpacing * 4 },
            contentStyle,
          ]}
        >
          {pop.content(close, glassReady)}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 200,
    elevation: 200,
  },
  backdrop: {
    zIndex: 0,
  },
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    zIndex: 1,
  },
  dragHandleArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: nativeLayout.baseSpacing * 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  dragHandle: {
    width: nativeLayout.baseSpacing * 9,
    height: nativeLayout.baseSpacing,
    borderRadius: nativeLayout.pillRadius,
    opacity: 0.55,
  },
  detail: {
    zIndex: 1,
  },
});
