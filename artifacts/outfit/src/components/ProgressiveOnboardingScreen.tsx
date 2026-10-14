import { useEffect, useRef, useState } from "react";
import {
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
import Animated, { FadeInDown } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ImagePlus,
  MapPin,
  Ruler,
  UserRound,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";
import { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";
import { useColors } from "@workspace/outfit-design-system/hooks/use-colors";
import { useApp } from "../context/AppContext";
import type { Profile } from "../types";
import { success } from "../haptics";
import { formatCity, searchCities, type CityResult } from "../services/geocoding";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type SearchState = "idle" | "waiting" | "loading" | "success" | "error";

interface ProfileForm {
  name: string;
  preferredName: string;
  age: string;
  heightCm: string;
  city: string;
  bodyPhotoUri: string;
  photoConsent: boolean;
}

const STEP_COUNT = 7;

function suggestedName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

function formFromProfile(profile: Profile | null): ProfileForm {
  return {
    name: profile?.name ?? "",
    preferredName: profile?.preferredName ?? "",
    age: profile && profile.age > 0 ? String(profile.age) : "",
    heightCm:
      profile && profile.heightCm > 0 ? String(profile.heightCm) : "",
    city: profile?.city ?? "",
    bodyPhotoUri: profile?.bodyPhotoUri ?? "",
    photoConsent: profile?.photoConsent ?? false,
  };
}

function cityFromProfile(profile: Profile | null): CityResult | null {
  if (
    !profile?.city.trim() ||
    typeof profile.latitude !== "number" ||
    typeof profile.longitude !== "number"
  ) {
    return null;
  }
  return {
    name: profile.city,
    latitude: profile.latitude,
    longitude: profile.longitude,
  };
}

function isProfileReady(profile: Profile): boolean {
  return Boolean(
    profile.name.trim() &&
      profile.preferredName?.trim() &&
      Number.isInteger(profile.age) &&
      profile.age >= 14 &&
      profile.age <= 99 &&
      Number.isInteger(profile.heightCm) &&
      profile.heightCm >= 100 &&
      profile.heightCm <= 230 &&
      profile.city.trim() &&
      Number.isFinite(profile.latitude) &&
      Number.isFinite(profile.longitude) &&
      profile.photoConsent &&
      profile.bodyPhotoUri.trim(),
  );
}

function initialStep(profile: Profile | null): Step {
  if (!profile || !profile.name.trim()) return 0;
  if (!profile.preferredName?.trim()) return 1;
  if (!Number.isInteger(profile.age) || profile.age < 14 || profile.age > 99) {
    return 2;
  }
  if (
    !Number.isInteger(profile.heightCm) ||
    profile.heightCm < 100 ||
    profile.heightCm > 230
  ) {
    return 3;
  }
  if (
    !profile.city.trim() ||
    !Number.isFinite(profile.latitude) ||
    !Number.isFinite(profile.longitude)
  ) {
    return 4;
  }
  if (!profile.photoConsent) return 5;
  return 6;
}

export default function ProgressiveOnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, loading, setProfile } = useApp();
  const initialized = useRef(false);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    preferredName: "",
    age: "",
    heightCm: "",
    city: "",
    bodyPhotoUri: "",
    photoConsent: false,
  });
  const [step, setStep] = useState<Step>(0);
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] =
    ImagePicker.useMediaLibraryPermissions();

  useEffect(() => {
    if (loading || initialized.current) return;
    initialized.current = true;
    setForm(formFromProfile(profile));
    setSelectedCity(cityFromProfile(profile));
    if (profile && !profile.onboardingCompleted && isProfileReady(profile)) {
      router.replace("/onboarding/intro" as never);
      return;
    }
    setStep(initialStep(profile));
  }, [loading, profile]);

  useEffect(() => {
    const query = form.city.trim();
    if (step !== 4 || selectedCity || query.length < 2) {
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
  }, [form.city, selectedCity, step]);

  const updateForm = (field: keyof ProfileForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
  };

  const validateStep = (): string | null => {
    if (step === 0 && !form.name.trim()) {
      return "Escribe tu nombre para continuar.";
    }
    if (step === 2) {
      const age = Number(form.age);
      if (!Number.isInteger(age) || age < 14 || age > 99) {
        return "Debes tener al menos 14 años";
      }
    }
    if (step === 3) {
      const height = Number(form.heightCm);
      if (!Number.isInteger(height) || height < 100 || height > 230) {
        return "La estatura debe estar entre 100 y 230 cm.";
      }
    }
    if (step === 4 && !selectedCity) {
      return "Selecciona una ciudad de los resultados para vincular tu zona horaria.";
    }
    if (step === 5 && !form.photoConsent) {
      return "Acepta el uso de tu imagen para poder continuar.";
    }
    if (step === 6 && !form.bodyPhotoUri) {
      return "Elige una foto de cuerpo entero para continuar.";
    }
    return null;
  };

  const saveStep = async () => {
    if (saving) return;
    const validationMessage = validateStep();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    const suggested = suggestedName(form.name);
    const effectivePreferredName =
      form.preferredName.trim() || suggested;
    const nextProfile: Profile = {
      name: form.name.trim() || profile?.name || "",
      preferredName: effectivePreferredName,
      age: Number(form.age) || profile?.age || 0,
      heightCm: Number(form.heightCm) || profile?.heightCm || 0,
      bodyPhotoUri: form.bodyPhotoUri || profile?.bodyPhotoUri || "",
      city: selectedCity ? formatCity(selectedCity) : form.city.trim(),
      latitude: selectedCity?.latitude ?? profile?.latitude,
      longitude: selectedCity?.longitude ?? profile?.longitude,
      photoConsent: form.photoConsent || profile?.photoConsent || false,
      onboardingCompleted: false,
    };

    setSaving(true);
    setMessage("");
    try {
      const saved = await setProfile(nextProfile);
      if (saved) {
        setForm((current) => ({
          ...current,
          preferredName: effectivePreferredName,
          bodyPhotoUri: saved.bodyPhotoUri,
        }));
      }

      if (step === 6) {
        void success();
        router.replace("/onboarding/intro" as never);
      } else {
        setStep((current) => Math.min(current + 1, STEP_COUNT - 1) as Step);
      }
    } catch {
      setMessage(
        step === 6
          ? "No pudimos guardar la foto en este dispositivo. Vuelve a elegirla e inténtalo otra vez."
          : "No se pudo guardar este paso. Inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step === 0 || saving) return;
    setMessage("");
    setStep((current) => Math.max(current - 1, 0) as Step);
  };

  const choosePhoto = async () => {
    setMessage("");
    try {
      if (Platform.OS !== "web" && !mediaPermission?.granted) {
        const permission = await requestMediaPermission();
        if (!permission.granted) {
          setMessage(
            "Necesitamos permiso para acceder a tus fotos. También puedes hacer una foto.",
          );
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.82,
      });
      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (!uri) {
        setMessage("No pudimos leer esa foto. Prueba a elegir otra.");
        return;
      }
      updateForm("bodyPhotoUri", uri);
    } catch {
      setMessage("No se pudo abrir la galería. Inténtalo de nuevo.");
    }
  };

  const takePhoto = async () => {
    setMessage("");
    try {
      const permission =
        cameraPermission?.granted
          ? cameraPermission
          : await requestCameraPermission();
      if (!permission.granted) {
        setMessage(
          "Necesitamos acceso a la cámara. Puedes elegir una foto de tu galería.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.82,
      });
      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (!uri) {
        setMessage("No pudimos leer esa foto. Prueba a hacer otra.");
        return;
      }
      updateForm("bodyPhotoUri", uri);
    } catch {
      setMessage(
        "No se pudo abrir la cámara. Puedes elegir una foto de tu galería.",
      );
    }
  };

  const suggested = suggestedName(form.name);
  const titles = [
    "Dinos cómo te llamas",
    "¿Cómo quieres que te llamemos?",
    "¿Qué edad tienes?",
    "¿Cuánto mides?",
    "¿En qué ciudad estás?",
    "Ya casi está listo",
    "Elige tu foto",
  ] as const;
  const descriptions = [
    "Empecemos por tu nombre.",
    suggested
      ? `Te proponemos «${suggested}», a partir de tu nombre. Puedes cambiarlo o dejarlo en blanco.`
      : "Puedes elegir un nombre corto o dejar que usemos el primero que escribiste.",
    "Solo necesitamos tu edad para personalizar las recomendaciones.",
    "Usaremos tu estatura como referencia para tus looks.",
    "Elige tu ciudad para vincular tu zona horaria y el tiempo local.",
    "Solo falta confirmar cómo usaremos tu imagen.",
    "Una foto de cuerpo entero nos ayudará a recomendarte looks.",
  ] as const;

  const contentTop =
    Platform.OS === "web"
      ? Math.max(insets.top, 24) + nativeLayout.baseSpacing * 4
      : insets.top + nativeLayout.baseSpacing * 4;
  const contentBottom =
    Platform.OS === "web"
      ? Math.max(insets.bottom, 16) + nativeLayout.baseSpacing * 4
      : insets.bottom + nativeLayout.baseSpacing * 4;

  if (loading || !initialized.current) {
    return (
      <GradientBackground style={styles.fill}>
        <View style={styles.fill} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "web" ? undefined : "padding"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: contentTop,
              paddingBottom: contentBottom,
              paddingHorizontal: nativeLayout.screenHorizontalPadding,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            {step > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver al paso anterior"
                onPress={goBack}
                hitSlop={10}
                style={styles.backButton}
              >
                <ArrowLeft size={21} color={colors.textPrimary} />
              </Pressable>
            ) : (
              <View style={styles.backButton} />
            )}
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              TU PERFIL
            </Text>
            <View style={styles.backButton} />
          </View>

          <View
            accessibilityLabel={`Paso ${step + 1} de ${STEP_COUNT}`}
            accessibilityRole="progressbar"
            style={styles.progressRow}
          >
            {Array.from({ length: STEP_COUNT }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.progressSegment,
                  {
                    backgroundColor:
                      index <= step ? colors.primary : colors.border,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.stepCount, { color: colors.textSecondary }]}>
            PASO {step + 1} DE {STEP_COUNT}
          </Text>
          <Animated.Text
            key={`title-${step}`}
            entering={FadeInDown.duration(250)}
            style={[styles.title, { color: colors.textPrimary }]}
          >
            {titles[step]}
          </Animated.Text>
          <Animated.Text
            key={`subtitle-${step}`}
            entering={FadeInDown.duration(250).delay(80)}
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            {descriptions[step]}
          </Animated.Text>

          <Animated.View
            key={`content-${step}`}
            entering={FadeInDown.duration(250).delay(120)}
          >
            <GlassView style={styles.formCard}>
              <View style={styles.formContent}>
              {step === 0 ? (
                <FormField
                  label="TU NOMBRE"
                  icon={<UserRound size={19} color={colors.textSecondary} />}
                  value={form.name}
                  placeholder="Por ejemplo, Alex"
                  onChangeText={(value) => updateForm("name", value)}
                  autoCapitalize="words"
                  returnKeyType="next"
                  accessibilityLabel="Nombre"
                  colors={colors}
                />
              ) : null}

              {step === 1 ? (
                <FormField
                  label="NOMBRE PREFERIDO (OPCIONAL)"
                  icon={<UserRound size={19} color={colors.textSecondary} />}
                  value={form.preferredName}
                  placeholder={suggested || "Cómo quieres que te llamemos"}
                  onChangeText={(value) => updateForm("preferredName", value)}
                  autoCapitalize="words"
                  returnKeyType="next"
                  accessibilityLabel="Nombre preferido, opcional"
                  colors={colors}
                />
              ) : null}

              {step === 2 ? (
                <FormField
                  label="EDAD"
                  value={form.age}
                  placeholder="Tu edad"
                  onChangeText={(value) =>
                    updateForm("age", value.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  returnKeyType="done"
                  accessibilityLabel="Edad"
                  colors={colors}
                />
              ) : null}

              {step === 3 ? (
                <FormField
                  label="ESTATURA EN CENTÍMETROS"
                  icon={<Ruler size={19} color={colors.textSecondary} />}
                  value={form.heightCm}
                  placeholder="Por ejemplo, 170"
                  onChangeText={(value) =>
                    updateForm("heightCm", value.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  returnKeyType="done"
                  accessibilityLabel="Estatura en centímetros"
                  colors={colors}
                />
              ) : null}

              {step === 4 ? (
                <View>
                  <FormField
                    label="CIUDAD"
                    icon={<MapPin size={19} color={colors.textSecondary} />}
                    value={form.city}
                    placeholder="Por ejemplo, Madrid"
                    onChangeText={(value) => {
                      setSelectedCity(null);
                      updateForm("city", value);
                    }}
                    autoCapitalize="words"
                    returnKeyType="search"
                    accessibilityLabel="Ciudad"
                    colors={colors}
                  />
                  {searchState === "waiting" || searchState === "loading" ? (
                    <Text
                      style={[
                        styles.searchMessage,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Buscando…
                    </Text>
                  ) : null}
                  {searchState === "error" ? (
                    <Text
                      style={[
                        styles.searchMessage,
                        { color: colors.destructive },
                      ]}
                    >
                      No se pudo buscar. Inténtalo de nuevo.
                    </Text>
                  ) : null}
                  {searchState === "success" && cityResults.length === 0 ? (
                    <Text
                      style={[
                        styles.searchMessage,
                        { color: colors.textSecondary },
                      ]}
                    >
                      No encontramos esa ciudad
                    </Text>
                  ) : null}
                  {cityResults.length > 0 ? (
                    <GlassView style={styles.cityResults}>
                      {cityResults.map((city, index) => (
                        <Pressable
                          key={`${city.latitude}-${city.longitude}-${index}`}
                          accessibilityRole="button"
                          onPress={() => {
                            setSelectedCity(city);
                            updateForm("city", formatCity(city));
                            setCityResults([]);
                            setSearchState("idle");
                          }}
                          style={[
                            styles.cityResult,
                            index < cityResults.length - 1 && {
                              borderBottomColor: colors.border,
                              borderBottomWidth: StyleSheet.hairlineWidth,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cityResultText,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {formatCity(city)}
                          </Text>
                        </Pressable>
                      ))}
                    </GlassView>
                  ) : null}
                </View>
              ) : null}

              {step === 5 ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: form.photoConsent }}
                  onPress={() =>
                    updateForm("photoConsent", !form.photoConsent)
                  }
                  style={styles.consentRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: colors.textSecondary,
                        backgroundColor: form.photoConsent
                          ? colors.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {form.photoConsent ? (
                      <Check size={15} color={colors.primaryForeground} />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.consentText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Acepto que Outfit use mi imagen para recomendarme looks.
                  </Text>
                </Pressable>
              ) : null}

              {step === 6 ? (
                <View style={styles.photoSection}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    FOTO DE CUERPO ENTERO
                  </Text>
                  {form.bodyPhotoUri ? (
                    <View
                      style={[
                        styles.photoFrame,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Image
                        source={{ uri: form.bodyPhotoUri }}
                        style={styles.photo}
                        resizeMode="cover"
                        accessibilityLabel="Foto de cuerpo entero seleccionada"
                      />
                    </View>
                  ) : (
                    <GlassView style={styles.photoPlaceholder}>
                      <View style={styles.photoPlaceholderContent}>
                        <ImagePlus size={28} color={colors.textSecondary} />
                        <Text
                          style={[
                            styles.photoPlaceholderText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          De pie, cuerpo entero y con buena luz.
                        </Text>
                      </View>
                    </GlassView>
                  )}
                  <View style={styles.photoButtons}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void takePhoto()}
                      style={[
                        styles.photoButton,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Camera size={17} color={colors.primary} />
                      <Text
                        style={[
                          styles.photoButtonText,
                          { color: colors.primary },
                        ]}
                      >
                        Hacer foto
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void choosePhoto()}
                      style={[
                        styles.photoButton,
                        { borderColor: colors.border },
                      ]}
                    >
                      <ImagePlus size={17} color={colors.primary} />
                      <Text
                        style={[
                          styles.photoButtonText,
                          { color: colors.primary },
                        ]}
                      >
                        Elegir de la galería
                      </Text>
                    </Pressable>
                  </View>
                  {form.bodyPhotoUri ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => updateForm("bodyPhotoUri", "")}
                      style={styles.changePhoto}
                    >
                      <Text
                        style={[
                          styles.changePhotoText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Cambiar foto
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              </View>
            </GlassView>
          </Animated.View>

          {step === 5 ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/onboarding/privacy" as never)}
              style={styles.privacyLink}
            >
              <Text style={[styles.privacyText, { color: colors.primary }]}>
                Política de privacidad
              </Text>
            </Pressable>
          ) : null}

          {message ? (
            <Text
              accessibilityRole="alert"
              style={[styles.message, { color: colors.destructive }]}
            >
              {message}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void saveStep()}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              saving && styles.disabledButton,
              pressed && !saving && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.primaryForeground },
              ]}
            >
              {saving
                ? "Guardando…"
                : step === 6
                  ? "Guardar y continuar"
                  : "Continuar"}
            </Text>
            {step < STEP_COUNT - 1 ? (
              <ArrowRight size={18} color={colors.primaryForeground} />
            ) : null}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  colors: ReturnType<typeof useColors>;
  icon?: React.ReactNode;
  keyboardType?: "number-pad" | "decimal-pad";
  returnKeyType: "next" | "done" | "search";
  autoCapitalize?: "words" | "none" | "sentences";
}

function FormField({
  label,
  value,
  placeholder,
  onChangeText,
  accessibilityLabel,
  colors,
  icon,
  keyboardType,
  returnKeyType,
  autoCapitalize = "none",
}: FormFieldProps) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputShell,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        {icon}
        <TextInput
          accessibilityLabel={accessibilityLabel}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={[styles.input, { color: colors.textPrimary }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  topBar: {
    minHeight: nativeLayout.primaryButtonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: nativeLayout.primaryButtonHeight,
    height: nativeLayout.primaryButtonHeight,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 11,
    letterSpacing: 1.6,
  },
  progressRow: {
    flexDirection: "row",
    gap: nativeLayout.baseSpacing * 2,
    marginTop: nativeLayout.baseSpacing * 4,
  },
  progressSegment: {
    flex: 1,
    height: nativeLayout.baseSpacing,
    borderRadius: nativeLayout.pillRadius,
  },
  stepCount: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: nativeLayout.baseSpacing * 4,
  },
  title: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 36,
    lineHeight: 42,
    marginTop: nativeLayout.baseSpacing * 4,
  },
  subtitle: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginTop: nativeLayout.baseSpacing * 2,
    marginBottom: nativeLayout.baseSpacing * 6,
  },
  formCard: { minHeight: 150 },
  formContent: {
    flex: 1,
    justifyContent: "center",
    padding: nativeLayout.baseSpacing * 5,
  },
  fieldLabel: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 11,
    letterSpacing: 1.1,
    marginBottom: nativeLayout.baseSpacing * 3,
  },
  inputShell: {
    minHeight: nativeLayout.primaryButtonHeight,
    borderWidth: 1,
    borderRadius: nativeLayout.cardRadius,
    paddingHorizontal: nativeLayout.baseSpacing * 4,
    flexDirection: "row",
    alignItems: "center",
    gap: nativeLayout.baseSpacing * 3,
  },
  input: {
    flex: 1,
    minHeight: nativeLayout.primaryButtonHeight - nativeLayout.baseSpacing,
    fontFamily: "Satoshi_500Medium",
    fontSize: 16,
    paddingVertical: nativeLayout.baseSpacing * 2,
  },
  searchMessage: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 13,
    marginTop: nativeLayout.baseSpacing * 2,
  },
  cityResults: {
    marginTop: nativeLayout.baseSpacing * 2,
    overflow: "hidden",
  },
  cityResult: {
    minHeight: nativeLayout.primaryButtonHeight,
    justifyContent: "center",
    paddingHorizontal: nativeLayout.baseSpacing * 4,
    paddingVertical: nativeLayout.baseSpacing * 2,
  },
  cityResultText: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 14,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: nativeLayout.baseSpacing * 3,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderRadius: nativeLayout.baseSpacing,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  consentText: {
    flex: 1,
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  privacyLink: {
    alignSelf: "flex-start",
    paddingVertical: nativeLayout.baseSpacing * 3,
    paddingLeft: nativeLayout.baseSpacing * 9,
  },
  privacyText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  photoSection: { width: "100%" },
  photoFrame: {
    width: "72%",
    maxHeight: 320,
    aspectRatio: 3 / 4,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: nativeLayout.cardRadius,
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: {
    height: 220,
    borderRadius: nativeLayout.cardRadius,
  },
  photoPlaceholderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 3,
    padding: nativeLayout.baseSpacing * 5,
  },
  photoPlaceholderText: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  photoButtons: {
    flexDirection: "row",
    gap: nativeLayout.baseSpacing * 2,
    marginTop: nativeLayout.baseSpacing * 4,
  },
  photoButton: {
    flex: 1,
    minHeight: nativeLayout.primaryButtonHeight,
    borderWidth: 1,
    borderRadius: nativeLayout.cardRadius,
    paddingHorizontal: nativeLayout.baseSpacing * 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
  },
  photoButtonText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
  },
  changePhoto: {
    alignSelf: "center",
    paddingVertical: nativeLayout.baseSpacing * 3,
  },
  changePhotoText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  message: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    lineHeight: 19,
    marginTop: nativeLayout.baseSpacing * 3,
  },
  primaryButton: {
    minHeight: nativeLayout.primaryButtonHeight,
    borderRadius: nativeLayout.pillRadius,
    paddingHorizontal: nativeLayout.baseSpacing * 5,
    marginTop: nativeLayout.baseSpacing * 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
  },
  primaryButtonText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 15,
  },
  disabledButton: { opacity: 0.6 },
  pressed: { transform: [{ scale: 0.97 }] },
});
