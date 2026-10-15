import { useEffect, useState } from "react";
import {
  Image,
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
  Camera,
  Check,
  ImagePlus,
  MapPin,
  Ruler,
  Save,
  UserRound,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";
import { useTheme } from "../theme";
import { useApp } from "../context/AppContext";
import type { Profile, ProfileUpdate } from "../types";
import { success } from "../haptics";
import { formatCity, searchCities, type CityResult } from "../services/geocoding";

interface ProfileForm {
  name: string;
  preferredName: string;
  age: string;
  heightCm: string;
  city: string;
  bodyPhotoUri: string;
}

type SearchState = "idle" | "waiting" | "loading" | "success" | "error";

function formFromProfile(profile: Profile): ProfileForm {
  return {
    name: profile.name,
    preferredName: profile.preferredName ?? "",
    age: String(profile.age),
    heightCm: String(profile.heightCm),
    city: profile.city,
    bodyPhotoUri: profile.bodyPhotoUri,
  };
}

function cityFromProfile(profile: Profile): CityResult | null {
  if (
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

function suggestedName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function ProfileEditor() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useApp();
  const [form, setForm] = useState<ProfileForm>(() =>
    profile ? formFromProfile(profile) : {
      name: "",
      preferredName: "",
      age: "",
      heightCm: "",
      city: "",
      bodyPhotoUri: "",
    },
  );
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(() =>
    profile ? cityFromProfile(profile) : null,
  );
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [message, setMessage] = useState("");
  const [messageIsSuccess, setMessageIsSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] =
    ImagePicker.useMediaLibraryPermissions();

  useEffect(() => {
    const query = form.city.trim();
    if (
      selectedCity ||
      query.length < 2 ||
      (query === profile?.city.trim() && profile && cityFromProfile(profile))
    ) {
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
  }, [form.city, profile?.city, selectedCity]);

  const updateForm = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
    setMessageIsSuccess(false);
  };

  const choosePhoto = async () => {
    setMessage("");
    try {
      if (Platform.OS !== "web" && !mediaPermission?.granted) {
        const permission = await requestMediaPermission();
        if (!permission.granted) {
          setMessage("Necesitamos permiso para acceder a tus fotos.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.82,
      });
      if (!result.canceled) {
        const uri = result.assets[0]?.uri;
        if (uri) updateForm("bodyPhotoUri", uri);
        else setMessage("No pudimos leer esa foto. Prueba a elegir otra.");
      }
    } catch {
      setMessage("No se pudo abrir la galería. Inténtalo de nuevo.");
    }
  };

  const takePhoto = async () => {
    setMessage("");
    try {
      const permission = cameraPermission?.granted
        ? cameraPermission
        : await requestCameraPermission();
      if (!permission.granted) {
        setMessage("Necesitamos acceso a la cámara. También puedes elegir una foto de tu galería.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.82,
      });
      if (!result.canceled) {
        const uri = result.assets[0]?.uri;
        if (uri) updateForm("bodyPhotoUri", uri);
        else setMessage("No pudimos leer esa foto. Prueba a hacer otra.");
      }
    } catch {
      setMessage("No se pudo abrir la cámara. Puedes elegir una foto de tu galería.");
    }
  };

  const saveChanges = async () => {
    if (saving) return;
    const age = Number(form.age);
    const heightCm = Number(form.heightCm);
    if (!form.name.trim()) {
      setMessage("Escribe tu nombre para guardar los cambios.");
      return;
    }
    if (!Number.isInteger(age) || age < 14 || age > 99) {
      setMessage("La edad debe estar entre 14 y 99 años.");
      return;
    }
    if (!Number.isInteger(heightCm) || heightCm < 100 || heightCm > 230) {
      setMessage("La estatura debe estar entre 100 y 230 cm.");
      return;
    }
    if (!form.city.trim() || !selectedCity) {
      setMessage("Selecciona una ciudad de los resultados para guardar su ubicación.");
      return;
    }
    if (!form.bodyPhotoUri.trim()) {
      setMessage("Elige una foto de cuerpo entero.");
      return;
    }

    const updates: ProfileUpdate = {
      name: form.name.trim(),
      preferredName: form.preferredName.trim() || suggestedName(form.name),
      age,
      heightCm,
      city: formatCity(selectedCity),
      latitude: selectedCity.latitude,
      longitude: selectedCity.longitude,
      bodyPhotoUri: form.bodyPhotoUri,
    };

    setSaving(true);
    setMessage("");
    setMessageIsSuccess(false);
    try {
      const saved = await updateProfile(updates);
      setForm(formFromProfile(saved));
      setSelectedCity(cityFromProfile(saved));
      setMessage("Perfil actualizado.");
      setMessageIsSuccess(true);
      void success();
    } catch {
      setMessage("No se pudo guardar el perfil. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const topPadding =
    Platform.OS === "web"
      ? Math.max(insets.top, 67) + 16
      : insets.top + 16;

  if (!profile) return null;

  return (
    <View style={styles.fill}>
      <ScrollView
        style={styles.fill}
        testID="profile-edit-form"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding,
            paddingHorizontal: nativeLayout.screenHorizontalPadding,
            paddingBottom:
              Platform.OS === "web"
                ? Math.max(insets.bottom, 34) + 120
                : insets.bottom + 120,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
      <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
        TU PERFIL
      </Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Editar perfil
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Actualiza tus datos cuando quieras.
      </Text>

      <GlassView style={styles.formCard}>
        <View style={styles.fields}>
          <ProfileField
            label="NOMBRE"
            value={form.name}
            placeholder="Tu nombre"
            accessibilityLabel="Nombre"
            icon={<UserRound size={18} color={colors.textSecondary} />}
            autoCapitalize="words"
            onChangeText={(value) => updateForm("name", value)}
            colors={colors}
          />
          <ProfileField
            label="NOMBRE PREFERIDO"
            value={form.preferredName}
            placeholder={suggestedName(form.name) || "Cómo quieres que te llamemos"}
            accessibilityLabel="Nombre preferido"
            icon={<UserRound size={18} color={colors.textSecondary} />}
            autoCapitalize="words"
            onChangeText={(value) => updateForm("preferredName", value)}
            colors={colors}
          />
          <View style={styles.pairedFields}>
            <View style={styles.pairedField}>
              <ProfileField
                label="EDAD"
                value={form.age}
                placeholder="Edad"
                accessibilityLabel="Edad"
                keyboardType="number-pad"
                onChangeText={(value) =>
                  updateForm("age", value.replace(/[^0-9]/g, ""))
                }
                colors={colors}
              />
            </View>
            <View style={styles.pairedField}>
              <ProfileField
                label="ESTATURA (CM)"
                value={form.heightCm}
                placeholder="Altura"
                accessibilityLabel="Estatura en centímetros"
                icon={<Ruler size={18} color={colors.textSecondary} />}
                keyboardType="number-pad"
                onChangeText={(value) =>
                  updateForm("heightCm", value.replace(/[^0-9]/g, ""))
                }
                colors={colors}
              />
            </View>
          </View>

          <View>
            <ProfileField
              label="CIUDAD"
              value={form.city}
              placeholder="Tu ciudad"
              accessibilityLabel="Ciudad"
              icon={<MapPin size={18} color={colors.textSecondary} />}
              autoCapitalize="words"
              returnKeyType="search"
              onChangeText={(value) => {
                setSelectedCity(
                  profile && value.trim() === profile.city.trim()
                    ? cityFromProfile(profile)
                    : null,
                );
                updateForm("city", value);
              }}
              colors={colors}
            />
            {searchState === "waiting" || searchState === "loading" ? (
              <Text style={[styles.searchMessage, { color: colors.textSecondary }]}>
                Buscando…
              </Text>
            ) : null}
            {searchState === "error" ? (
              <Text style={[styles.searchMessage, { color: colors.destructive }]}>
                No se pudo buscar. Inténtalo de nuevo.
              </Text>
            ) : null}
            {searchState === "success" && cityResults.length === 0 ? (
              <Text style={[styles.searchMessage, { color: colors.textSecondary }]}>
                No encontramos esa ciudad.
              </Text>
            ) : null}
            {cityResults.length > 0 ? (
              <GlassView style={styles.cityResults}>
                {cityResults.map((city, index) => (
                  <Pressable
                    key={`${city.latitude}-${city.longitude}-${index}`}
                    accessibilityRole="button"
                    testID={`profile-city-result-${index}`}
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
                    <Text style={[styles.cityResultText, { color: colors.textPrimary }]}>
                      {formatCity(city)}
                    </Text>
                  </Pressable>
                ))}
              </GlassView>
            ) : null}
          </View>

          <View>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              FOTO DE CUERPO ENTERO
            </Text>
            {form.bodyPhotoUri ? (
              <View
                style={[
                  styles.photoFrame,
                  { borderColor: colors.border, backgroundColor: colors.muted },
                ]}
              >
                <Image
                  source={{ uri: form.bodyPhotoUri }}
                  style={styles.photo}
                  resizeMode="cover"
                  accessibilityLabel="Foto de perfil"
                />
              </View>
            ) : (
              <GlassView style={styles.photoPlaceholder}>
                <ImagePlus size={26} color={colors.textSecondary} />
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                  Elige una foto de cuerpo entero.
                </Text>
              </GlassView>
            )}
            <View style={styles.photoButtons}>
              <PhotoButton
                label="Hacer foto"
                icon={<Camera size={17} color={colors.primary} />}
                testID="profile-take-photo"
                onPress={() => void takePhoto()}
                colors={colors}
              />
              <PhotoButton
                label="Elegir foto"
                icon={<ImagePlus size={17} color={colors.primary} />}
                testID="profile-choose-photo"
                onPress={() => void choosePhoto()}
                colors={colors}
              />
            </View>
          </View>
        </View>
      </GlassView>

      {message ? (
        <View
          accessibilityRole={messageIsSuccess ? "text" : "alert"}
          testID="profile-save-message"
          style={[
            styles.message,
          ]}
        >
          {messageIsSuccess ? <Check size={15} color={colors.primary} /> : null}
          <Text
            style={[
              styles.messageText,
              { color: messageIsSuccess ? colors.textPrimary : colors.destructive },
            ]}
          >
            {message}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: saving }}
        testID="save-profile-changes"
        disabled={saving}
        onPress={() => void saveChanges()}
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: colors.primary },
          saving && styles.disabled,
          pressed && !saving && styles.pressed,
        ]}
      >
        <Save size={18} color={colors.primaryForeground} />
        <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}

interface FieldColors {
  textPrimary: string;
  textSecondary: string;
  border: string;
  card: string;
  fieldBorder: string;
  fieldBg: string;
}

interface ProfileFieldProps {
  label: string;
  value: string;
  placeholder: string;
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  colors: FieldColors;
  icon?: React.ReactNode;
  keyboardType?: "number-pad";
  returnKeyType?: "done" | "search";
  autoCapitalize?: "none" | "words";
}

function ProfileField({
  label,
  value,
  placeholder,
  accessibilityLabel,
  onChangeText,
  colors,
  icon,
  keyboardType,
  returnKeyType = "done",
  autoCapitalize = "none",
}: ProfileFieldProps) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputShell,
          { borderColor: colors.fieldBorder, backgroundColor: colors.fieldBg },
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

function PhotoButton({
  label,
  icon,
  testID,
  onPress,
  colors,
}: {
  label: string;
  icon: React.ReactNode;
  testID: string;
  onPress: () => void;
  colors: FieldColors;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.photoButton,
        { borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.photoButtonText, { color: colors.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
  },
  eyebrow: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 36,
    lineHeight: 42,
    marginTop: nativeLayout.baseSpacing * 2,
  },
  subtitle: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginTop: nativeLayout.baseSpacing,
    marginBottom: nativeLayout.baseSpacing * 5,
  },
  formCard: {
    marginBottom: nativeLayout.baseSpacing * 4,
  },
  fields: {
    gap: nativeLayout.baseSpacing * 5,
    padding: nativeLayout.baseSpacing * 4,
  },
  pairedFields: {
    flexDirection: "row",
    gap: nativeLayout.baseSpacing * 3,
  },
  pairedField: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 10,
    letterSpacing: 1.1,
    marginBottom: nativeLayout.baseSpacing * 2,
  },
  inputShell: {
    minHeight: nativeLayout.primaryButtonHeight,
    borderWidth: 1,
    borderRadius: nativeLayout.cardRadius,
    paddingHorizontal: nativeLayout.baseSpacing * 3,
    flexDirection: "row",
    alignItems: "center",
    gap: nativeLayout.baseSpacing * 2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: nativeLayout.primaryButtonHeight - nativeLayout.baseSpacing,
    fontFamily: "Satoshi_500Medium",
    fontSize: 15,
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
  photoFrame: {
    width: "66%",
    maxHeight: 270,
    aspectRatio: 3 / 4,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: nativeLayout.cardRadius,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    height: 180,
    borderRadius: nativeLayout.cardRadius,
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 3,
    padding: nativeLayout.baseSpacing * 4,
  },
  placeholderText: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  photoButtons: {
    flexDirection: "row",
    gap: nativeLayout.baseSpacing * 2,
    marginTop: nativeLayout.baseSpacing * 3,
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
  message: {
    minHeight: nativeLayout.primaryButtonHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: nativeLayout.baseSpacing * 2,
  },
  messageText: {
    flex: 1,
    fontFamily: "Satoshi_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    minHeight: nativeLayout.primaryButtonHeight,
    borderRadius: nativeLayout.pillRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
    marginBottom: nativeLayout.baseSpacing * 3,
  },
  saveButtonText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
