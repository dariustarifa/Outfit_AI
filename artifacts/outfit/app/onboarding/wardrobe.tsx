import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  Plus,
  Settings,
} from "lucide-react-native";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";
import { useTheme } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";
import { selection, success, tapLight } from "@/src/haptics";
import {
  saveGallerySelection,
  type GallerySaveProgress,
} from "@/src/gallery-save";

const WEB_SAFE_TOP = 67;
const WEB_SAFE_BOTTOM = 34;
const screenHeight = Dimensions.get("screen").height;

export default function WardrobeOnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromPlus = from === "plus";
  const { profile, wardrobe, loading, addItem, setProfile } = useApp();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] =
    ImagePicker.useMediaLibraryPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [galleryProgress, setGalleryProgress] =
    useState<GallerySaveProgress | null>(null);
  const [toast, setToast] = useState("");
  const toastOffset = useSharedValue(screenHeight);
  const toastAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastOffset.value }],
  }));
  const [error, setError] = useState("");
  const cameraRef = useRef<CameraView>(null);
  const previewScrollRef = useRef<ScrollView>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!toast) {
      toastOffset.value = screenHeight;
      return;
    }
    toastOffset.value = screenHeight;
    toastOffset.value = withSpring(0, {
      damping: 20,
      stiffness: 220,
      mass: 1,
    });
  }, [toast, toastOffset]);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  const chooseFromGallery = useCallback(
    async (allowMultiple = true) => {
      if (gallerySaving) return;
      setError("");
      setToast("");
      setGallerySaving(true);
      void selection();

      try {
        if (Platform.OS !== "web" && !mediaPermission?.granted) {
          const permission = await requestMediaPermission();
          if (!permission.granted) {
            if (permission.status === "denied" && !permission.canAskAgain) {
              Alert.alert(
                "Acceso a fotos desactivado",
                "Activa el acceso a tus fotos en los ajustes del dispositivo.",
                [
                  { text: "Ahora no", style: "cancel" },
                  {
                    text: "Abrir ajustes",
                    onPress: () => {
                      void Linking.openSettings().catch(() => undefined);
                    },
                  },
                ],
              );
            }
            setError("Necesitamos acceso a tus fotos para elegir imágenes.");
            return;
          }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsMultipleSelection: allowMultiple,
          selectionLimit: allowMultiple ? 0 : 1,
          quality: 0.85,
        });
        if (result.canceled || result.assets.length === 0) return;

        if (!allowMultiple) {
          const selectedPhoto = result.assets[0]?.uri;
          if (!selectedPhoto) {
            setError("No pudimos leer esa foto. Prueba a elegir otra.");
            return;
          }
          setPhotoUri(selectedPhoto);
          setNote("");
          setCameraReady(false);
          return;
        }

        setGalleryProgress({ completed: 0, total: result.assets.length });
        const saved = await saveGallerySelection(
          result.assets,
          addItem,
          setGalleryProgress,
        );

        if (saved.added > 0) {
          await success();
          showToast(
            saved.added === 1
              ? "1 prenda añadida"
              : `${saved.added} prendas añadidas`,
          );
        }
        if (saved.failed > 0) {
          setError(
            saved.added > 0
              ? `No se pudieron guardar ${saved.failed} fotos.`
              : "No se pudieron guardar las fotos. Inténtalo de nuevo.",
          );
        }
      } catch {
        setError("No se pudo abrir la galería. Inténtalo de nuevo.");
      } finally {
        setGallerySaving(false);
        setGalleryProgress(null);
      }
    },
    [
      addItem,
      gallerySaving,
      mediaPermission?.granted,
      requestMediaPermission,
      showToast,
    ],
  );

  const requestCameraAccess = useCallback(async () => {
    setError("");
    try {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        setError("Necesitamos acceso a la cámara para hacer una foto.");
      }
    } catch {
      setError("No se pudo solicitar acceso a la cámara.");
    }
  }, [requestCameraPermission]);

  const openCameraSettings = useCallback(() => {
    void Linking.openSettings().catch(() => {
      setError("No se pudieron abrir los ajustes del dispositivo.");
    });
  }, []);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || takingPhoto || gallerySaving) {
      return;
    }
    setError("");
    setTakingPhoto(true);
    await tapLight();

    try {
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.85,
      });
      if (!captured?.uri) {
        throw new Error("The camera did not return an image.");
      }
      setPhotoUri(captured.uri);
      setNote("");
      setCameraReady(false);
    } catch {
      setError(
        "No se pudo tomar la foto. Comprueba la cámara e inténtalo de nuevo.",
      );
    } finally {
      setTakingPhoto(false);
    }
  }, [cameraReady, gallerySaving, takingPhoto]);

  const repeatPhoto = useCallback(() => {
    void selection();
    setPhotoUri(null);
    setNote("");
    setError("");
    setCameraReady(false);
  }, []);

  const saveCurrentPhoto = useCallback(async () => {
    if (!photoUri || savingPhoto) return;
    setSavingPhoto(true);
    setError("");

    try {
      // addItem copies the image into the app's document directory before saving it.
      await addItem({ imageUri: photoUri, note: note.trim() });
      await success();
      setPhotoUri(null);
      setNote("");
      setCameraReady(false);
    } catch {
      setError(
        "No se pudo guardar la prenda. Comprueba el espacio disponible e inténtalo de nuevo.",
      );
    } finally {
      setSavingPhoto(false);
    }
  }, [addItem, note, photoUri, savingPhoto]);

  const confirmWardrobe = useCallback(async () => {
    if (wardrobe.length === 0 || gallerySaving || confirming || savingPhoto) {
      return;
    }

    if (fromPlus) {
      setConfirming(true);
      await success();
      if (router.canGoBack()) router.back();
      else router.replace("/");
      return;
    }

    if (!profile) {
      setError("No encontramos tu perfil. Vuelve a completar tus datos.");
      return;
    }

    setConfirming(true);
    setError("");
    await success();
    try {
      await setProfile({ ...profile, onboardingCompleted: true });
      router.replace({
        pathname: "/wardrobe",
        params: { source: "onboarding" },
      } as never);
    } catch {
      setError("No se pudo completar el registro. Inténtalo de nuevo.");
      setConfirming(false);
    }
  }, [
    confirming,
    fromPlus,
    gallerySaving,
    profile,
    savingPhoto,
    setProfile,
    wardrobe.length,
  ]);

  const countLabel =
    wardrobe.length === 1 ? "1 prenda" : `${wardrobe.length} prendas`;
  const previewHeight = Math.max(220, Math.min(screenHeight * 0.44, 460));
  const cameraGranted = cameraPermission?.granted === true;
  const cameraPermissionBlocked =
    cameraPermission?.status === "denied" && !cameraPermission.canAskAgain;
  const actionsBusy = gallerySaving || confirming;
  const screenTopInset =
    Platform.OS === "web" ? Math.max(insets.top, WEB_SAFE_TOP) : insets.top;
  const screenBottomInset =
    Platform.OS === "web"
      ? Math.max(insets.bottom, WEB_SAFE_BOTTOM)
      : insets.bottom;

  if (loading) {
    return (
      <View style={styles.fill}>
        <View
          style={[
            styles.loadingState,
            {
              paddingTop: screenTopInset,
              paddingBottom: screenBottomInset,
            },
          ]}
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Preparando tu armario…
          </Text>
        </View>
      </View>
    );
  }

  if (photoUri) {
    return (
      <View style={styles.fill}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "web" ? undefined : "padding"}
          keyboardVerticalOffset={0}
        >
            <ScrollView
              ref={previewScrollRef}
              style={styles.fill}
              contentInsetAdjustmentBehavior="never"
              contentContainerStyle={[
                styles.previewContent,
                {
                  paddingHorizontal: nativeLayout.screenHorizontalPadding,
                  paddingTop: screenTopInset + 16,
                  paddingBottom: screenBottomInset + 120,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.previewHeader}>
                <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
                  NUEVA PRENDA
                </Text>
              </View>
              <GlassView
                style={[
                  styles.previewFrame,
                  {
                    height: previewHeight,
                    borderColor: colors.glassBorder,
                    backgroundColor: colors.card,
                  },
                ]}
              >
                <Image
                  source={{ uri: photoUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                  accessibilityLabel="Vista previa de la prenda"
                />
              </GlassView>
              <View style={styles.noteGroup}>
                <Text
                  style={[styles.sectionLabel, { color: colors.textPrimary }]}
                >
                  NOTA (OPCIONAL)
                </Text>
                <TextInput
                  accessibilityLabel="Descripción opcional de la prenda"
                  testID="wardrobe-capture-note"
                  value={note}
                  onChangeText={setNote}
                  placeholder="¿Qué prenda es? ¿Te queda grande, ajustada…?"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={160}
                  multiline
                  textAlignVertical="top"
                  returnKeyType="default"
                  blurOnSubmit={false}
                  onFocus={() => {
                    setTimeout(
                      () =>
                        previewScrollRef.current?.scrollToEnd({
                          animated: true,
                        }),
                      180,
                    );
                  }}
                  style={[
                    styles.noteInput,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.fieldBorder,
                      backgroundColor: colors.fieldBg,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.characterCount,
                    { color: colors.textSecondary },
                  ]}
                >
                  {note.length}/160
                </Text>
              </View>
              {error ? (
                <Text
                  accessibilityRole="alert"
                  style={[styles.errorText, { color: colors.destructive }]}
                >
                  {error}
                </Text>
              ) : null}
              <View style={styles.previewActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Descartar foto y repetir"
                  testID="repeat-wardrobe-photo"
                  disabled={savingPhoto}
                  onPress={repeatPhoto}
                  style={({ pressed }) => [
                    styles.previewAction,
                    pressed && !savingPhoto && styles.pressed,
                    savingPhoto && styles.disabledButton,
                  ]}
                >
                  <GlassView
                    borderRadius={nativeLayout.pillRadius}
                    style={[
                      styles.secondaryAction,
                      { borderColor: colors.border },
                    ]}
                  >
                    <ArrowLeft size={17} color={colors.primary} />
                    <Text
                      style={[
                        styles.previewActionText,
                        { color: colors.primary },
                      ]}
                    >
                      Repetir
                    </Text>
                  </GlassView>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  testID="save-and-add-another"
                  disabled={savingPhoto}
                  onPress={() => void saveCurrentPhoto()}
                  style={({ pressed }) => [
                    styles.previewAction,
                    styles.primaryAction,
                    { backgroundColor: colors.primary },
                    savingPhoto && styles.disabledButton,
                    pressed && !savingPhoto && styles.pressed,
                  ]}
                >
                  {savingPhoto ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Plus size={17} color={colors.primaryForeground} />
                  )}
                  <Text
                    style={[
                      styles.previewActionText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    {savingPhoto ? "Guardando…" : "Guardar y añadir otra"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <View
        style={[
          styles.cameraRoot,
          { backgroundColor: colors.cameraBackground },
        ]}
      >
        {cameraGranted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
            onMountError={() => {
              setCameraReady(false);
              setError("No se pudo iniciar la cámara. Inténtalo de nuevo.");
            }}
          />
        ) : null}
        <View
          style={[
            styles.cameraOverlay,
            {
              paddingHorizontal: nativeLayout.screenHorizontalPadding,
              paddingTop: screenTopInset,
              paddingBottom: screenBottomInset,
            },
          ]}
        >
          <View style={styles.cameraTopBar}>
            <GlassView
              borderRadius={nativeLayout.pillRadius}
              style={[
                styles.countChip,
                { borderColor: colors.glassBorder },
              ]}
            >
              <Text style={[styles.countText, { color: colors.textPrimary }]}>
                {countLabel}
              </Text>
            </GlassView>
            {wardrobe.length >= 1 ? (
              <Pressable
                accessibilityRole="button"
                testID="confirm-wardrobe"
                disabled={actionsBusy}
                onPress={() => void confirmWardrobe()}
                style={({ pressed }) => [
                  pressed && !actionsBusy && styles.pressed,
                  actionsBusy && styles.disabledButton,
                ]}
              >
                <GlassView
                  borderRadius={nativeLayout.pillRadius}
                  style={[
                    styles.confirmChip,
                    { borderColor: colors.glassBorder },
                  ]}
                >
                  <Text
                    style={[styles.confirmText, { color: colors.textPrimary }]}
                  >
                    {confirming
                      ? "Guardando…"
                      : fromPlus
                        ? "Listo"
                        : "Confirmar armario"}
                  </Text>
                </GlassView>
              </Pressable>
            ) : (
              <View style={styles.topBarSpacer} />
            )}
          </View>

          <View style={styles.cameraRest}>
            {!cameraGranted ? (
              <View style={styles.permissionState}>
                {cameraPermission ? (
                  <Camera size={30} color={colors.textSecondary} />
                ) : (
                  <ActivityIndicator color={colors.primary} />
                )}
                <Text
                  style={[
                    styles.permissionTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Necesitamos acceso a la cámara
                </Text>
                <Text
                  style={[
                    styles.permissionCopy,
                    { color: colors.textSecondary },
                  ]}
                >
                  También puedes añadir varias prendas desde tu galería.
                </Text>
                {toast ? (
                  <Animated.View style={toastAnimatedStyle}>
                    <GlassView
                      borderRadius={nativeLayout.pillRadius}
                      style={[styles.notice, styles.permissionToast]}
                    >
                      <Text
                        accessibilityLiveRegion="polite"
                        style={[
                          styles.noticeText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {toast}
                      </Text>
                    </GlassView>
                  </Animated.View>
                ) : null}
                {error ? (
                  <Text
                    accessibilityRole="alert"
                    style={[
                      styles.permissionError,
                      { color: colors.destructive },
                    ]}
                  >
                    {error}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  testID="choose-wardrobe-gallery"
                  disabled={gallerySaving}
                  onPress={() => void chooseFromGallery(false)}
                  style={({ pressed }) => [
                    styles.permissionButton,
                    { backgroundColor: colors.primary },
                    gallerySaving && styles.disabledButton,
                    pressed && !gallerySaving && styles.pressed,
                  ]}
                >
                  <ImagePlus size={18} color={colors.primaryForeground} />
                  <Text
                    style={[
                      styles.permissionButtonText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    {gallerySaving ? "Abriendo…" : "Elegir una foto"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Añadir varias prendas desde la galería"
                  testID="choose-multiple-wardrobe-gallery"
                  disabled={gallerySaving}
                  onPress={() => void chooseFromGallery(true)}
                  style={({ pressed }) => [
                    styles.permissionSecondary,
                    gallerySaving && styles.disabledButton,
                    pressed && !gallerySaving && styles.pressed,
                  ]}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text
                    style={[
                      styles.permissionSecondaryText,
                      { color: colors.primary },
                    ]}
                  >
                    Añadir varias fotos
                  </Text>
                </Pressable>
                {cameraPermissionBlocked ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={openCameraSettings}
                    style={styles.permissionSecondary}
                  >
                    <Settings size={16} color={colors.primary} />
                    <Text
                      style={[
                        styles.permissionSecondaryText,
                        { color: colors.primary },
                      ]}
                    >
                      Abrir ajustes de cámara
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={!cameraPermission || gallerySaving}
                    onPress={() => void requestCameraAccess()}
                    style={styles.permissionSecondary}
                  >
                    <Text
                      style={[
                        styles.permissionSecondaryText,
                        { color: colors.primary },
                      ]}
                    >
                      Permitir cámara
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                <View style={styles.cameraMessages}>
                  {!cameraReady && !error && !gallerySaving ? (
                    <View style={styles.cameraLoading}>
                      <ActivityIndicator color={colors.primaryForeground} />
                    </View>
                  ) : null}
                  {gallerySaving && galleryProgress ? (
                    <GlassView
                      borderRadius={nativeLayout.pillRadius}
                      style={styles.notice}
                    >
                      <ActivityIndicator color={colors.primary} size="small" />
                      <Text
                        style={[
                          styles.noticeText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Guardando {galleryProgress.completed} de{" "}
                        {galleryProgress.total}…
                      </Text>
                    </GlassView>
                  ) : null}
                  {toast ? (
                    <Animated.View style={toastAnimatedStyle}>
                      <GlassView
                        borderRadius={nativeLayout.pillRadius}
                        style={styles.notice}
                      >
                        <Text
                          accessibilityLiveRegion="polite"
                          style={[
                            styles.noticeText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {toast}
                        </Text>
                      </GlassView>
                    </Animated.View>
                  ) : null}
                  {error ? (
                    <GlassView
                      borderRadius={nativeLayout.cardRadius}
                      style={styles.notice}
                    >
                      <Text
                        accessibilityRole="alert"
                        style={[
                          styles.noticeText,
                          { color: colors.destructive },
                        ]}
                      >
                        {error}
                      </Text>
                    </GlassView>
                  ) : null}
                </View>
                <View style={styles.cameraBottomBar}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Elegir una foto de la galería"
                    testID="choose-wardrobe-gallery"
                    disabled={gallerySaving || confirming}
                    onPress={() => void chooseFromGallery(false)}
                    style={({ pressed }) => [
                      styles.roundButton,
                      pressed && !gallerySaving && styles.pressed,
                      gallerySaving && styles.disabledButton,
                    ]}
                  >
                    <GlassView
                      borderRadius={nativeLayout.pillRadius}
                      style={[
                        styles.roundButtonGlass,
                        { borderColor: colors.glassBorder },
                      ]}
                    >
                      <ImagePlus size={22} color={colors.textPrimary} />
                    </GlassView>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Hacer foto de una prenda"
                    testID="capture-wardrobe-photo"
                    disabled={!cameraReady || takingPhoto || actionsBusy}
                    onPress={() => void takePhoto()}
                    style={({ pressed }) => [
                      styles.shutterOuter,
                      { borderColor: colors.primaryForeground },
                      (!cameraReady || takingPhoto || actionsBusy) &&
                        styles.disabledButton,
                      pressed && cameraReady && !takingPhoto && styles.pressed,
                    ]}
                  >
                    {takingPhoto ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <View
                        style={[
                          styles.shutterInner,
                          { backgroundColor: colors.primaryForeground },
                        ]}
                      />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Elegir varias fotos de la galería"
                    testID="open-wardrobe-gallery"
                    disabled={gallerySaving || confirming}
                    onPress={() => void chooseFromGallery(true)}
                    style={({ pressed }) => [
                      styles.roundButton,
                      pressed && !gallerySaving && styles.pressed,
                      gallerySaving && styles.disabledButton,
                    ]}
                  >
                    <GlassView
                      borderRadius={nativeLayout.pillRadius}
                      style={[
                        styles.roundButtonGlass,
                        { borderColor: colors.glassBorder },
                      ]}
                    >
                      <Plus size={22} color={colors.textPrimary} />
                    </GlassView>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 3,
  },
  loadingText: { fontFamily: "Satoshi_400Regular", fontSize: 14 },
  cameraRoot: { flex: 1 },
  cameraOverlay: { flex: 1 },
  cameraTopBar: {
    minHeight: nativeLayout.primaryButtonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countChip: {
    minHeight: 44,
    paddingHorizontal: nativeLayout.baseSpacing * 4,
    justifyContent: "center",
  },
  countText: { fontFamily: "Satoshi_700Bold", fontSize: 14 },
  confirmChip: {
    minHeight: 44,
    paddingHorizontal: nativeLayout.baseSpacing * 4,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { fontFamily: "Satoshi_700Bold", fontSize: 13 },
  topBarSpacer: { width: nativeLayout.primaryButtonHeight },
  cameraRest: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: nativeLayout.baseSpacing * 2,
  },
  cameraMessages: {
    alignItems: "center",
    gap: nativeLayout.baseSpacing * 2,
    paddingTop: nativeLayout.baseSpacing * 3,
  },
  cameraLoading: { padding: nativeLayout.baseSpacing * 3 },
  notice: {
    minHeight: 42,
    paddingHorizontal: nativeLayout.baseSpacing * 4,
    paddingVertical: nativeLayout.baseSpacing * 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
    maxWidth: "100%",
  },
  noticeText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    flexShrink: 1,
  },
  cameraBottomBar: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roundButton: { width: 56, height: 56 },
  roundButtonGlass: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: nativeLayout.pillRadius,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: nativeLayout.pillRadius,
  },
  permissionState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: nativeLayout.baseSpacing * 5,
  },
  permissionTitle: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 18,
    lineHeight: 25,
    textAlign: "center",
    marginTop: nativeLayout.baseSpacing * 4,
  },
  permissionCopy: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: nativeLayout.baseSpacing * 2,
  },
  permissionToast: { marginTop: nativeLayout.baseSpacing * 3 },
  permissionError: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: nativeLayout.baseSpacing * 2,
  },
  permissionButton: {
    minHeight: nativeLayout.primaryButtonHeight,
    borderRadius: nativeLayout.pillRadius,
    paddingHorizontal: nativeLayout.baseSpacing * 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
    marginTop: nativeLayout.baseSpacing * 5,
  },
  permissionButtonText: { fontFamily: "Satoshi_700Bold", fontSize: 14 },
  permissionSecondary: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing * 2,
  },
  permissionSecondaryText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 14,
  },
  previewContent: {
    flexGrow: 1,
    gap: nativeLayout.baseSpacing * 3,
  },
  previewHeader: {
    minHeight: nativeLayout.primaryButtonHeight,
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 11,
    letterSpacing: 1.4,
  },
  previewFrame: {
    width: "100%",
    borderWidth: 1,
    borderRadius: nativeLayout.cardRadius,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: { width: "100%", height: "100%" },
  noteGroup: { gap: nativeLayout.baseSpacing * 2 },
  sectionLabel: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 11,
    letterSpacing: 1.1,
  },
  noteInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: nativeLayout.cardRadius,
    paddingHorizontal: nativeLayout.baseSpacing * 4,
    paddingVertical: nativeLayout.baseSpacing * 3,
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  characterCount: {
    alignSelf: "flex-end",
    fontFamily: "Satoshi_400Regular",
    fontSize: 12,
  },
  previewActions: {
    flexDirection: "row",
    gap: nativeLayout.baseSpacing * 2,
    marginTop: nativeLayout.baseSpacing,
  },
  previewAction: {
    flex: 1,
    minHeight: nativeLayout.primaryButtonHeight,
    borderRadius: nativeLayout.pillRadius,
    overflow: "hidden",
  },
  secondaryAction: {
    flex: 1,
    minHeight: nativeLayout.primaryButtonHeight,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing,
    paddingHorizontal: nativeLayout.baseSpacing * 2,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: nativeLayout.baseSpacing,
    paddingHorizontal: nativeLayout.baseSpacing * 2,
  },
  previewActionText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 13,
    textAlign: "center",
    flexShrink: 1,
  },
  errorText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  disabledButton: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
