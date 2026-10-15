import type { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  GlassView as NativeGlass,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import {
  useColors,
  useDesignColorScheme,
} from "../../hooks/use-colors";
import { useGlassEffectLevel } from "../../hooks/use-glass-effect";
import { nativeEffects, nativeLayout } from "../../lib/native-theme";

export type GlassViewProps = {
  children: ReactNode;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function GlassView({
  children,
  borderRadius = nativeLayout.cardRadius,
  style,
  testID,
}: GlassViewProps) {
  const colors = useColors();
  const colorScheme = useDesignColorScheme();
  const isDark = colorScheme === "dark";
  const effectLevel = useGlassEffectLevel();
  const glass = nativeEffects.glass;
  const blurIntensity = interpolate(
    glass.liquidBlurIntensity,
    glass.frostedBlurIntensity,
    effectLevel,
  );
  const gradientStart = interpolateRgbaAlpha(
    glass.liquidGradientStart,
    glass.frostedGradientStart,
    effectLevel,
  );
  const gradientEnd = interpolateRgbaAlpha(
    glass.liquidGradientEnd,
    glass.frostedGradientEnd,
    effectLevel,
  );
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return (
      <NativeGlass
        testID={testID}
        glassEffectStyle={{
          style:
            effectLevel >= glass.nativeFrostedThreshold ? "regular" : "clear",
          animate: true,
          animationDuration: glass.transitionDurationSeconds,
        }}
        colorScheme={isDark ? "dark" : "light"}
        tintColor={rgbaFromHex(
          colors.backgroundTop,
          glass.nativeTintMaxOpacity * effectLevel,
        )}
        style={[style, { borderRadius, overflow: "hidden" }]}
      >
        {children}
      </NativeGlass>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.shadow,
        {
          borderRadius,
          shadowColor: colors.textPrimary,
          shadowOpacity: glass.shadowOpacity,
          shadowRadius: glass.shadowRadius,
          shadowOffset: { width: 0, height: glass.shadowOffsetY },
        },
        style,
      ]}
    >
      <View
        style={[
          styles.clip,
          { borderRadius },
        ]}
      >
        <BlurView
          pointerEvents="none"
          intensity={blurIntensity}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[
            isDark ? halfAlpha(gradientStart) : gradientStart,
            isDark ? halfAlpha(gradientEnd) : gradientEnd,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.borderLayer,
            { borderRadius, borderColor: colors.glassBorder },
          ]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[
            isDark ? halfAlpha(glass.highlightStart) : glass.highlightStart,
            isDark ? halfAlpha(glass.highlightEnd) : glass.highlightEnd,
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.topHighlight}
        />
        <View
          style={styles.content}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function interpolateRgbaAlpha(
  startColor: string,
  endColor: string,
  progress: number,
) {
  const startAlpha = Number.parseFloat(startColor.match(/[\d.]+\)$/)?.[0] ?? "0");
  const endAlpha = Number.parseFloat(endColor.match(/[\d.]+\)$/)?.[0] ?? "0");
  return startColor.replace(
    /[\d.]+\)$/,
    `${interpolate(startAlpha, endAlpha, progress)})`,
  );
}

function rgbaFromHex(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function halfAlpha(color: string): string {
  return color.replace(
    /rgba\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/,
    (_match, red: string, green: string, blue: string, alpha: string) =>
      `rgba(${red},${green},${blue},${Number(alpha) / 2})`,
  );
}

const styles = StyleSheet.create({
  shadow: {
    backgroundColor: "transparent",
  },
  clip: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  borderLayer: {
    borderWidth: 1,
    borderColor: "transparent",
  },
  topHighlight: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: 1,
    zIndex: 2,
  },
  content: {
    flex: 1,
    zIndex: 3,
    backgroundColor: "transparent",
  },
});
