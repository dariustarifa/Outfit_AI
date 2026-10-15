import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
        lazy: false,
        freezeOnBlur: true,
        animation: "none",
      }}
    />
  );
}
