import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, X } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import {
  nativeEffects,
  nativeLayout,
} from "@workspace/outfit-design-system/lib/native-theme";
import { useColors } from "@workspace/outfit-design-system/hooks/use-colors";
import { useApp } from "@/src/context/AppContext";
import { selection, success } from "@/src/haptics";
import { saveGallerySelection } from "@/src/gallery-save";

interface WardrobeAddSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onToast: (message: string) => void;
}

const screenHeight = Dimensions.get("screen").height;

export function WardrobeAddSheet({
  visible,
  onDismiss,
  onToast,
}: WardrobeAddSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addItem } = useApp();
  const [busy, setBusy] = useState(false);
  const sheetOffset = useSharedValue(screenHeight);
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetOffset.value }],
  }));
  const [mediaPermission, requestMediaPermission] =
    ImagePicker.useMediaLibraryPermissions();
  useEffect(() => {
    if (!visible) {
      sheetOffset.value = screenHeight;
      return;
    }
    sheetOffset.value = screenHeight;
    sheetOffset.value = withSpring(0, {
      damping: 20,
      stiffness: 220,
      mass: 1,
    });
  }, [sheetOffset, visible]);
  const sheetBottomPadding =
    Platform.OS === "web"
      ? Math.max(insets.bottom, 34) + 16
      : insets.bottom + 16;

  const openCamera = () => {
    if (busy) return;
    void selection();
    onDismiss();
    setTimeout(() => {
      router.push({
        pathname: "/onboarding/wardrobe",
        params: { from: "plus" },
      } as never);
    }, 0);
  };

  const chooseFromGallery = async () => {
    if (busy) return;
    void selection();
    onDismiss();
    setBusy(true);
    onToast("Abriendo galería…");

    try {
      if (Platform.OS !== "web" && !mediaPermission?.granted) {
        const permission = await requestMediaPermission();
        if (!permission.granted) {
          onToast("Necesitamos acceso a tus fotos.");
          if (
            permission.status === "denied" &&
            !permission.canAskAgain
          ) {
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
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 0,
        quality: 0.85,
      });
      if (result.canceled || result.assets.length === 0) return;

      const saved = await saveGallerySelection(
        result.assets,
        addItem,
        ({ completed, total }) => {
          onToast(`Guardando ${completed} de ${total}…`);
        },
      );
      if (saved.added > 0) {
        await success();
        onToast(
          saved.added === 1
            ? "1 prenda añadida"
            : `${saved.added} prendas añadidas`,
        );
      }
      if (saved.failed > 0) {
        onToast(
          saved.added > 0
            ? `${saved.added} prendas añadidas · ${saved.failed} sin guardar`
            : "No se pudieron guardar las fotos.",
        );
      }
    } catch {
      onToast("No se pudo abrir la galería. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Cerrar menú de añadir"
          testID="close-add-wardrobe-sheet-backdrop"
          onPress={onDismiss}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.textPrimary, opacity: 0.24 },
          ]}
        />
        <Animated.View
          style={[styles.sheetOuter, sheetAnimatedStyle]}
        >
          <GlassView
            borderRadius={nativeLayout.cardRadius}
            style={[
              styles.sheet,
              { borderColor: nativeEffects.glass.borderColor },
            ]}
          >
            <View style={styles.grabberWrap}>
              <View
                style={[styles.grabber, { backgroundColor: colors.textSecondary }]}
              />
            </View>
            <View style={styles.sheetHeader}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Añadir prenda
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                testID="cancel-add-wardrobe"
                onPress={onDismiss}
                style={styles.closeButton}
              >
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              testID="add-wardrobe-take-photo"
              disabled={busy}
              onPress={openCamera}
              style={({ pressed }) => [
                styles.option,
                pressed && !busy && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              <GlassView
                borderRadius={nativeLayout.cardRadius}
                style={[
                  styles.optionSurface,
                  { borderColor: nativeEffects.glass.borderColor },
                ]}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Camera size={19} color={colors.primary} />
                  </View>
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                    Hacer foto
                  </Text>
                </View>
              </GlassView>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="add-wardrobe-choose-gallery"
              disabled={busy}
              onPress={() => void chooseFromGallery()}
              style={({ pressed }) => [
                styles.option,
                pressed && !busy && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              <GlassView
                borderRadius={nativeLayout.cardRadius}
                style={[
                  styles.optionSurface,
                  { borderColor: nativeEffects.glass.borderColor },
                ]}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <ImagePlus size={19} color={colors.primary} />
                  </View>
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                    Elegir de la galería
                  </Text>
                </View>
              </GlassView>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="cancel-add-wardrobe-text"
              onPress={onDismiss}
              style={styles.cancelAction}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                Cancelar
              </Text>
            </Pressable>
            <View style={{ height: sheetBottomPadding }} />
          </GlassView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  sheetOuter: { width: "100%" },
  sheet: {
    borderTopLeftRadius: nativeLayout.cardRadius,
    borderTopRightRadius: nativeLayout.cardRadius,
    borderWidth: 1,
    paddingHorizontal: nativeLayout.screenHorizontalPadding,
  },
  grabberWrap: {
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: nativeLayout.pillRadius,
    opacity: 0.48,
  },
  sheetHeader: {
    minHeight: nativeLayout.primaryButtonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: nativeLayout.baseSpacing * 2,
  },
  title: {
    fontFamily: "Melodrama_500Medium",
    fontSize: 29,
    lineHeight: 34,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    minHeight: nativeLayout.primaryButtonHeight,
    marginBottom: nativeLayout.baseSpacing * 2,
  },
  optionSurface: {
    flex: 1,
    minHeight: nativeLayout.primaryButtonHeight,
    borderWidth: 1,
  },
  optionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: nativeLayout.baseSpacing * 3,
    paddingHorizontal: nativeLayout.baseSpacing * 3,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: nativeLayout.pillRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { fontFamily: "Satoshi_700Bold", fontSize: 15 },
  cancelAction: {
    minHeight: nativeLayout.primaryButtonHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontFamily: "Satoshi_500Medium", fontSize: 14 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
