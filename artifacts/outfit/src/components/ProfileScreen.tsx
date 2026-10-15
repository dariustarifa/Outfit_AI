import { memo, useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  CalendarDays,
  Camera,
  ChevronRight,
  ImagePlus,
  MapPin,
  Ruler,
  Trash2,
  UserRound,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";
import { useTheme, type ThemeMode, type ThemeColors } from "../theme";
import { useSettings } from "../context/SettingsContext";
import type { GlassLevel } from "../theme-mode";
import { useApp } from "@/src/context/AppContext";
import { getProfileDisplay } from "@/src/profile-display";
import type { Gender, Profile, ProfileUpdate, WardrobeItem } from "@/src/types";
import { formatCity, searchCities, type CityResult } from "@/src/services/geocoding";
import { selection, success } from "@/src/haptics";
import { BottomSheet } from "./BottomSheet";
import {
  genderLabel,
  genderOptions,
  GenderOptionCard,
} from "./GenderOptionCard";
import { WhiteChip } from "./WhiteChip";
import { PopTrigger } from "./PopTrigger";

const appearanceOptions: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automático" },
];

const glassLevelOptions: { value: GlassLevel; label: string }[] = [
  { value: "clear", label: "Cristalino" },
  { value: "medium", label: "Intermedio" },
  { value: "matte", label: "Mate" },
];

type EditableField =
  | "name"
  | "preferredName"
  | "gender"
  | "age"
  | "heightCm"
  | "city"
  | "bodyPhotoUri";
type ActiveSheet = { kind: "profile"; field: EditableField } | null;

interface ProfileForm {
  name: string;
  preferredName: string;
  gender: Gender | null;
  age: string;
  heightCm: string;
  city: string;
  bodyPhotoUri: string;
}

type SearchState = "idle" | "waiting" | "loading" | "success" | "error";

function emptyForm(): ProfileForm {
  return {
    name: "",
    preferredName: "",
    gender: null,
    age: "",
    heightCm: "",
    city: "",
    bodyPhotoUri: "",
  };
}

