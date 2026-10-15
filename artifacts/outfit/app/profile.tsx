import { Redirect } from "expo-router";
import { ProfileScreen } from "@/src/components/ProfileScreen";
import { useApp } from "@/src/context/AppContext";
import { getStartupScreen } from "@/src/onboarding-progress";

export default function ProfileRoute() {
  return <Redirect href="/profile-tab" />;
}

export function ProfileTabsScreen() {
  const { loading, profile } = useApp();
  const startupScreen = getStartupScreen(loading, profile);

  if (startupScreen !== "home") return <Redirect href="/home" />;

  return <ProfileScreen />;
}
