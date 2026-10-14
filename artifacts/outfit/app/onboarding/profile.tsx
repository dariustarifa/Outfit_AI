import { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Camera, Check, ImagePlus } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { nativeEffects, useColors } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";
import { success } from "@/src/haptics";
import { formatCity, searchCities, type CityResult } from "@/src/services/geocoding";

type SearchState = "idle" | "waiting" | "loading" | "success" | "error";

export default function ProfileOnboardingScreen() {
  const colors = useColors();
  const { setProfile } = useApp();
  const [name, setName] = useState("");
  const [ageText, setAgeText] = useState("");
  const [heightText, setHeightText] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const age = Number(ageText);
  const heightCm = Number(heightText);
  const validAge = Number.isInteger(age) && age >= 14 && age <= 99;
  const validHeight =
    Number.isInteger(heightCm) && heightCm >= 100 && heightCm <= 230;
  const canContinue = Boolean(
    name.trim() &&
      validAge &&
      validHeight &&
      selectedCity &&
      photoUri &&
      accepted &&
      !saving,
  );

  useEffect(() => {
    const query = cityQuery.trim();
    if (selectedCity || query.length < 2) {
      setCityResults([]);
      setSearchState("idle");
      return;
    }

    const controller = new AbortController();
    setSearchState("waiting");
    const timer = setTimeout(() => {
      setSearchState("loading");
      void searchCities(query, controller.signal)
        .then((results) => {
          setCityResults(results);
          setSearchState("success");
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearchState("error");
        });
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cityQuery, selectedCity]);

  const takePhoto = async () => {
    setPhotoError("");
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setCameraDenied(true);
        return;
      }
      setCameraDenied(false);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      setPhotoError("No se pudo abrir la cámara.");
    }
  };

  const chooseFromGallery = async () => {
    setPhotoError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setCameraDenied(false);
      }
    } catch {
      setPhotoError("No se pudo abrir la galería.");
    }
  };

  const openPhotoOptions = () => {
    const options = ["Hacer foto", "Elegir de la galería", "Cancelar"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2 },
        (index) => {
          if (index === 0) void takePhoto();
          if (index === 1) void chooseFromGallery();
        },
      );
      return;
    }
    Alert.alert("Foto de cuerpo entero", undefined, [
      { text: options[0], onPress: () => void takePhoto() },
      { text: options[1], onPress: () => void chooseFromGallery() },
      { text: options[2], style: "cancel" },
    ]);
  };

  const continueOnboarding = async () => {
    if (!canContinue || !selectedCity || !photoUri) return;
    setSaving(true);
    setSaveError("");
    void success();
    try {
      await setProfile({
        name: name.trim(),
        age,
        heightCm,
        bodyPhotoUri: photoUri,
        city: formatCity(selectedCity),
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
        onboardingCompleted: false,
      });
      router.replace("/onboarding/intro" as never);
    } catch {
      setSaveError("No se pudo guardar tu perfil. Inténtalo de nuevo.");
      setSaving(false);
    }
  };

  return (
    <GradientBackground style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.headline, { color: colors.textPrimary }]}>
              Cuéntanos sobre ti
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Nombre</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                returnKeyType="next"
                style={[
                  styles.input,
                  { color: colors.textPrimary, borderColor: nativeEffects.glass.borderColor },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Edad</Text>
              <TextInput
                value={ageText}
                onChangeText={setAgeText}
                placeholder="Tu edad"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={3}
                returnKeyType="next"
                style={[
                  styles.input,
                  { color: colors.textPrimary, borderColor: nativeEffects.glass.borderColor },
                ]}
              />
              {ageText.length > 0 && !validAge ? (
                <Text style={[styles.validation, { color: colors.textSecondary }]}>
                  Debes tener al menos 14 años
                </Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Estatura (cm)
              </Text>
              <TextInput
                value={heightText}
                onChangeText={setHeightText}
                placeholder="Por ejemplo, 170"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={3}
                returnKeyType="next"
                style={[
                  styles.input,
                  { color: colors.textPrimary, borderColor: nativeEffects.glass.borderColor },
                ]}
              />
              {heightText.length > 0 && !validHeight ? (
                <Text style={[styles.validation, { color: colors.textSecondary }]}>
                  La estatura debe estar entre 100 y 230 cm.
                </Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Ciudad</Text>
              <TextInput
                value={cityQuery}
                onChangeText={(value) => {
                  setCityQuery(value);
                  setSelectedCity(null);
                }}
                placeholder="Busca tu ciudad"
                placeholderTextColor={colors.textSecondary}
                autoCorrect={false}
                returnKeyType="search"
                style={[
                  styles.input,
                  { color: colors.textPrimary, borderColor: nativeEffects.glass.borderColor },
                ]}
              />
              {searchState === "waiting" || searchState === "loading" ? (
                <Text style={[styles.searchMessage, { color: colors.textSecondary }]}>
                  Buscando…
                </Text>
              ) : null}
              {searchState === "error" ? (
                <Text style={[styles.searchMessage, { color: colors.textSecondary }]}>
                  No se pudo buscar. Inténtalo de nuevo.
                </Text>
              ) : null}
              {searchState === "success" && cityResults.length === 0 ? (
                <Text style={[styles.searchMessage, { color: colors.textSecondary }]}>
                  No encontramos esa ciudad
                </Text>
              ) : null}
              {cityResults.length > 0 && !selectedCity ? (
                <GlassView
                  borderRadius={16}
                  style={[styles.cityResults, { borderColor: nativeEffects.glass.borderColor }]}
                >
                  <View>
                    {cityResults.map((city, index) => (
                      <Pressable
                        key={`${city.latitude}-${city.longitude}-${index}`}
                        accessibilityRole="button"
                        onPress={() => {
                          setSelectedCity(city);
                          setCityQuery(formatCity(city));
                          setCityResults([]);
                          setSearchState("idle");
                        }}
                        style={[
                          styles.cityResult,
                          index < cityResults.length - 1
                            ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                            : null,
                        ]}
                      >
                        <Text style={[styles.cityResultText, { color: colors.textPrimary }]}>
                          {formatCity(city)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </GlassView>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Foto de cuerpo entero
              </Text>
              {photoUri ? (
                <View style={styles.photoPreviewWrap}>
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                    accessibilityLabel="Vista previa de la foto de cuerpo entero"
                  />
                </View>
              ) : null}
              <GlassView
                borderRadius={16}
                style={[styles.photoActions, { borderColor: nativeEffects.glass.borderColor }]}
              >
                <View style={styles.photoActionsRow}>
                  {photoUri ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={openPhotoOptions}
                      style={styles.changePhotoButton}
                    >
                      <Text style={[styles.changePhotoText, { color: colors.textPrimary }]}>
                        Cambiar foto
                      </Text>
                    </Pressable>
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void takePhoto()}
                        style={styles.photoActionButton}
                      >
                        <Camera size={18} color={colors.textPrimary} />
                        <Text style={[styles.photoActionText, { color: colors.textPrimary }]}>
                          Hacer foto
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void chooseFromGallery()}
                        style={styles.photoActionButton}
                      >
                        <ImagePlus size={18} color={colors.textPrimary} />
                        <Text style={[styles.photoActionText, { color: colors.textPrimary }]}>
                          Elegir de la galería
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </GlassView>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                De pie, cuerpo entero y con buena luz.
              </Text>
              {cameraDenied ? (
                <Text style={[styles.validation, { color: colors.textSecondary }]}>
                  Necesitamos acceso a la cámara. Puedes elegir una foto de tu galería.
                </Text>
              ) : null}
              {photoError ? (
                <Text style={[styles.validation, { color: colors.textSecondary }]}>
                  {photoError}
                </Text>
              ) : null}
            </View>

            <View style={styles.consentSection}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: accepted }}
                onPress={() => setAccepted((value) => !value)}
                style={styles.consentRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: colors.textSecondary },
                    accepted ? { backgroundColor: colors.textPrimary } : null,
                  ]}
                >
                  {accepted ? <Check size={15} color={colors.backgroundTop} /> : null}
                </View>
                <Text style={[styles.consentText, { color: colors.textPrimary }]}>
                  Acepto que la app use mis fotos y datos para recomendarme looks.
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push("/onboarding/privacy" as never)}
                style={styles.privacyLink}
              >
                <Text style={[styles.privacyText, { color: colors.gold }]}>
                  Política de privacidad
                </Text>
              </Pressable>
            </View>

            {saveError ? (
              <Text style={[styles.saveError, { color: colors.textSecondary }]}>
                {saveError}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canContinue }}
              disabled={!canContinue}
              onPress={() => void continueOnboarding()}
              style={[
                styles.continueButton,
                {
                  backgroundColor: colors.textPrimary,
                  opacity: canContinue ? 1 : 0.4,
                },
              ]}
            >
              <Text style={[styles.continueText, { color: colors.backgroundTop }]}>
                {saving ? "Guardando…" : "Continuar"}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  headline: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 40,
    lineHeight: 46,
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 15,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 16,
    fontFamily: "Satoshi_400Regular",
    fontSize: 16,
  },
  validation: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 13,
    marginTop: 6,
  },
  searchMessage: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 14,
    marginTop: 8,
  },
  cityResults: {
    marginTop: 8,
    overflow: "hidden",
  },
  cityResult: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cityResultText: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
  },
  photoPreviewWrap: {
    width: "70%",
    aspectRatio: 3 / 4,
    alignSelf: "center",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: nativeEffects.glass.borderColor,
    marginBottom: 12,
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  photoActions: {
    height: 56,
  },
  photoActionsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  photoActionButton: {
    flex: 1,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoActionText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 14,
  },
  changePhotoButton: {
    flex: 1,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 14,
  },
  hint: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 13,
    marginTop: 8,
  },
  consentSection: {
    marginBottom: 24,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  consentText: {
    flex: 1,
    fontFamily: "Satoshi_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  privacyLink: {
    alignSelf: "flex-start",
    marginLeft: 34,
    marginTop: 8,
  },
  privacyText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  saveError: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
  },
  continueButton: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 17,
  },
});
