import { Redirect } from "expo-router";
import { StyleSheet, View } from "react-native";
import { HomeControls } from "@/src/components/HomeControls";
import { ProfileScreen } from "@/src/components/ProfileScreen";
import { useApp } from "@/src/context/AppContext";
import { getStartupScreen } from "@/src/onboarding-progress";

export default function ProfileRoute() {
  const { loading, profile } = useApp();
  const startupScreen = getStartupScreen(loading, profile);

  if (startupScreen !== "home") return <Redirect href="/" />;

  return (
    <View style={styles.screen}>
      <ProfileScreen />
      <HomeControls />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: "relative",
  },
});
