import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@workspace/outfit-design-system/hooks/use-colors";
import { nativeLayout } from "@/src/theme";

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: "No encontrado" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: nativeLayout.screenHorizontalPadding,
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
