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
  const glass = nativeEffects.glass;
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return (
      <NativeGlass
        testID={testID}
        glassEffectStyle="clear"
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
          shadowColor: glass.shadowColor,
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
          intensity={glass.blurIntensity}
          tint={glass.tint}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[glass.gradientStart, glass.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.borderLayer,
            { borderRadius, borderColor: glass.borderColor },
          ]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[glass.highlightStart, glass.highlightEnd]}
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
    borderColor: "rgba(255,255,255,0.75)",
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
