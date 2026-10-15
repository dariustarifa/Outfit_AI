import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { HomeScreen } from "../index";
import { markTabSwitchFirstFrame } from "@/src/tab-navigation";

export default function HomeTabRoute() {
  useFocusEffect(
    useCallback(() => {
      markTabSwitchFirstFrame("home");
    }, []),
  );
  return <HomeScreen />;
}
