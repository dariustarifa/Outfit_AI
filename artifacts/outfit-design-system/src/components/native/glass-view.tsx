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
  const radiusStyle = { borderRadius };

  return (
    <View
      testID={testID}
      style={[
        styles.shadow,
        radiusStyle,
        {
          shadowColor: glass.shadowColor,
          shadowOpacity: glass.shadowOpacity,
          shadowRadius: glass.shadowRadius,
          shadowOffset: { width: 0, height: glass.shadowOffsetY },
          elevation: 4,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.clip,
          radiusStyle,
          { borderColor: glass.borderColor },
        ]}
      >
        {Platform.OS === "android" ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: glass.androidFallback },
            ]}
          />
        ) : (
          <BlurView
            pointerEvents="none"
            intensity={glass.blurIntensity}
            tint={glass.tint}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          pointerEvents="none"
          colors={[glass.gradientStart, glass.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
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
    borderWidth: 1,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    zIndex: 1,
    backgroundColor: "transparent",
  },
});
