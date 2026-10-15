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
import { Image } from "expo-image";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme";
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

const OPEN_SPRING = { damping: 18, stiffness: 260, mass: 1 };
const CLOSE_SPRING = { damping: 28, stiffness: 320, mass: 1 };

export function PopHost() {
  const { pop, closing, close, finishClose } = usePop();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const progress = useSharedValue(0);
  const [glassReady, setGlassReady] = useState(false);

  useEffect(() => {
    if (!pop) {
      progress.value = 0;
      setGlassReady(false);
      return;
    }

    if (closing) {
      progress.value = withSpring(0, CLOSE_SPRING, (finished) => {
        if (finished) runOnJS(finishClose)();
      });
      return;
    }

    setGlassReady(false);
    progress.value = 0;
    progress.value = withSpring(1, OPEN_SPRING);
  }, [closing, finishClose, pop, progress]);

  useAnimatedReaction(
    () => progress.value >= 0.95,
    (ready, previousReady) => {
      if (ready && !previousReady) runOnJS(setGlassReady)(true);
    },
  );

  const target =
    pop?.size === "large"
      ? {
          x: 16,
          y: insets.top + 16,
          width: Math.max(0, screenWidth - 32),
          height: Math.max(
            0,
            screenHeight - insets.top - insets.bottom - 32,
          ),
        }
      : {
          x: 24,
          y: (screenHeight - Math.min(screenHeight * 0.72, 560)) / 2,
          width: Math.max(0, screenWidth - 48),
          height: Math.min(screenHeight * 0.72, 560),
        };
  const origin = pop?.rect ?? target;
  const originX = origin.x;
  const originY = origin.y;
  const originWidth = origin.width;
  const originHeight = origin.height;
  const destinationX = target.x;
  const destinationY = target.y;
  const destinationWidth = target.width;
  const destinationHeight = target.height;
  const originRadius = pop?.radius ?? 16;
  const destinationRadius = pop?.size === "large" ? 28 : 24;
  const frameStyle = useAnimatedStyle(() => ({
    left: interpolate(
      progress.value,
      [0, 1],
      [originX, destinationX],
      Extrapolation.EXTEND,
    ),
    top: interpolate(
      progress.value,
      [0, 1],
      [originY, destinationY],
      Extrapolation.EXTEND,
    ),
    width: interpolate(
      progress.value,
      [0, 1],
      [originWidth, destinationWidth],
      Extrapolation.EXTEND,
    ),
    height: interpolate(
      progress.value,
      [0, 1],
      [originHeight, destinationHeight],
      Extrapolation.EXTEND,
    ),
    borderRadius: interpolate(
      progress.value,
      [0, 1],
      [originRadius, destinationRadius],
      Extrapolation.EXTEND,
    ),
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const previewStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.7, 1],
      [1, 0],
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
          if (event.translationY > 90 || event.velocityY > 900) {
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
      <GestureDetector gesture={panGesture}>
        <Animated.View
          testID="pop-container"
          style={[
            styles.container,
            { backgroundColor: colors.bgTop },
            frameStyle,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, previewStyle]}
          >
            <Image
              source={{ uri: pop.image }}
              style={styles.previewImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel="Vista previa de la prenda"
            />
          </Animated.View>
          <Animated.View
            pointerEvents={glassReady ? "auto" : "none"}
            style={[StyleSheet.absoluteFill, styles.detail, contentStyle]}
          >
            {pop.content(close, glassReady)}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
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
    overflow: "hidden",
    zIndex: 1,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  detail: {
    zIndex: 1,
  },
});
