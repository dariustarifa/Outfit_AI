import { useCallback } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { ProfileTabsScreen } from "../profile";
import { markTabSwitchFirstFrame } from "@/src/tab-navigation";

export default function ProfileTabRoute() {
  const focusProgress = useSharedValue(0);
  const focusStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
  }));

  useFocusEffect(
    useCallback(() => {
      focusProgress.value = 0;
      focusProgress.value = withTiming(1, { duration: 140 });
      markTabSwitchFirstFrame("profile");
    }, [focusProgress]),
  );

  return (
    <Animated.View style={[{ flex: 1 }, focusStyle]}>
      <ProfileTabsScreen />
    </Animated.View>
  );
}
