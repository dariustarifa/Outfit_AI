import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, ImagePlus, Save, Trash2, X } from "lucide-react-native";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { GradientBackground } from "@workspace/outfit-design-system/components/native/gradient-background";
import {
  nativeEffects,
  nativeLayout,
} from "@workspace/outfit-design-system/lib/native-theme";
import { useColors } from "@workspace/outfit-design-system/hooks/use-colors";
import { useApp } from "@/src/context/AppContext";
import { selection, success } from "@/src/haptics";

export default function WardrobeItemScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { wardrobe, loading, addItem, updateItem, removeItem } = useApp();
  const existingItem = id ? wardrobe.find((item) => item.id === id) : undefined;
  const [note, setNote] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [formReady, setFormReady] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mediaPermission, requestMediaPermission] =
    ImagePicker.useMediaLibraryPermissions();

  useEffect(() => {
    if (!id || loading) return;
    if (!existingItem) {
      setFormReady(true);
      return;
    }
    setNote(existingItem.note);
    setPhotoUri(existingItem.imageUri);
    setFormReady(true);
  }, [existingItem, id, loading]);

  const setPhoto = useCallback((uri: string) => {
    setPhotoUri(uri);
    setMessage(null);
  }, []);

  const chooseFromLibrary = useCallback(async () => {
    await selection();
    setMessage(null);
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
          } else {
            setMessage("Necesitamos acceso a tus fotos para elegir una imagen.");
          }
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setPhoto(result.assets[0].uri);
        await selection();
      }
    } catch {
      setMessage("No se pudo abrir la galería. Inténtalo de nuevo.");
    }
  }, [mediaPermission?.granted, requestMediaPermission, setPhoto]);

  const save = useCallback(async () => {
    if (!photoUri || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      if (id && existingItem) {
        await updateItem(id, {
          note: note.trim(),
          ...(photoUri !== existingItem.imageUri ? { imageUri: photoUri } : {}),
        });
      } else {
        await addItem({ imageUri: photoUri, note: note.trim() });
      }
      await success();
      router.back();
    } catch {
      setMessage("No se pudo guardar la prenda. Comprueba el espacio disponible e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }, [addItem, existingItem, id, note, photoUri, saving, updateItem]);

  const remove = useCallback(() => {
    if (!id || !existingItem) return;
    const runRemove = async () => {
      setMessage(null);
      try {
        await removeItem(id);
        await success();
        router.back();
      } catch {
        setMessage("No se pudo eliminar la prenda. Inténtalo de nuevo.");
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("¿Quieres eliminar esta prenda y su foto?")) {
        void runRemove();
      }
      return;
    }

    Alert.alert("Eliminar prenda", "También se eliminará la foto guardada.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => void runRemove() },
    ]);
  }, [existingItem, id, removeItem]);

  if (id && (loading || !formReady)) {
    return (
      <GradientBackground style={styles.fill}>
        <SafeAreaView style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Preparando la prenda…
          </Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (id && !existingItem) {
    return (
      <GradientBackground style={styles.fill}>
        <SafeAreaView style={styles.loadingState}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            No encontramos esta prenda
          </Text>
          <Pressable onPress={() => router.back()} style={styles.textButton}>
            <Text style={[styles.textButtonLabel, { color: colors.primary }]}>
              Volver al armario
            </Text>
          </Pressable>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const isEditing = Boolean(id);

  return (
    <GradientBackground style={styles.fill}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                testID="back-to-wardrobe"
                onPress={() => router.back()}
                hitSlop={10}
                style={styles.backButton}
              >
                <ArrowLeft size={22} color={colors.textPrimary} />
              </Pressable>
              <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
                {isEditing ? "TU ARMARIO" : "NUEVA PRENDA"}
              </Text>
              <View style={styles.topBarSpacer} />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {isEditing ? "Editar prenda" : "Añade una prenda"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Guarda una foto y una nota para reconocerla fácilmente.
            </Text>

            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              FOTO DE LA PRENDA
            </Text>
            {photoUri ? (
              <View
                style={[
                  styles.previewFrame,
                  {
                    borderColor: nativeEffects.glass.borderColor,
                    backgroundColor: colors.muted,
                  },
                ]}
              >
                <Image
                  source={{ uri: photoUri }}
                  style={styles.previewImage}
                  accessibilityLabel="Foto seleccionada de la prenda"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quitar foto seleccionada"
                  testID="clear-item-photo"
                  onPress={() => {
                    void selection();
                    setPhotoUri(null);
                  }}
                  style={styles.clearPhotoButton}
                >
                  <GlassView borderRadius={nativeLayout.pillRadius} style={styles.clearPhotoGlass}>
                    <X size={18} color={colors.foreground} />
                  </GlassView>
                </Pressable>
              </View>
            ) : (
              <GlassView style={styles.photoPlaceholder}>
                <View style={styles.placeholderContent}>
                  <ImagePlus size={30} color={colors.textSecondary} />
                  <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                    Elige una foto para empezar
                  </Text>
                </View>
              </GlassView>
            )}

            <View style={styles.photoActions}>
              {Platform.OS !== "web" ? (
                <Pressable
                  accessibilityRole="button"
                  testID="take-item-photo"
                  onPress={() => {
                    void selection();
                    setMessage(null);
                    setCameraOpen(true);
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Camera size={18} color={colors.primary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                    Hacer foto
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                testID="choose-item-photo"
                onPress={() => void chooseFromLibrary()}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <ImagePlus size={18} color={colors.primary} />
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Elegir de galería
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionLabel, styles.noteLabel, { color: colors.textPrimary }]}>
              NOTA <Text style={{ color: colors.textSecondary, fontFamily: "Satoshi_400Regular" }}>(opcional)</Text>
            </Text>
            <TextInput
              accessibilityLabel="Nota de la prenda"
              testID="item-note-input"
              value={note}
              onChangeText={setNote}
              placeholder="Ej. Camisa blanca de lino"
              placeholderTextColor={colors.textSecondary}
              maxLength={160}
              multiline
              textAlignVertical="top"
              style={[
                styles.noteInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            />
            <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
              {note.length}/160
            </Text>

            {message ? (
              <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.destructive }]}>
                {message}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              testID="save-wardrobe-item"
              disabled={!photoUri || saving}
              onPress={() => void save()}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: colors.primary },
                (!photoUri || saving) && styles.disabledButton,
                pressed && photoUri && !saving && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Save size={18} color={colors.primaryForeground} />
              )}
              <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>
                {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Guardar prenda"}
              </Text>
            </Pressable>

            {isEditing ? (
              <Pressable
                accessibilityRole="button"
                testID="remove-wardrobe-item"
                onPress={() => {
                  void selection();
                  remove();
                }}
                style={styles.removeButton}
              >
                <Trash2 size={16} color={colors.destructive} />
                <Text style={[styles.removeButtonText, { color: colors.destructive }]}>
                  Eliminar prenda
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CameraCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(uri) => {
          setPhoto(uri);
          setCameraOpen(false);
          void selection();
        }}
      />
    </GradientBackground>
  );
}

function CameraCaptureModal({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
}) {
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    if (visible) setCameraError(false);
  }, [visible]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || takingPhoto) return;
    setTakingPhoto(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (picture?.uri) onCapture(picture.uri);
      else setCameraError(true);
    } catch {
      setCameraError(true);
    } finally {
      setTakingPhoto(false);
    }
  }, [onCapture, takingPhoto]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.cameraScreen, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.cameraSafeArea}>
          <View style={styles.cameraTopBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar cámara"
              onPress={onClose}
              hitSlop={10}
              style={styles.cameraClose}
            >
              <X size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.cameraTitle, { color: colors.textPrimary }]}>
              Fotografía la prenda
            </Text>
            <View style={styles.topBarSpacer} />
          </View>
          {!permission ? (
            <View style={styles.permissionState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : !permission.granted ? (
            <View style={styles.permissionState}>
              <Camera size={34} color={colors.textSecondary} />
              <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
                Permite usar la cámara
              </Text>
              <Text style={[styles.permissionCopy, { color: colors.textSecondary }]}>
                Necesitamos acceso a la cámara para fotografiar tu prenda.
              </Text>
              {permission.status === "denied" && !permission.canAskAgain ? (
                <Pressable
                  onPress={() => void Linking.openSettings().catch(() => undefined)}
                  style={[styles.permissionButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.permissionButtonText, { color: colors.primaryForeground }]}>
                    Abrir ajustes
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    void selection();
                    void requestPermission();
                  }}
                  style={[styles.permissionButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.permissionButtonText, { color: colors.primaryForeground }]}>
                    Permitir cámara
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              <View style={styles.cameraPreview}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  animateShutter
                  onMountError={() => setCameraError(true)}
                />
                <View pointerEvents="none" style={styles.cameraGuide} />
              </View>
              {cameraError ? (
                <Text style={[styles.cameraError, { color: colors.destructive }]}>
                  No se pudo tomar la foto. Comprueba la cámara e inténtalo de nuevo.
                </Text>
              ) : null}
              <View style={styles.captureArea}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tomar foto"
                  testID="capture-wardrobe-photo"
                  disabled={takingPhoto}
                  onPress={() => void takePhoto()}
                  style={({ pressed }) => [
                    styles.shutterOuter,
                    { borderColor: colors.primary },
                    pressed && styles.pressed,
                    takingPhoto && styles.disabledButton,
                  ]}
                >
                  <View style={[styles.shutterInner, { backgroundColor: colors.primary }]} />
                </Pressable>
              </View>
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: nativeLayout.screenHorizontalPadding,
    paddingTop: 8,
    paddingBottom: 36,
  },
  topBar: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  topBarSpacer: { width: 40 },
  eyebrow: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 11,
    letterSpacing: 1.6,
  },
  title: { fontFamily: "Melodrama_500Medium", fontSize: 34, lineHeight: 40 },
  subtitle: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 11,
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  photoPlaceholder: { height: 270 },
  placeholderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  placeholderText: { fontFamily: "Satoshi_500Medium", fontSize: 14 },
  previewFrame: {
    height: 310,
    overflow: "hidden",
    borderRadius: nativeLayout.cardRadius,
    borderWidth: 1,
    borderColor: "transparent",
  },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  clearPhotoButton: { position: "absolute", top: 10, right: 10 },
  clearPhotoGlass: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  photoActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: nativeLayout.pillRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  secondaryButtonText: { fontFamily: "Satoshi_700Bold", fontSize: 13 },
  noteLabel: { marginTop: 24 },
  noteInput: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  characterCount: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 12,
    textAlign: "right",
    marginTop: 6,
  },
  errorText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  saveButton: {
    minHeight: nativeLayout.primaryButtonHeight,
    borderRadius: nativeLayout.pillRadius,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  saveButtonText: { fontFamily: "Satoshi_700Bold", fontSize: 15 },
  disabledButton: { opacity: 0.4 },
  removeButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  removeButtonText: { fontFamily: "Satoshi_500Medium", fontSize: 14 },
  textButton: { paddingVertical: 12 },
  textButtonLabel: { fontFamily: "Satoshi_700Bold", fontSize: 15 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontFamily: "Satoshi_400Regular", fontSize: 14 },
  errorTitle: { fontFamily: "Satoshi_700Bold", fontSize: 18, textAlign: "center" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  cameraScreen: { flex: 1 },
  cameraSafeArea: { flex: 1, paddingHorizontal: 20 },
  cameraTopBar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cameraClose: { width: 40, height: 40, justifyContent: "center" },
  cameraTitle: { fontFamily: "Satoshi_700Bold", fontSize: 15 },
  cameraPreview: {
    flex: 1,
    overflow: "hidden",
    borderRadius: nativeLayout.cardRadius,
    marginTop: 12,
    position: "relative",
  },
  cameraGuide: {
    position: "absolute",
    top: "12%",
    left: "12%",
    right: "12%",
    bottom: "12%",
    borderColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderRadius: 20,
  },
  cameraError: { fontFamily: "Satoshi_500Medium", fontSize: 13, textAlign: "center", marginTop: 8 },
  captureArea: {
    height: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28 },
  permissionState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  permissionTitle: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 18,
    marginTop: 18,
    textAlign: "center",
  },
  permissionCopy: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
  permissionButton: {
    minHeight: 52,
    paddingHorizontal: 28,
    borderRadius: nativeLayout.pillRadius,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  permissionButtonText: { fontFamily: "Satoshi_700Bold", fontSize: 14 },
});
