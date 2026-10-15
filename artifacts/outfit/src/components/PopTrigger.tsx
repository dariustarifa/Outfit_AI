import { memo, useCallback, useRef, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { usePop, type PopContent, type PopSize } from "./PopHost";

interface PopTriggerProps {
  id: string;
  image: string;
  fullImage?: string;
  radius: number;
  size: PopSize;
  content: PopContent;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  testID: string;
}

function PopTriggerComponent({
  id,
  image,
  fullImage,
  radius,
  size,
  content,
  children,
  style,
  pressedStyle,
  accessibilityLabel,
  testID,
}: PopTriggerProps) {
  const { activeId, open } = usePop();
  const targetRef = useRef<View>(null);
  const layoutRef = useRef({ width: 0, height: 0 });
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const openFromFallback = useCallback(() => {
    const sourceWidth = layoutRef.current.width || screenWidth;
    const sourceHeight = layoutRef.current.height || screenHeight;
    const width = Math.max(1, sourceWidth * 0.8);
    const height = Math.max(1, sourceHeight * 0.8);
    open({
      id,
      rect: {
        x: (screenWidth - width) / 2,
        y: (screenHeight - height) / 2,
        width,
        height,
      },
      radius,
      size,
      image,
      content,
    });
  }, [content, id, image, open, radius, screenHeight, screenWidth, size]);

  const handlePress = useCallback(() => {
    void Image.prefetch(fullImage ?? image).catch(() => undefined);
    const target = targetRef.current;
    if (!target) {
      openFromFallback();
      return;
    }
    target.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        openFromFallback();
        return;
      }
      open({
        id,
        rect: { x, y, width, height },
        radius,
        size,
        image,
        content,
      });
    });
  }, [content, fullImage, id, image, open, openFromFallback, radius, size]);

  const isActive = activeId === id;

  return (
    <View
      ref={targetRef}
      collapsable={false}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        layoutRef.current = { width, height };
      }}
      style={style}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isActive }}
        testID={testID}
        disabled={isActive}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && pressedStyle,
          isActive && styles.hidden,
        ]}
      >
        {children}
      </Pressable>
    </View>
  );
}

export const PopTrigger = memo(PopTriggerComponent);

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
});
