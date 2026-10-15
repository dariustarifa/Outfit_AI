import { memo, type ReactNode } from "react";
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
import { useGlassLevel } from "../../hooks/use-glass-effect";
import { nativeEffects, nativeLayout, nativeTheme } from "../../lib/native-theme";

type ColorScheme = "light" | "dark";

export type GlassViewProps = {
  children: ReactNode;
  borderRadius?: number;
  colorScheme?: ColorScheme;
  edge?: boolean;
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export const GlassView = memo(function GlassView({
  children,
  borderRadius = nativeLayout.cardRadius,
  colorScheme: colorSchemeOverride,
  edge = true,
  shadow = false,
  style,
  testID,
}: GlassViewProps) {
  const sharedColors = useColors();
  const sharedColorScheme = useDesignColorScheme();
  const colorScheme = colorSchemeOverride ?? sharedColorScheme;
  const colors =
    colorScheme === sharedColorScheme
      ? sharedColors
      : nativeTheme[colorScheme];
  const isDark = colorScheme === "dark";
  const glassLevel = useGlassLevel();
  const glass = nativeEffects.glass;
  const preset = glass.levels[glassLevel][isDark ? "dark" : "light"];
  const nativeGlass =
    Platform.OS === "ios" &&
    glassLevel !== "matte" &&
    isLiquidGlassAvailable();
  const shadowPreset = shadow
    ? glass.shadows[isDark ? "dark" : "light"]
    : null;
  const glassKey = `${glassLevel}-${colorScheme}`;

  return (
    <View
      key={glassKey}
      testID={testID}
      style={[
        styles.outer,
        shadowPreset
          ? {
              shadowColor: shadowPreset.color,
              shadowOpacity: shadowPreset.opacity,
              shadowRadius: shadowPreset.radius,
              shadowOffset: { width: 0, height: shadowPreset.offsetY },
              elevation: shadowPreset.elevation,
            }
          : null,
        style,
        { borderRadius, overflow: "visible" },
      ]}
    >
      <View
        style={[
          styles.clip,
          { borderRadius, overflow: "hidden" },
        ]}
      >
        {nativeGlass ? (
          <NativeGlass
            glassEffectStyle={{
              style: glassLevel === "clear" ? "clear" : "regular",
              animate: true,
              animationDuration: glass.transitionDurationSeconds,
            }}
            colorScheme={colorScheme}
            style={styles.content}
          >
            {children}
          </NativeGlass>
        ) : (
          <>
            <BlurView
              pointerEvents="none"
              intensity={preset.blurIntensity}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              pointerEvents="none"
              colors={[preset.gradientStart, preset.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.content}>{children}</View>
          </>
        )}
      </View>
      {edge ? (
        <>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.outerEdge,
              { borderRadius, borderColor: colors.edgeShade },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.innerEdge,
              {
                borderRadius: Math.max(0, borderRadius - 1),
                borderColor: colors.glassBorder,
              },
            ]}
          />
        </>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "transparent",
  },
  clip: {
    flex: 1,
    position: "relative",
  },
  outerEdge: {
    borderWidth: 1,
  },
  innerEdge: {
    margin: 1,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    zIndex: 3,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
});
