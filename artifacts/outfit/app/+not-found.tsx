import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nativeLayout } from "@/src/theme";
import { useTheme } from "@/src/theme";

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: "No encontrado" }} />
      <View style={styles.root}>
        <View
          style={[
            styles.container,
            {
              paddingHorizontal: nativeLayout.screenHorizontalPadding,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Satoshi_500Medium" },
            ]}
          >
            Esta pantalla no existe.
          </Text>

          <Link href="/" style={styles.link}>
            <Text
              style={[
                styles.linkText,
                { color: colors.primary, fontFamily: "Satoshi_500Medium" },
              ]}
            >
              Volver a Outfit
            </Text>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
