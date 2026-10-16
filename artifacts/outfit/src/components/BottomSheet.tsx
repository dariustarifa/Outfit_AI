import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  BackHandler,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";
import { radius, useTheme } from "../theme";
import { tapLight } from "../haptics";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  onDismissed?: () => void;
  backdropTestID?: string;
  backdropLabel?: string;
}

const screenHeight = Dimensions.get("screen").height;

export function BottomSheet({
  visible,
  onClose,
  children,
  onDismissed,
  backdropTestID = "bottom-sheet-backdrop",
  backdropLabel = "Cerrar",
}: BottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const progress = useSharedValue(0);
  const sheetHeight = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);
  const closeStarted = useRef(false);
  const retainedChildren = useRef(children);

  if (visible) retainedChildren.current = children;

  const finishClose = useCallback(() => {
    setMounted(false);
    onDismissed?.();
  }, [onDismissed]);

  const requestClose = useCallback(() => {
    if (!closeStarted.current) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    closeStarted.current = false;
    setMounted(true);
    setKeyboardHeight(0);
    progress.value = 0;
    sheetHeight.value = 0;
    keyboardOffset.value = 0;
    void tapLight();
    progress.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, progress, sheetHeight, keyboardOffset]);

  useEffect(() => {
    if (visible || !mounted) return;
    closeStarted.current = true;
    Keyboard.dismiss();
    progress.value = withTiming(0, { duration: 240 }, (finished) => {
      if (finished) runOnJS(finishClose)();
    });
  }, [visible, mounted, progress, finishClose]);

  useEffect(() => {
    if (!mounted || Platform.OS === "web") return;

    const handleKeyboardShow = (event: {
      duration?: number;
      endCoordinates: { height: number };
    }) => {
      const height = Math.max(0, event.endCoordinates.height);
      setKeyboardHeight(height);
      keyboardOffset.value = withTiming(height, {
        duration: event.duration ?? 250,
        easing: Easing.out(Easing.cubic),
      });
    };
    const handleKeyboardHide = (event: { duration?: number }) => {
      setKeyboardHeight(0);
      keyboardOffset.value = withTiming(0, {
        duration: event.duration ?? 250,
        easing: Easing.out(Easing.cubic),
      });
    };

    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      handleKeyboardShow,
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      handleKeyboardHide,
    );
    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        requestClose();
        return true;
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      backSubscription.remove();
    };
  }, [mounted, keyboardOffset, requestClose]);

  const maxSheetHeight = Math.max(
    180,
    Math.min(
      viewportHeight * 0.92,
      viewportHeight - insets.top - keyboardHeight - 16,
    ),
  );

  const onSheetLayout = (event: LayoutChangeEvent) => {
    sheetHeight.value = event.nativeEvent.layout.height;
  };

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    const offset = sheetHeight.value > 0
      ? sheetHeight.value + 80
      : screenHeight;
    const hiddenOffset = offset + keyboardOffset.value;
    return {
      transform: [
        {
          translateY:
            interpolate(progress.value, [0, 1], [hiddenOffset, 0]) -
            keyboardOffset.value,
        },
      ],
    };
  });

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const panGesture = Gesture.Pan()
    .activeOffsetY(12)
    .onEnd((event) => {
      if (event.translationY > 48 || event.velocityY > 650) {
        runOnJS(requestClose)();
      }
    });

  if (!mounted) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { backgroundColor: colors.backdrop },
          backdropAnimatedStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backdropLabel}
          testID={backdropTestID}
          onPress={requestClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        onLayout={onSheetLayout}
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 16, maxHeight: maxSheetHeight },
          sheetAnimatedStyle,
        ]}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <GlassView borderRadius={radius.panel} style={StyleSheet.absoluteFill}>
            <View style={StyleSheet.absoluteFill} />
          </GlassView>
        </View>
        <GestureDetector gesture={panGesture}>
          <View style={styles.handleArea}>
            <View
              style={[
                styles.handle,
                { backgroundColor: colors.textSecondary },
              ]}
            />
          </View>
        </GestureDetector>
        <View style={styles.content}>{retainedChildren.current}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    overflow: "hidden",
    zIndex: 1,
    elevation: 1,
  },
  handleArea: {
    minHeight: nativeLayout.baseSpacing * 16,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: nativeLayout.pillRadius,
    opacity: 0.48,
  },
  content: {
    flexShrink: 1,
    width: "100%",
  },
});
