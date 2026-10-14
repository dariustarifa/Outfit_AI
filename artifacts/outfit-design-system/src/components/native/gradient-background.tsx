import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { useColors } from "../../hooks/use-colors";
import { nativeEffects } from "../../lib/native-theme";

export type GradientBackgroundProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function GradientBackground({
  children,
  style,
}: GradientBackgroundProps) {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const blobRadius = nativeEffects.ambient.diameter / 2;
  const viewBox = useMemo(() => `0 0 ${width} ${height}`, [width, height]);

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.backgroundTop, colors.backgroundBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.backgroundLayer]}
      />
      <Svg
        pointerEvents="none"
        width={width}
        height={height}
        viewBox={viewBox}
        style={[StyleSheet.absoluteFill, styles.backgroundLayer]}
      >
        <Defs>
          <RadialGradient id="outfit-sand" cx="50%" cy="50%" r="50%">
            <Stop
              offset="0%"
              stopColor={colors.blobSand}
              stopOpacity={nativeEffects.ambient.centerOpacity}
            />
            <Stop offset="100%" stopColor={colors.blobSand} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="outfit-gold" cx="50%" cy="50%" r="50%">
            <Stop
              offset="0%"
              stopColor={colors.blobGold}
              stopOpacity={nativeEffects.ambient.centerOpacity}
            />
            <Stop offset="100%" stopColor={colors.blobGold} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="outfit-sage" cx="50%" cy="50%" r="50%">
            <Stop
              offset="0%"
              stopColor={colors.blobSage}
              stopOpacity={nativeEffects.ambient.centerOpacity}
            />
            <Stop offset="100%" stopColor={colors.blobSage} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle
          cx={width * 0.2}
          cy={height * 0.84}
          r={blobRadius}
          fill="url(#outfit-sand)"
        />
        <Circle
          cx={width * 0.82}
          cy={height * 0.84}
          r={blobRadius}
          fill="url(#outfit-gold)"
        />
        <Circle
          cx={width * 0.78}
          cy={height * 0.66}
          r={blobRadius}
          fill="url(#outfit-sage)"
        />
      </Svg>
      <View pointerEvents="box-none" style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  backgroundLayer: {
    zIndex: 0,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
