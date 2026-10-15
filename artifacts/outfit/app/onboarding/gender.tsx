import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/src/theme";
import { nativeLayout } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";
import { success } from "@/src/haptics";
import type { Gender } from "@/src/types";
import { genderOptions, GenderOptionCard } from "@/src/components/GenderOptionCard";

export default function GenderOnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, loading, updateProfile } = useApp();
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (loading) return null;
  if (!profile) return <Redirect href="/" />;

  const continueToNextScreen = async () => {
    if (!selectedGender || saving) return;
    setSaving(true);
    setError("");
    try {
      const saved = await updateProfile({ gender: selectedGender });
      await success();
      router.replace(saved.onboardingCompleted ? "/" : "/onboarding/intro");
    } catch {
      setError("No pudimos guardar tu selección. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop:
            Platform.OS === "web"
              ? Math.max(insets.top, 67) + 16
              : insets.top + 16,
          paddingBottom:
            Platform.OS === "web"
              ? Math.max(insets.bottom, 34) + 24
              : insets.bottom + 24,
          paddingHorizontal: nativeLayout.screenHorizontalPadding,
        },
      ]}
    >
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(240)}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            ¿Cómo te identificas?
          </Text>
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.duration(240).delay(70)}
          style={[styles.subtitle, { color: colors.textSecondary }]}
        >
          Lo usamos solo para personalizar tus recomendaciones.
        </Animated.Text>
        <View style={styles.options}>
          {genderOptions.map((option, index) => (
            <GenderOptionCard
              key={option.value}
              gender={option.value}
              label={option.label}
              selected={selectedGender === option.value}
              onSelect={setSelectedGender}
              testID={`gender-option-${option.value}`}
              entranceDelay={150 + index * 65}
            />
          ))}
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>
            {error}
          </Text>
        ) : null}
      </View>

      <Animated.View entering={FadeInDown.duration(240).delay(430)}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: !selectedGender || saving,
          }}
          testID="continue-gender"
          disabled={!selectedGender || saving}
          onPress={() => void continueToNextScreen()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary },
            (!selectedGender || saving) && styles.disabledButton,
            pressed && selectedGender && !saving && styles.pressed,
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
            {saving ? "Guardando…" : "Continuar"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "space-between",
  },
  content: {
    flexShrink: 1,
  },
  title: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 40,
    lineHeight: 48,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontFamily: "Satoshi_400Regular",
    fontSize: 16,
    lineHeight: 23,
  },
  options: {
    gap: 12,
  },
  error: {
    marginTop: 12,
    fontFamily: "Satoshi_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: nativeLayout.primaryButtonHeight,
    borderRadius: nativeLayout.pillRadius,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: nativeLayout.baseSpacing * 4,
  },
  primaryButtonText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
