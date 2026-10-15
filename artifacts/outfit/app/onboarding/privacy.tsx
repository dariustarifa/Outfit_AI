import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/src/theme";

export default function PrivacyPlaceholderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.fill}>
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={[styles.backText, { color: colors.textPrimary }]}>
              Volver
            </Text>
          </Pressable>
          <Text style={[styles.placeholder, { color: colors.textPrimary }]}>
            Próximamente
          </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  backText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 15,
  },
  placeholder: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    fontFamily: "Melodrama_500Medium",
    fontSize: 40,
  },
});
