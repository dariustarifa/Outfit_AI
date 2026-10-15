import { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowRight,
  ArrowUp,
  FileText,
  Home,
  Paperclip,
  Plus,
  User,
  X,
} from "lucide-react-native";
import Animated, {
  SlideInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import {
  BAR_HEIGHT,
  BAR_WIDTH,
  nativeEffects,
  nativeLayout,
  useColors,
} from "../theme";
import { success, tapLight } from "../haptics";
import { WardrobeAddSheet } from "./WardrobeAddSheet";

export interface PlanAttachment {
  id: string;
  uri: string;
  name: string;
  mimeType?: string;
  kind: "image" | "file";
}

type Screen = "home" | "profile";

interface HomeControlsProps {
  screen: Screen;
  onScreenChange: (screen: Screen) => void;
}

const spring = { damping: 20, stiffness: 220, mass: 1 };

function makeAttachment(
  uri: string,
  name: string,
  mimeType: string | undefined,
  kind: PlanAttachment["kind"],
): PlanAttachment {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    uri,
    name,
    mimeType,
    kind,
  };
}

export function HomeControls({ screen, onScreenChange }: HomeControlsProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barWidth = BAR_WIDTH(width);
  const tabSlotWidth = barWidth / 3;
  const barBottom = Math.max(insets.bottom - 12, 12);
  const [expanded, setExpanded] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PlanAttachment[]>([]);
  const [toast, setToast] = useState("");
  const inputRef = useRef<TextInput>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOffset = useSharedValue(Dimensions.get("screen").height);
  const progress = useSharedValue(0);
  const activeTabProgress = useSharedValue(screen === "profile" ? 1 : 0);
  const pressScale = useSharedValue(1);
  const toastAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastOffset.value }],
  }));

  useEffect(() => {
    if (!toast) {
      toastOffset.value = Dimensions.get("screen").height;
      return;
    }
    toastOffset.value = Dimensions.get("screen").height;
    toastOffset.value = withSpring(0, spring);
  }, [toast, toastOffset]);

  useEffect(() => {
    progress.value = withSpring(expanded ? 1 : 0, spring);
  }, [expanded, progress]);

  useEffect(() => {
    activeTabProgress.value = withSpring(
      screen === "profile" ? 1 : 0,
      spring,
    );
  }, [activeTabProgress, screen]);

  useEffect(() => {
    if (!expanded) return;
    const listener = Keyboard.addListener("keyboardDidHide", () => {
      if (!text.trim()) setExpanded(false);
    });
    return () => listener.remove();
  }, [expanded, text]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 1900);
  };

  const openComposer = () => {
    void tapLight();
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 120);
  };

  const closeComposer = () => {
    setExpanded(false);
    Keyboard.dismiss();
  };

  const appendImage = (asset: ImagePicker.ImagePickerAsset) => {
    setAttachments((previous) => [
      ...previous,
      makeAttachment(
        asset.uri,
        asset.fileName ?? "Foto",
        asset.mimeType ?? undefined,
        "image",
      ),
    ]);
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showToast("Activa el acceso a la cámara para hacer una foto.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (!result.canceled) result.assets.forEach(appendImage);
    } catch {
      showToast("No se pudo abrir la cámara.");
    }
  };

  const chooseFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.85,
      });
      if (!result.canceled) result.assets.forEach(appendImage);
    } catch {
      showToast("No se pudo abrir la galería.");
    }
  };

  const chooseFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled) {
        setAttachments((previous) => [
          ...previous,
          ...result.assets.map((asset) =>
            makeAttachment(asset.uri, asset.name, asset.mimeType, "file"),
          ),
        ]);
      }
    } catch {
      showToast("No se pudo abrir el selector de archivos.");
    }
  };

  const openAttachmentOptions = () => {
    void tapLight();
    const options = [
      "Hacer foto",
      "Elegir de la galería",
      "Elegir archivo",
      "Cancelar",
    ];
    const handlers = [takePhoto, chooseFromGallery, chooseFile];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3 },
        (index) => {
          if (index >= 0 && index < handlers.length) {
            void handlers[index]?.();
          }
        },
      );
      return;
    }
    Alert.alert("Adjuntar", undefined, [
      { text: options[0], onPress: () => void takePhoto() },
      { text: options[1], onPress: () => void chooseFromGallery() },
      { text: options[2], onPress: () => void chooseFile() },
      { text: options[3], style: "cancel" },
    ]);
  };

  const onSubmitPlan = (payload: {
    text: string;
    attachments: PlanAttachment[];
  }) => {
    console.log("Plan enviado", payload);
  };

  const sendPlan = () => {
    if (!text.trim() && attachments.length === 0) return;
    const payload = { text: text.trim(), attachments };
    void success();
    setText("");
    setAttachments([]);
    setExpanded(false);
    Keyboard.dismiss();
    onSubmitPlan(payload);
    showToast("Enviado");
  };

  const morphStyle = useAnimatedStyle(() => {
    const openHeight = attachments.length > 0 ? 270 : 198;
    return {
      height: interpolate(progress.value, [0, 1], [BAR_HEIGHT, openHeight]),
      borderRadius: interpolate(progress.value, [0, 1], [999, 28]),
    };
  });

  const composerContentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const planButtonStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: pressScale.value }],
  }));

  const tabBarStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [BAR_HEIGHT, 0]),
    transform: [{ translateY: BAR_HEIGHT * progress.value }],
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeTabProgress.value * (tabSlotWidth * 2) }],
  }));

  const canSend = Boolean(text.trim()) || attachments.length > 0;
  const highlightStart = tabSlotWidth / 2 - 46;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {expanded ? (
        <Pressable
          accessibilityLabel="Cerrar el campo de petición"
          onPress={closeComposer}
          style={[StyleSheet.absoluteFill, styles.dim]}
        />
      ) : null}

      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            toastAnimatedStyle,
            {
              top:
                Platform.OS === "web"
                  ? Math.max(insets.top, 67) + 12
                  : insets.top + 12,
            },
          ]}
          pointerEvents="none"
        >
          <GlassView borderRadius={nativeLayout.pillRadius} style={styles.toastGlass}>
            <Text style={[styles.toastText, { color: colors.textPrimary }]}>
              {toast}
            </Text>
          </GlassView>
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.footer,
          { bottom: barBottom },
        ]}
        pointerEvents="box-none"
      >
        {screen === "home" ? (
          <Animated.View
            entering={SlideInDown.duration(250).delay(240)}
            style={[
              styles.morphShell,
              { width: barWidth, marginBottom: nativeLayout.baseSpacing * 3 },
              morphStyle,
            ]}
          >
            <GlassView
              borderRadius={expanded ? 28 : nativeLayout.pillRadius}
              style={StyleSheet.absoluteFill}
            >
              <View style={StyleSheet.absoluteFill} />
            </GlassView>
            <Animated.View
              pointerEvents={expanded ? "auto" : "none"}
              style={[StyleSheet.absoluteFill, composerContentStyle]}
            >
              {expanded ? (
                <View style={styles.composerContent}>
                  {attachments.length > 0 ? (
                    <ScrollView
                      horizontal
                      contentInsetAdjustmentBehavior="never"
                      showsHorizontalScrollIndicator={false}
                      style={styles.attachmentList}
                      contentContainerStyle={styles.attachmentRow}
                    >
                      {attachments.map((attachment) => (
                        <View key={attachment.id} style={styles.attachment}>
                          {attachment.kind === "image" ? (
                            <Image
                              source={{ uri: attachment.uri }}
                              style={styles.attachmentImage}
                              accessibilityLabel={attachment.name}
                            />
                          ) : (
                            <View
                              style={[
                                styles.fileAttachment,
                                { backgroundColor: colors.secondary },
                              ]}
                            >
                              <FileText size={22} color={colors.textSecondary} />
                            </View>
                          )}
                          <Pressable
                            accessibilityLabel={`Quitar ${attachment.name}`}
                            onPress={() =>
                              setAttachments((previous) =>
                                previous.filter((item) => item.id !== attachment.id),
                              )
                            }
                            hitSlop={8}
                            style={[
                              styles.removeAttachment,
                              { backgroundColor: colors.textPrimary },
                            ]}
                          >
                            <X size={12} color={colors.background} strokeWidth={2} />
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  ) : null}

                  <TextInput
                    ref={inputRef}
                    value={text}
                    onChangeText={setText}
                    placeholder="Escribe tu petición…"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    autoFocus
                    scrollEnabled
                    textAlignVertical="top"
                    maxLength={3000}
                    style={[
                      styles.input,
                      { color: colors.textPrimary },
                    ]}
                  />

                  <View style={styles.composerActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Adjuntar archivo o foto"
                      onPress={openAttachmentOptions}
                      style={styles.attachButton}
                    >
                      <Paperclip size={22} color={colors.textSecondary} strokeWidth={1.7} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Enviar petición"
                      accessibilityState={{ disabled: !canSend }}
                      disabled={!canSend}
                      onPress={sendPlan}
                      style={[
                        styles.sendButton,
                        { backgroundColor: colors.gold, opacity: canSend ? 1 : 0.4 },
                      ]}
                    >
                      <ArrowUp size={22} color={colors.background} strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </Animated.View>
            {!expanded ? (
              <Animated.View style={[styles.planButton, planButtonStyle]}>
                <Pressable
                  accessibilityRole="button"
                  onPress={openComposer}
                  onPressIn={() => {
                    pressScale.value = withSpring(0.97, spring);
                  }}
                  onPressOut={() => {
                    pressScale.value = withSpring(1, spring);
                  }}
                  style={styles.planPressable}
                >
                  <Text style={[styles.planText, { color: colors.textPrimary }]}>
                    ¿Cuál es el plan de hoy?
                  </Text>
                  <ArrowRight size={20} color={colors.gold} strokeWidth={1.8} />
                </Pressable>
              </Animated.View>
            ) : null}
          </Animated.View>
        ) : null}

        <Animated.View
          entering={SlideInDown.duration(250).delay(320)}
          style={styles.tabBarEntrance}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.tabBarClip, tabBarStyle]}
            pointerEvents={expanded ? "none" : "auto"}
          >
            <GlassView
              borderRadius={nativeLayout.pillRadius}
              style={[styles.tabBar, { width: barWidth }]}
            >
              <View style={styles.tabBarContent}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.activeHighlight,
                    { left: highlightStart },
                    highlightStyle,
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Inicio"
                  accessibilityState={{ selected: screen === "home" }}
                  onPress={() => {
                    void tapLight();
                    onScreenChange("home");
                  }}
                  style={[styles.tabButton, { width: tabSlotWidth }]}
                >
                  <Home
                    size={26}
                    color={screen === "home" ? colors.gold : colors.iconInactive}
                    strokeWidth={1.5}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Añadir"
                  testID="add-wardrobe-item-tab"
                  onPress={() => {
                    setAddSheetVisible(true);
                  }}
                  style={[styles.tabButton, { width: tabSlotWidth }]}
                >
                  <Plus size={26} color={colors.iconInactive} strokeWidth={1.5} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Perfil"
                  accessibilityState={{ selected: screen === "profile" }}
                  onPress={() => {
                    void tapLight();
                    onScreenChange("profile");
                  }}
                  style={[styles.tabButton, { width: tabSlotWidth }]}
                >
                  <User
                    size={26}
                    color={screen === "profile" ? colors.gold : colors.iconInactive}
                    strokeWidth={1.5}
                  />
                </Pressable>
              </View>
            </GlassView>
          </Animated.View>
        </Animated.View>
      </View>
      <WardrobeAddSheet
        visible={addSheetVisible}
        onDismiss={() => setAddSheetVisible(false)}
        onToast={showToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    zIndex: 2,
  },
  morphShell: {
    overflow: "hidden",
    position: "relative",
    alignSelf: "center",
  },
  planButton: {
    flex: 1,
    justifyContent: "center",
  },
  planPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  planText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 18,
  },
  composerContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  attachmentList: {
    flexGrow: 0,
    marginBottom: 8,
  },
  attachmentRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 8,
  },
  attachment: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "visible",
  },
  attachmentImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  fileAttachment: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  removeAttachment: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.86,
  },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 140,
    padding: 0,
    borderWidth: 0,
    outlineWidth: 0,
    outlineColor: "transparent",
    fontFamily: "Satoshi_400Regular",
    fontSize: 17,
    lineHeight: 24,
  },
  composerActions: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  attachButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarClip: {
    overflow: "hidden",
    width: "100%",
    alignItems: "center",
  },
  tabBarEntrance: {
    width: "100%",
    alignItems: "center",
  },
  tabBar: {
    height: BAR_HEIGHT,
  },
  tabBarContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  activeHighlight: {
    position: "absolute",
    top: (BAR_HEIGHT - nativeEffects.activeTabHighlight.height) / 2,
    width: nativeEffects.activeTabHighlight.width,
    height: nativeEffects.activeTabHighlight.height,
    borderRadius: nativeLayout.pillRadius,
    backgroundColor: nativeEffects.activeTabHighlight.backgroundColor,
    borderWidth: nativeEffects.activeTabHighlight.borderWidth,
    borderColor: nativeEffects.activeTabHighlight.borderColor,
  },
  tabButton: {
    height: BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  toast: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    zIndex: 4,
  },
  toastGlass: {
    minWidth: 112,
    height: 44,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 15,
  },
});