function formFromProfile(profile: Profile): ProfileForm {
  return {
    name: profile.name,
    preferredName: profile.preferredName ?? "",
    gender: profile.gender ?? null,
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

function fieldTitle(field: EditableField): string {
  switch (field) {
    case "name":
      return "Nombre";
    case "preferredName":
      return "Nombre preferido";
    case "gender":
      return "Género";
    case "age":
      return "Edad";
    case "heightCm":
      return "Estatura (cm)";
    case "city":
      return "Ciudad";
    case "bodyPhotoUri":
      return "Foto de cuerpo entero";
  }
}

const ProfileGarmentCell = memo(function ProfileGarmentCell({
  item,
  cellSize,
}: {
  item: WardrobeItem;
  cellSize: number;
}) {
  const { colors } = useTheme();
  const image = item.thumbUri ?? item.imageUri;
  const content = useCallback(
    (close: () => void, glassReady: boolean) => (
      <ProfileGarmentDetail
        item={item}
        close={close}
        glassReady={glassReady}
      />
    ),
    [item],
  );

  return (
    <PopTrigger
      id={item.id}
      image={image}
      fullImage={item.imageUri}
      radius={nativeLayout.cardRadius}
      size="card"
      content={content}
      style={[
        styles.wardrobeCell,
        {
          width: cellSize,
          height: cellSize,
          backgroundColor: colors.muted,
        },
      ]}
      pressedStyle={styles.pressed}
      accessibilityLabel={`Abrir prenda: ${item.note.trim() || "sin nota"}`}
      testID={`wardrobe-item-cell-${item.id}`}
    >
      <Image
        source={{ uri: image }}
        style={styles.wardrobeImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityLabel={item.note || "Prenda del armario"}
      />
    </PopTrigger>
  );
});

function ProfileGarmentDetail({
  item,
  close,
  glassReady,
}: {
  item: WardrobeItem;
  close: () => void;
  glassReady: boolean;
}) {
  const { colors } = useTheme();
  const { updateItem, removeItem } = useApp();
  const { height } = useWindowDimensions();
  const [note, setNote] = useState(item.note);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await updateItem(item.id, { note });
      await success();
      close();
    } catch {
      setError("No se pudo guardar la nota. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }, [close, item.id, note, saving, updateItem]);

  const remove = useCallback(async () => {
    try {
      await removeItem(item.id);
      await success();
      close();
    } catch {
      setError("No se pudo eliminar la prenda. Inténtalo de nuevo.");
    }
  }, [close, item.id, removeItem]);

  const confirmRemove = useCallback(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("¿Eliminar esta prenda?")) void remove();
      return;
    }
    Alert.alert("¿Eliminar esta prenda?", undefined, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => void remove() },
    ]);
  }, [remove]);

  return (
    <KeyboardAvoidingView
      style={styles.popDetailFill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.popDetailContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.popDetailHeader}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
            Tu prenda
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar prenda"
            testID="close-wardrobe-item-sheet"
            onPress={close}
            style={styles.popDetailClose}
          >
            {glassReady ? (
              <GlassView
                borderRadius={nativeLayout.pillRadius}
                style={styles.popDetailCloseSurface}
              >
                <X size={20} color={colors.textSecondary} />
              </GlassView>
            ) : (
              <View
                style={[
                  styles.popDetailCloseSurface,
                  { backgroundColor: colors.muted },
                ]}
              >
                <X size={20} color={colors.textSecondary} />
              </View>
            )}
          </Pressable>
        </View>
        <Image
          source={{ uri: item.imageUri }}
          style={[
            styles.garmentPhoto,
            { height: Math.min(height * 0.34, 320) },
          ]}
          contentFit="contain"
          cachePolicy="memory-disk"
          accessibilityLabel="Foto de la prenda"
        />
        <ProfileInput
          label="NOTA"
          value={note}
          placeholder="Añade una nota"
          accessibilityLabel="Nota de la prenda"
          testID="wardrobe-item-note"
          onChangeText={setNote}
          multiline
          colors={colors}
        />
        {error ? (
          <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          testID="wardrobe-item-save-note"
          disabled={saving}
          onPress={() => void save()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primaryBg },
            saving && styles.disabledButton,
            pressed && !saving && styles.pressed,
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
            {saving ? "Guardando…" : "Guardar"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          testID="delete-wardrobe-item"
          disabled={saving}
          onPress={confirmRemove}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
            saving && styles.disabledButton,
          ]}
        >
          <Trash2 size={16} color={colors.danger} />
          <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
            Eliminar prenda
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const WardrobeRowSeparator = memo(function WardrobeRowSeparator() {
  return <View style={styles.wardrobeRowSeparator} />;
});

function ProfileInput({
  label,
  value,
  placeholder,
  accessibilityLabel,
  onChangeText,
  colors,
  testID,
  autoCapitalize = "none",
  keyboardType,
  multiline = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  colors: ThemeColors;
  testID: string;
  autoCapitalize?: "none" | "words";
  keyboardType?: "number-pad";
  multiline?: boolean;
}) {
  const { isDark } = useTheme();
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputShell,
          { borderColor: colors.fieldBorder, backgroundColor: colors.fieldBg },
          multiline && styles.multilineShell,
        ]}
      >
        <TextInput
          accessibilityLabel={accessibilityLabel}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.gold}
          keyboardAppearance={isDark ? "dark" : "light"}
          keyboardType={keyboardType}
          returnKeyType={keyboardType ? "done" : "default"}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            { color: colors.textPrimary },
          ]}
        />
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const { glassLevel, setGlassLevel } = useSettings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    profile,
    wardrobe,
    updateProfile,
  } = useApp();
  const profileDisplay = getProfileDisplay(profile);
  const [form, setForm] = useState<ProfileForm>(() =>
    profile ? formFromProfile(profile) : emptyForm(),
  );
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(() =>
    profile ? cityFromProfile(profile) : null,
  );
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [sheetLayerActive, setSheetLayerActive] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] =
    ImagePicker.useMediaLibraryPermissions();

  const editingCity =
    activeSheet?.kind === "profile" && activeSheet.field === "city";
  useEffect(() => {
    const query = form.city.trim();
    if (
      !editingCity ||
      selectedCity ||
      query.length < 2 ||
      (query === profile?.city.trim() &&
        profile &&
        cityFromProfile(profile))
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
  }, [
    editingCity,
    form.city,
    profile?.city,
    profile?.latitude,
    profile?.longitude,
    selectedCity,
  ]);

  const updateForm = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
  };

  const openProfileEditor = (field: EditableField) => {
    if (!profile) return;
    void selection();
    setSheetLayerActive(true);
    setForm(formFromProfile(profile));
    setSelectedCity(cityFromProfile(profile));
    setCityResults([]);
    setSearchState("idle");
    setMessage("");
    setActiveSheet({ kind: "profile", field });
  };

  const closeSheet = () => {
    if (saving) return;
    if (profile) {
      setForm(formFromProfile(profile));
      setSelectedCity(cityFromProfile(profile));
    }
    setCityResults([]);
    setSearchState("idle");
    setMessage("");
    setActiveSheet(null);
  };

  const handleSheetDismissed = useCallback(() => {
    setSheetLayerActive(false);
  }, []);

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
      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (uri) updateForm("bodyPhotoUri", uri);
      else setMessage("No pudimos leer esa foto. Prueba a elegir otra.");
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
        setMessage(
          "Necesitamos acceso a la cámara. También puedes elegir una foto de tu galería.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.82,
      });
      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (uri) updateForm("bodyPhotoUri", uri);
      else setMessage("No pudimos leer esa foto. Prueba a hacer otra.");
    } catch {
      setMessage("No se pudo abrir la cámara. Puedes elegir una foto de tu galería.");
    }
  };

  const saveProfileField = async () => {
    if (
      saving ||
      !profile ||
      activeSheet?.kind !== "profile"
    ) {
      return;
    }

    const field = activeSheet.field;
    let updates: ProfileUpdate;
    if (field === "name") {
      const name = form.name.trim();
      if (!name) {
        setMessage("Escribe tu nombre para guardar los cambios.");
        return;
      }
      updates = { name };
      if (name !== profile.name) {
        // The home greeting prefers preferredName, so keep it in sync with a changed name.
        updates.preferredName = suggestedName(name);
      }
    } else if (field === "preferredName") {
      updates = {
        preferredName: form.preferredName.trim() || suggestedName(profile.name),
      };
    } else if (field === "age") {
      const age = Number(form.age);
      if (!Number.isInteger(age) || age < 14 || age > 99) {
        setMessage("La edad debe estar entre 14 y 99 años.");
        return;
      }
      updates = { age };
    } else if (field === "heightCm") {
      const heightCm = Number(form.heightCm);
      if (!Number.isInteger(heightCm) || heightCm < 100 || heightCm > 230) {
        setMessage("La estatura debe estar entre 100 y 230 cm.");
        return;
      }
      updates = { heightCm };
    } else if (field === "gender") {
      if (!form.gender) {
        setMessage("Selecciona una opción para guardar.");
        return;
      }
      updates = { gender: form.gender };
    } else if (field === "city") {
      if (!form.city.trim() || !selectedCity) {
        setMessage("Selecciona una ciudad de los resultados para guardar su ubicación.");
        return;
      }
      updates = {
        city: formatCity(selectedCity),
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
      };
    } else {
      if (!form.bodyPhotoUri.trim()) {
        setMessage("Elige una foto de cuerpo entero.");
        return;
      }
      updates = { bodyPhotoUri: form.bodyPhotoUri };
    }

    setSaving(true);
    setMessage("");
    try {
      const saved = await updateProfile(updates);
      setForm(formFromProfile(saved));
      setSelectedCity(cityFromProfile(saved));
      await success();
      setActiveSheet(null);
    } catch {
      setMessage("No se guardaron los cambios. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  const cellSize =
    (width -
      nativeLayout.screenHorizontalPadding * 2 -
      nativeLayout.baseSpacing * 4) /
    3;
  const profileRows: {
    field: EditableField;
    label: string;
    value: string;
    icon: React.ReactNode;
  }[] = [
    {
      field: "name",
      label: "Nombre",
      value: profileDisplay.name,
      icon: <UserRound size={18} color={colors.textSecondary} />,
    },
    {
      field: "preferredName",
      label: "Nombre preferido",
      value: profileDisplay.preferredName,
      icon: <UserRound size={18} color={colors.textSecondary} />,
    },
    {
      field: "gender",
      label: "Género",
      value: profile.gender ? genderLabel(profile.gender) : "Sin indicar",
      icon: <UserRound size={18} color={colors.textSecondary} />,
    },
    {
      field: "age",
      label: "Edad",
      value: profileDisplay.age,
      icon: <CalendarDays size={18} color={colors.textSecondary} />,
    },
    {
      field: "heightCm",
      label: "Estatura (cm)",
      value: profileDisplay.height,
      icon: <Ruler size={18} color={colors.textSecondary} />,
    },
    {
      field: "city",
      label: "Ciudad",
      value: profileDisplay.city,
      icon: <MapPin size={18} color={colors.textSecondary} />,
    },
    {
      field: "bodyPhotoUri",
      label: "Foto de cuerpo entero",
      value: profile.bodyPhotoUri ? "Cambiar foto" : "Añadir foto",
      icon: <ImagePlus size={18} color={colors.textSecondary} />,
    },
  ];
  const activeField =
    activeSheet?.kind === "profile" ? activeSheet.field : null;
  const isProfileSaveDisabled =
    saving || (activeField === "gender" && !form.gender);
  const renderWardrobeItem = useCallback(
    ({ item }: { item: WardrobeItem }) => (
      <ProfileGarmentCell item={item} cellSize={cellSize} />
    ),
    [cellSize],
  );

  return (
    <View
      style={[
        styles.fill,
        sheetLayerActive && styles.sheetLayer,
      ]}
    >
      <FlatList
        style={styles.fill}
        testID="profile-screen"
        data={wardrobe}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={renderWardrobeItem}
        columnWrapperStyle={styles.wardrobeGrid}
        ItemSeparatorComponent={WardrobeRowSeparator}
        initialNumToRender={12}
        windowSize={5}
        removeClippedSubviews
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop:
              Platform.OS === "web"
                ? Math.max(insets.top, 67) + 16
                : insets.top + 16,
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
        ListHeaderComponent={
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Perfil
            </Text>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Mis datos
            </Text>
            <GlassView
              style={[
                styles.dataCard,
                { borderColor: colors.glassBorder },
              ]}
            >
              {profileRows.map((row, index) => (
                <Pressable
                  key={row.field}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.label}: ${row.value}. Toca para editar.`}
                  testID={`profile-data-${row.field}`}
                  onPress={() => openProfileEditor(row.field)}
                  style={[
                    styles.profileRow,
                    index < profileRows.length - 1 && {
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  {row.field === "bodyPhotoUri" && profile.bodyPhotoUri ? (
                    <Image
                      source={{ uri: profile.bodyPhotoUri }}
                      style={[
                        styles.profilePhotoThumb,
                        { backgroundColor: colors.muted },
                      ]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      accessibilityLabel="Foto de cuerpo entero"
                    />
                  ) : (
                    <View
                      style={[
                        styles.rowIcon,
                        { backgroundColor: colors.muted },
                      ]}
                    >
                      {row.icon}
                    </View>
                  )}
                  <View style={styles.rowCopy}>
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {row.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.rowValue, { color: colors.textSecondary }]}
                    >
                      {row.value}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </Pressable>
              ))}
            </GlassView>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Apariencia
            </Text>
            <GlassView style={styles.appearanceCard}>
              <View style={styles.appearanceControl}>
                {appearanceOptions.map((option) => {
                  const selected = mode === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={option.label}
                      testID={`appearance-${option.value}`}
                      onPress={() => {
                        void selection();
                        void setMode(option.value).catch(() => {
                          Alert.alert(
                            "No se pudo guardar",
                            "No se pudo guardar tu preferencia de apariencia. Inténtalo de nuevo.",
                          );
                        });
                      }}
                      style={({ pressed }) => [
                        styles.appearanceOption,
                        pressed && styles.pressed,
                      ]}
                    >
                      {selected ? (
                        <WhiteChip style={styles.appearanceSelected}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.appearanceLabel,
                              { color: colors.onChip },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </WhiteChip>
                      ) : (
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.appearanceLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {option.label}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.glassLevelControl}>
                <View style={styles.glassLevelOptions}>
                  {glassLevelOptions.map((option) => {
                    const selected = glassLevel === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={option.label}
                        testID={`glass-level-${option.value}`}
                        onPress={() => {
                          void selection();
                          void setGlassLevel(option.value).catch(() => {
                            Alert.alert(
                              "No se pudo guardar",
                              "No se pudo guardar tu preferencia de cristal. Inténtalo de nuevo.",
                            );
                          });
                        }}
                        style={({ pressed }) => [
                          styles.glassLevelOption,
                          pressed && styles.pressed,
                        ]}
                      >
                        {selected ? (
                          <WhiteChip style={styles.glassLevelSelected}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.glassLevelLabel,
                                { color: colors.onChip },
                              ]}
                            >
                              {option.label}
                            </Text>
                          </WhiteChip>
                        ) : (
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.glassLevelLabel,
                              { color: colors.textMuted },
                            ]}
                          >
                            {option.label}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                <Text
                  style={[
                    styles.glassLevelCaption,
                    { color: colors.textMuted },
                  ]}
                >
                  Cristalino deja ver el fondo; Mate es más opaco y difuminado.
                </Text>
                <View
                  style={[
                    styles.glassPreviewBackdrop,
                    { backgroundColor: colors.blobA },
                  ]}
                >
                  <View
                    pointerEvents="none"
                    style={[
                      styles.glassPreviewStrip,
                      { backgroundColor: colors.blobB },
                    ]}
                  />
                  <GlassView
                    borderRadius={28}
                    edge
                    shadow={false}
                    style={styles.glassPreview}
                  >
                    <Text
                      style={[
                        styles.glassPreviewText,
                        { color: colors.text },
                      ]}
                    >
                      Vista previa
                    </Text>
                  </GlassView>
                </View>
              </View>
            </GlassView>

            <Text
              style={[
                styles.sectionTitle,
                styles.wardrobeTitle,
                { color: colors.textPrimary },
              ]}
            >
              Mi armario · {wardrobe.length}{" "}
              {wardrobe.length === 1 ? "prenda" : "prendas"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
            Todavía no hay prendas. Pulsa + para añadir la primera.
          </Text>
        }
      />

      <BottomSheet
        visible={activeSheet !== null}
        onClose={closeSheet}
        onDismissed={handleSheetDismissed}
        backdropTestID="close-profile-sheet-backdrop"
        backdropLabel="Cerrar"
      >
        <ScrollView
          style={styles.sheetScroll}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[
            styles.sheetContent,
            {
              paddingHorizontal: nativeLayout.screenHorizontalPadding,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
        >
                  {activeField ? (
                    <>
                      <View style={styles.sheetHeader}>
                        <Text
                          style={[
                            styles.sheetTitle,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {fieldTitle(activeField)}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Cerrar edición"
                          testID="close-profile-edit"
                          onPress={closeSheet}
                          style={styles.closeButton}
                        >
                          <X size={20} color={colors.textSecondary} />
                        </Pressable>
                      </View>

                      {activeField === "name" ? (
                        <ProfileInput
                          label="NOMBRE"
                          value={form.name}
                          placeholder="Tu nombre"
                          accessibilityLabel="Nombre"
                          testID="edit-profile-name"
                          autoCapitalize="words"
                          onChangeText={(value) => updateForm("name", value)}
                          colors={colors}
                        />
                      ) : null}
                      {activeField === "preferredName" ? (
                        <ProfileInput
                          label="NOMBRE PREFERIDO"
                          value={form.preferredName}
                          placeholder={
                            suggestedName(form.name) ||
                            "Cómo quieres que te llamemos"
                          }
                          accessibilityLabel="Nombre preferido"
                          testID="edit-profile-preferred-name"
                          autoCapitalize="words"
                          onChangeText={(value) =>
                            updateForm("preferredName", value)
                          }
                          colors={colors}
                        />
                      ) : null}
                      {activeField === "age" ? (
                        <ProfileInput
                          label="EDAD"
                          value={form.age}
                          placeholder="Edad"
                          accessibilityLabel="Edad"
                          testID="edit-profile-age"
                          keyboardType="number-pad"
                          onChangeText={(value) =>
                            updateForm("age", value.replace(/[^0-9]/g, ""))
                          }
                          colors={colors}
                        />
                      ) : null}
                      {activeField === "heightCm" ? (
                        <ProfileInput
                          label="ESTATURA (CM)"
                          value={form.heightCm}
                          placeholder="Estatura"
                          accessibilityLabel="Estatura en centímetros"
                          testID="edit-profile-height"
                          keyboardType="number-pad"
                          onChangeText={(value) =>
                            updateForm("heightCm", value.replace(/[^0-9]/g, ""))
                          }
                          colors={colors}
                        />
                      ) : null}
                      {activeField === "gender" ? (
                        <View style={styles.genderOptions}>
                          {genderOptions.map((option) => (
                            <GenderOptionCard
                              key={option.value}
                              gender={option.value}
                              label={option.label}
                              selected={form.gender === option.value}
                              onSelect={(gender) =>
                                setForm((current) => ({
                                  ...current,
                                  gender,
                                }))
                              }
                              testID={`edit-profile-gender-${option.value}`}
                            />
                          ))}
                        </View>
                      ) : null}
                      {activeField === "city" ? (
                        <View style={styles.cityEditor}>
                          <ProfileInput
                            label="CIUDAD"
                            value={form.city}
                            placeholder="Tu ciudad"
                            accessibilityLabel="Ciudad"
                            testID="edit-profile-city"
                            autoCapitalize="words"
                            onChangeText={(value) => {
                              setSelectedCity(
                                profile &&
                                  value.trim() === profile.city.trim()
                                  ? cityFromProfile(profile)
                                  : null,
                              );
                              updateForm("city", value);
                            }}
                            colors={colors}
                          />
                          {searchState === "waiting" ||
                          searchState === "loading" ? (
                            <Text
                              style={[
                                styles.helperText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              Buscando…
                            </Text>
                          ) : null}
                          {searchState === "error" ? (
                            <Text
                              style={[
                                styles.helperText,
                                { color: colors.danger },
                              ]}
                            >
                              No se pudo buscar. Inténtalo de nuevo.
                            </Text>
                          ) : null}
                          {searchState === "success" &&
                          cityResults.length === 0 ? (
                            <Text
                              style={[
                                styles.helperText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              No encontramos esa ciudad.
                            </Text>
                          ) : null}
                          {cityResults.length > 0 ? (
                            <GlassView
                              style={[
                                styles.cityResults,
                                { borderColor: colors.glassBorder },
                              ]}
                            >
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
                      {activeField === "bodyPhotoUri" ? (
                        <View style={styles.photoEditor}>
                          {form.bodyPhotoUri ? (
                            <Image
                              source={{ uri: form.bodyPhotoUri }}
                              style={[
                                styles.profilePhotoPreview,
                                { backgroundColor: colors.muted },
                              ]}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                              accessibilityLabel="Foto de cuerpo entero"
                            />
                          ) : null}
                          <View style={styles.photoActions}>
                            <Pressable
                              accessibilityRole="button"
                              testID="profile-take-photo"
                              onPress={() => void takePhoto()}
                              style={({ pressed }) => [
                                styles.secondaryButton,
                                { borderColor: colors.border },
                                pressed && styles.pressed,
                              ]}
                            >
                              <Camera size={17} color={colors.primary} />
                              <Text
                                style={[
                                  styles.secondaryButtonText,
                                  { color: colors.textPrimary },
                                ]}
                              >
                                Hacer foto
                              </Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              testID="profile-choose-photo"
                              onPress={() => void choosePhoto()}
                              style={({ pressed }) => [
                                styles.secondaryButton,
                                { borderColor: colors.border },
                                pressed && styles.pressed,
                              ]}
                            >
                              <ImagePlus size={17} color={colors.primary} />
                              <Text
                                style={[
                                  styles.secondaryButtonText,
                                  { color: colors.textPrimary },
                                ]}
                              >
                                Elegir foto
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                      {message ? (
                        <Text
                          accessibilityRole="alert"
                          style={[
                            styles.errorText,
                            { color: colors.danger },
                          ]}
                        >
                          {message}
                        </Text>
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        testID="save-profile-field"
                        disabled={isProfileSaveDisabled}
                        onPress={() => void saveProfileField()}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          { backgroundColor: colors.primaryBg },
                          isProfileSaveDisabled && styles.disabledButton,
                          pressed && !isProfileSaveDisabled && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.primaryButtonText,
                            { color: colors.onPrimary },
                          ]}
                        >
                          {saving ? "Guardando…" : "Guardar"}
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheetLayer: {
    position: "relative",
    zIndex: 100,
    elevation: 100,
  },
  content: { flexGrow: 1 },
  title: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 48,
    lineHeight: 56,
    includeFontPadding: false,
    marginBottom: nativeLayout.baseSpacing * 5,
  },
  sectionTitle: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 19,
    lineHeight: 26,
    marginBottom: nativeLayout.baseSpacing * 3,
  },
  dataCard: {
    overflow: "hidden",
    marginBottom: nativeLayout.baseSpacing * 6,
  },
  appearanceCard: {
    padding: nativeLayout.baseSpacing * 3,
    gap: nativeLayout.baseSpacing * 4,
    marginBottom: nativeLayout.baseSpacing * 6,
  },
  appearanceControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeLayout.baseSpacing,
  },
  glassLevelControl: {
    gap: nativeLayout.baseSpacing * 3,
  },
  glassLevelOptions: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeLayout.baseSpacing,
  },
  glassLevelOption: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: nativeLayout.pillRadius,
  },
  glassLevelSelected: {
    width: "100%",
    minHeight: 40,
    paddingHorizontal: nativeLayout.baseSpacing * 2,
    borderRadius: nativeLayout.pillRadius,
  },
  glassLevelLabel: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  glassLevelCaption: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  glassPreviewBackdrop: {
    height: 72,
    borderRadius: 28,
    overflow: "hidden",
    justifyContent: "center",
  },
  glassPreviewStrip: {
    position: "absolute",
    top: 22,
    left: 0,
    right: 0,
    height: 28,
  },
  glassPreview: {
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  glassPreviewText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 15,
  },
  appearanceOption: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: nativeLayout.pillRadius,
  },
  appearanceSelected: {
    width: "100%",
    height: 44,
    borderRadius: nativeLayout.pillRadius,
  },
  appearanceLabel: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  profileRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: nativeLayout.baseSpacing * 3,
    paddingHorizontal: nativeLayout.baseSpacing * 4,
    paddingVertical: nativeLayout.baseSpacing * 2,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: nativeLayout.pillRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePhotoThumb: {
    width: 40,
    height: 40,
    borderRadius: nativeLayout.baseSpacing * 3,
  },
  rowCopy: { flex: 1, minWidth: 0, gap: nativeLayout.baseSpacing / 2 },
  rowLabel: { fontFamily: "Satoshi_700Bold", fontSize: 14 },
  rowValue: { fontFamily: "Satoshi_400Regular", fontSize: 13 },
  wardrobeTitle: { marginBottom: nativeLayout.baseSpacing * 3 },
  wardrobeGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: nativeLayout.baseSpacing * 2,
  },
  wardrobeRowSeparator: { height: nativeLayout.baseSpacing * 2 },
  wardrobeCell: {
    borderRadius: nativeLayout.baseSpacing * 4,
    overflow: "hidden",
  },
  wardrobeImage: { width: "100%", height: "100%" },
  popDetailFill: { flex: 1 },
  popDetailContent: {
    flexGrow: 1,
    padding: nativeLayout.screenHorizontalPadding,
    gap: nativeLayout.baseSpacing * 3,
  },
  popDetailHeader: {
    minHeight: nativeLayout.primaryButtonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  popDetailClose: {
    width: 40,
    height: 40,
    borderRadius: nativeLayout.pillRadius,
    overflow: "hidden",
  },
  popDetailCloseSurface: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCopy: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginTop: nativeLayout.baseSpacing,
  },
  sheetScroll: { flexShrink: 1 },
  sheetContent: {
    flexGrow: 1,
    paddingTop: nativeLayout.baseSpacing * 2,
    gap: nativeLayout.baseSpacing * 3,
  },
  sheetHeader: {
    minHeight: nativeLayout.primaryButtonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 29,
    lineHeight: 34,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: nativeLayout.pillRadius,
    alignItems: "center",
    justifyContent: "center",
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
  },
  multilineShell: {
    minHeight: 104,
    alignItems: "stretch",
    paddingVertical: nativeLayout.baseSpacing * 2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: nativeLayout.primaryButtonHeight - nativeLayout.baseSpacing,
    paddingVertical: nativeLayout.baseSpacing * 2,
    fontFamily: "Satoshi_500Medium",
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 76,
    paddingVertical: nativeLayout.baseSpacing,
  },
  cityEditor: { gap: nativeLayout.baseSpacing * 2 },
  genderOptions: {
    gap: 12,
  },
  helperText: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  cityResults: {
    borderWidth: 1,
    overflow: "hidden",
  },
  cityResult: {
    minHeight: nativeLayout.primaryButtonHeight,
    justifyContent: "center",
    paddingHorizontal: nativeLayout.baseSpacing * 4,
    paddingVertical: nativeLayout.baseSpacing * 2,
  },
  cityResultText: { fontFamily: "Satoshi_400Regular", fontSize: 14 },
  photoEditor: { gap: nativeLayout.baseSpacing * 3 },
  profilePhotoPreview: {
    width: "70%",
    maxHeight: 300,
    aspectRatio: 3 / 4,
    alignSelf: "center",
    borderRadius: nativeLayout.cardRadius,
  },
  photoActions: { flexDirection: "row", gap: nativeLayout.baseSpacing * 2 },
  secondaryButton: {
    flex: 1,
    minHeight: nativeLayout.primaryButtonHeight,
    borderWidth: 1,
    borderRadius: nativeLayout.cardRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
    paddingHorizontal: nativeLayout.baseSpacing * 2,
  },
  secondaryButtonText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
  },
  garmentPhoto: {
    width: "100%",
    borderRadius: nativeLayout.cardRadius,
    backgroundColor: "transparent",
  },
  primaryButton: {
    minHeight: nativeLayout.primaryButtonHeight,
    borderRadius: nativeLayout.pillRadius,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: nativeLayout.baseSpacing * 4,
  },
  primaryButtonText: { fontFamily: "Satoshi_700Bold", fontSize: 15 },
  deleteButton: {
    minHeight: nativeLayout.primaryButtonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
  },
  deleteButtonText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 14,
  },
  errorText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  disabledButton: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
