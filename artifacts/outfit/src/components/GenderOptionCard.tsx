import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Check } from "lucide-react-native";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { nativeLayout } from "../theme";
import { useColors } from "../theme";
import { selection } from "../haptics";
import { WhiteChip } from "./WhiteChip";
import type { Gender } from "../types";

export const genderOptions: readonly { value: Gender; label: string }[] = [
  { value: "male", label: "Hombre" },
  { value: "female", label: "Mujer" },
  { value: "nonbinary", label: "No binario" },
  { value: "other", label: "Otro" },
];

export function genderLabel(gender: Gender): string {
  return genderOptions.find((option) => option.value === gender)?.label ?? "";
}

interface GenderOptionCardProps {
  gender: Gender;
  label: string;
  selected: boolean;
  onSelect: (gender: Gender) => void;
  testID?: string;
  entranceDelay?: number;
}

export function GenderOptionCard({
  gender,
  label,
  selected,
  onSelect,
  testID,
  entranceDelay = 0,
}: GenderOptionCardProps) {
  const colors = useColors();
  const selectionProgress = useSharedValue(selected ? 1 : 0);
  const selectedSurfaceStyle = useAnimatedStyle(() => ({
    opacity: selectionProgress.value,
    transform: [{ scale: 0.98 + selectionProgress.value * 0.02 }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: selectionProgress.value,
    transform: [{ scale: 0.85 + selectionProgress.value * 0.15 }],
  }));

  useEffect(() => {
    selectionProgress.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected, selectionProgress]);

  return (
    <Animated.View entering={FadeInDown.duration(240).delay(entranceDelay)}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        testID={testID}
        onPress={() => {
          void selection();
          onSelect(gender);
        }}
      >
        <GlassView
          borderRadius={nativeLayout.cardRadius}
          style={styles.card}
        >
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, selectedSurfaceStyle]}
          >
            <WhiteChip style={styles.selectedSurface}>
              <View style={[styles.goldBorder, { borderColor: colors.gold }]} />
            </WhiteChip>
          </Animated.View>
          <View style={styles.cardContent}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {label}
            </Text>
            <Animated.View style={checkStyle}>
              <Check size={20} color={colors.gold} strokeWidth={2.2} />
            </Animated.View>
          </View>
        </GlassView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 64,
    overflow: "hidden",
    justifyContent: "center",
  },
  selectedSurface: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: nativeLayout.cardRadius,
  },
  goldBorder: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1.5,
    borderRadius: nativeLayout.cardRadius,
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 18,
  },
});
