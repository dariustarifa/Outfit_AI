import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  ArrowRight,
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

type OnboardingStep = 0 | 1 | 2 | 3 | 4;

interface ProfileForm {
  name: string;
  age: string;
  heightCm: string;
  bodyPhotoUri: string;
  city: string;
}

const STEP_COUNT = 5;

function initialStep(profile: Profile | null): OnboardingStep {
  if (!profile || !profile.name.trim()) return 0;
  if (!Number.isFinite(profile.age) || profile.age <= 0) return 1;
  if (!Number.isFinite(profile.heightCm) || profile.heightCm <= 0) return 2;
  if (!profile.bodyPhotoUri.trim()) return 3;
  if (!profile.city.trim()) return 4;
  return 4;
}

function makeForm(profile: Profile | null): ProfileForm {
  return {
    name: profile?.name ?? "",
    age: profile && profile.age > 0 ? String(profile.age) : "",
    heightCm:
      profile && profile.heightCm > 0 ? String(profile.heightCm) : "",
    bodyPhotoUri: profile?.bodyPhotoUri ?? "",
    city: profile?.city ?? "",
  };
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, loading, setProfile } = useApp();
  const initialized = useRef(false);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    age: "",
    heightCm: "",
    bodyPhotoUri: "",
    city: "",
  });
  const [step, setStep] = useState<OnboardingStep>(0);
  const [message, setMessage] = useState<string | null>(null);
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [mediaPermission, requestMediaPermission] =
    ImagePicker.useMediaLibraryPermissions();

  useEffect(() => {
    if (loading || initialized.current) return;
    initialized.current = true;
    setForm(makeForm(profile));
    setStep(initialStep(profile));
  }, [loading, profile]);

  const updateForm = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
  };

  const chooseBodyPhoto = async () => {
    setMessage(null);
    setCanOpenSettings(false);

    try {
      if (Platform.OS !== "web" && !mediaPermission?.granted) {
        const permission = await requestMediaPermission();
        if (!permission.granted) {
          setMessage(
            permission.status === "denied" && !permission.canAskAgain
              ? "El acceso a tus fotos está desactivado. Actívalo en los ajustes para elegir una imagen."
              : "Necesitamos permiso para acceder a tus fotos y elegir una imagen.",
          );
          setCanOpenSettings(
            permission.status === "denied" && !permission.canAskAgain,
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.85,
      });

      if (result.canceled) {
        setMessage("No seleccionaste una foto. Puedes elegirla cuando quieras.");
        return;
      }

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

  const validateCurrentStep = (): string | null => {
    if (step === 0 && !form.name.trim()) {
      return "Escribe tu nombre para continuar.";
    }
    if (step === 1) {
      const age = Number(form.age);
      if (!form.age.trim() || !Number.isInteger(age) || age <= 0) {
        return "Introduce una edad válida.";
      }
    }
    if (step === 2) {
      const height = Number(form.heightCm);
      if (!form.heightCm.trim() || !Number.isFinite(height) || height <= 0) {
        return "Introduce una altura válida en centímetros.";
      }
    }
    if (step === 3 && !form.bodyPhotoUri) {
      return "Elige una foto para continuar.";
    }
    if (step === 4 && !form.city.trim()) {
      return "Escribe tu ciudad para consultar el tiempo local.";
    }
    return null;
  };

  const saveStep = async () => {
    if (saving || finished) return;

    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    const isFinalStep = step === 4;
    const nextProfile: Profile = {
      name: form.name.trim(),
      age: Number(form.age) || 0,
      heightCm: Number(form.heightCm) || 0,
      bodyPhotoUri: form.bodyPhotoUri,
      city: form.city.trim(),
      latitude: profile?.latitude,
      longitude: profile?.longitude,
      onboardingCompleted: isFinalStep,
    };

    setSaving(true);
    setMessage(null);
    try {
      const savedProfile = await setProfile(nextProfile);
      if (savedProfile) {
        setForm((current) => ({
          ...current,
          bodyPhotoUri: savedProfile.bodyPhotoUri,
        }));
      }
      if (isFinalStep) {
        setFinished(true);
      } else {
        setStep((current) => Math.min(current + 1, STEP_COUNT - 1) as OnboardingStep);
      }
    } catch {
      setMessage("No se pudo guardar tu perfil en este dispositivo. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    setMessage(null);
    setCanOpenSettings(false);
    setStep((current) => Math.max(current - 1, 0) as OnboardingStep);
  };

  const stepTitle = [
    "¿Cómo te llamas?",
    "¿Qué edad tienes?",
    "¿Cuánto mides?",
    "Una foto para conocerte",
    "¿En qué ciudad estás?",
  ][step];

  const stepCopy = [
    "Empecemos por ti. Así podremos hablarte de una forma más personal.",
    "Tu edad nos ayuda a ajustar las recomendaciones a tu estilo de vida.",
    "Usaremos tu altura como referencia para sugerencias que se sientan tuyas.",
    "Una foto de cuerpo entero nos ayuda a tener en cuenta cómo te gusta vestir.",
    "Tendremos en cuenta el tiempo de tu zona al pensar en qué ponerte.",
  ][step];

  const contentTop =
    Platform.OS === "web"
      ? Math.max(insets.top, 67) + nativeLayout.baseSpacing * 4
      : insets.top + nativeLayout.baseSpacing * 4;
  const contentBottom =
    Platform.OS === "web"
      ? Math.max(insets.bottom, 34) + nativeLayout.baseSpacing * 4
      : insets.bottom + nativeLayout.baseSpacing * 4;

  if (loading || !initialized.current) {
    return (
      <GradientBackground style={styles.fill}>
        <View
          style={[
            styles.loadingContent,
            {
              paddingTop: contentTop,
              paddingBottom: contentBottom,
              paddingHorizontal: nativeLayout.screenHorizontalPadding,
            },
          ]}
        >
          <GlassView style={styles.loadingCard}>
            <View style={styles.loadingInner}>
              <View style={[styles.loadingLine, { backgroundColor: colors.muted }]} />
              <View
                style={[
                  styles.loadingLine,
                  styles.loadingLineShort,
                  { backgroundColor: colors.muted },
                ]}
              />
              <View
                style={[
                  styles.loadingInput,
                  { backgroundColor: colors.muted },
                ]}
              />
            </View>
          </GlassView>
        </View>
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
            {step > 0 && !finished ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver al paso anterior"
                testID="onboarding-back"
                onPress={goBack}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
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

          {!finished ? (
            <>
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

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {stepTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {stepCopy}
              </Text>

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
                      onSubmitEditing={() => void saveStep()}
                      accessibilityLabel="Nombre"
                      testID="onboarding-name"
                      colors={colors}
                    />
                  ) : null}

                  {step === 1 ? (
                    <FormField
                      label="EDAD"
                      value={form.age}
                      placeholder="Tu edad"
                      onChangeText={(value) =>
                        updateForm("age", value.replace(/[^0-9]/g, ""))
                      }
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={() => void saveStep()}
                      accessibilityLabel="Edad"
                      testID="onboarding-age"
                      colors={colors}
                    />
                  ) : null}

                  {step === 2 ? (
                    <FormField
                      label="ALTURA EN CENTÍMETROS"
                      icon={<Ruler size={19} color={colors.textSecondary} />}
                      value={form.heightCm}
                      placeholder="Por ejemplo, 170"
                      onChangeText={(value) =>
                        updateForm("heightCm", value.replace(",", ".").replace(/[^0-9.]/g, ""))
                      }
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={() => void saveStep()}
                      accessibilityLabel="Altura en centímetros"
                      testID="onboarding-height"
                      colors={colors}
                    />
                  ) : null}

                  {step === 3 ? (
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
                            accessibilityLabel="Foto de perfil seleccionada"
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
                              Tu foto solo sirve para personalizar tus sugerencias.
                            </Text>
                          </View>
                        </GlassView>
                      )}
                      <Pressable
                        accessibilityRole="button"
                        testID="onboarding-choose-photo"
                        onPress={() => void chooseBodyPhoto()}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          { borderColor: colors.border },
                          pressed && styles.pressed,
                        ]}
                      >
                        <ImagePlus size={18} color={colors.primary} />
                        <Text
                          style={[
                            styles.secondaryButtonText,
                            { color: colors.primary },
                          ]}
                        >
                          {form.bodyPhotoUri ? "Elegir otra foto" : "Elegir de la galería"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {step === 4 ? (
                    <FormField
                      label="CIUDAD"
                      icon={<MapPin size={19} color={colors.textSecondary} />}
                      value={form.city}
                      placeholder="Por ejemplo, Madrid"
                      onChangeText={(value) => updateForm("city", value)}
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={() => void saveStep()}
                      accessibilityLabel="Ciudad"
                      testID="onboarding-city"
                      colors={colors}
                    />
                  ) : null}
                </View>
              </GlassView>

              {message ? (
                <Text
                  accessibilityRole="alert"
                  style={[styles.errorText, { color: colors.destructive }]}
                >
                  {message}
                </Text>
              ) : null}

              {canOpenSettings ? (
                <Pressable
                  accessibilityRole="button"
                  testID="onboarding-open-settings"
                  onPress={() => void Linking.openSettings().catch(() => {
                    setMessage("No se pudieron abrir los ajustes del dispositivo.");
                  })}
                  style={styles.settingsButton}
                >
                  <Text style={[styles.settingsText, { color: colors.primary }]}>
                    Abrir ajustes
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                testID="onboarding-continue"
                disabled={saving}
                onPress={() => void saveStep()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  saving && styles.disabledButton,
                  pressed && !saving && styles.pressed,
                ]}
              >
                {step === STEP_COUNT - 1 ? (
                  <Check size={18} color={colors.primaryForeground} />
                ) : null}
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                  {saving
                    ? "Guardando…"
                    : step === STEP_COUNT - 1
                      ? "Guardar mi perfil"
                      : "Continuar"}
                </Text>
                {step < STEP_COUNT - 1 ? (
                  <ArrowRight size={18} color={colors.primaryForeground} />
                ) : null}
              </Pressable>
              <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>
                Tu armario y tu clima local, en sintonía contigo.
              </Text>
            </>
          ) : (
            <View style={styles.finishedState}>
              <GlassView style={styles.finishedCard}>
                <View style={styles.finishedContent}>
                  <View
                    style={[
                      styles.finishedIcon,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Check size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.finishedTitle, { color: colors.textPrimary }]}>
                    Ya está, {form.name.trim()}.
                  </Text>
                  <Text style={[styles.finishedCopy, { color: colors.textSecondary }]}>
                    Tu perfil está listo. Outfit tendrá en cuenta tu estilo y el tiempo de tu ciudad.
                  </Text>
                </View>
              </GlassView>
            </View>
          )}
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
  testID: string;
  colors: ReturnType<typeof useColors>;
  icon?: React.ReactNode;
  keyboardType?: "number-pad" | "decimal-pad";
  returnKeyType: "next" | "done";
  onSubmitEditing: () => void;
  autoCapitalize?: "words" | "none" | "sentences";
}

function FormField({
  label,
  value,
  placeholder,
  onChangeText,
  accessibilityLabel,
  testID,
  colors,
  icon,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize = "none",
}: FormFieldProps) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        {icon}
        <TextInput
          accessibilityLabel={accessibilityLabel}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize={autoCapitalize}
          maxLength={label === "TU NOMBRE" ? 80 : 100}
          style={[styles.input, { color: colors.textPrimary }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
  },
  loadingCard: {
    minHeight: 220,
  },
  loadingInner: {
    flex: 1,
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 4,
    padding: nativeLayout.baseSpacing * 6,
  },
  loadingLine: {
    width: "55%",
    height: nativeLayout.baseSpacing * 3,
    borderRadius: nativeLayout.pillRadius,
    opacity: 0.7,
  },
  loadingLineShort: {
    width: "35%",
  },
  loadingInput: {
    width: "100%",
    height: nativeLayout.primaryButtonHeight,
    borderRadius: nativeLayout.cardRadius,
    opacity: 0.55,
  },
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
  formCard: {
    minHeight: 148,
  },
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
  photoSection: {
    width: "100%",
  },
  photoFrame: {
    height: 300,
    width: "100%",
    borderWidth: 1,
    borderRadius: nativeLayout.cardRadius,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    height: 190,
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
  secondaryButton: {
    minHeight: nativeLayout.primaryButtonHeight,
    borderWidth: 1,
    borderRadius: nativeLayout.pillRadius,
    paddingHorizontal: nativeLayout.baseSpacing * 4,
    marginTop: nativeLayout.baseSpacing * 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
  },
  secondaryButtonText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 14,
  },
  errorText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    lineHeight: 19,
    marginTop: nativeLayout.baseSpacing * 3,
  },
  settingsButton: {
    alignSelf: "flex-start",
    paddingVertical: nativeLayout.baseSpacing * 3,
  },
  settingsText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 14,
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
  privacyNote: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: nativeLayout.baseSpacing * 4,
  },
  finishedState: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: nativeLayout.baseSpacing * 8,
  },
  finishedCard: {
    minHeight: 260,
  },
  finishedContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: nativeLayout.baseSpacing * 6,
  },
  finishedIcon: {
    width: nativeLayout.primaryButtonHeight,
    height: nativeLayout.primaryButtonHeight,
    borderRadius: nativeLayout.pillRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  finishedTitle: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 32,
    textAlign: "center",
    marginTop: nativeLayout.baseSpacing * 5,
  },
  finishedCopy: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: nativeLayout.baseSpacing * 3,
  },
  disabledButton: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
