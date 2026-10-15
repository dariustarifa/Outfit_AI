import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { ProfileTabsScreen } from "../profile";
import { markTabSwitchFirstFrame } from "@/src/tab-navigation";

export default function ProfileTabRoute() {
  useFocusEffect(
    useCallback(() => {
      markTabSwitchFirstFrame("profile");
    }, []),
  );

  return <ProfileTabsScreen />;
}
