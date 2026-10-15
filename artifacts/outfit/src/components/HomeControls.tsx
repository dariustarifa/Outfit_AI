import { useCallback, useEffect, useRef, useState } from "react";
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
import { router, usePathname } from "expo-router";
import {
  getTabNavigationAction,
  isProfileTabActive,
  type TabRouteTarget,
} from "@/src/tab-navigation";
import Animated, {
  Easing,
  Extrapolation,
  runOnJS,
  interpolate,
  useAnimatedStyle,
  useAnimatedKeyboard,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import {
  BAR_HEIGHT,
  BAR_WIDTH,
  nativeLayout,
  radius,
  useTheme,
} from "../theme";
import { success, tapLight } from "../haptics";
import { WardrobeAddSheet } from "./WardrobeAddSheet";
import { WhiteChip } from "./WhiteChip";

export interface PlanAttachment {
  id: string;
  uri: string;
  name: string;
  mimeType?: string;
  kind: "image" | "file";
}

interface HomeControlsProps {
  onComposerExpandedChange?: (expanded: boolean) => void;
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

export function HomeControls({ onComposerExpandedChange }: HomeControlsProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isProfile = isProfileTabActive(pathname);
  const keyboard = useAnimatedKeyboard();
  const barWidth = BAR_WIDTH(width);
  const tabSlotWidth = barWidth / 3;
  const barBottom = Math.max(insets.bottom - 12, 12);
  const [expanded, setExpanded] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [text, setText] = useState("");
  const [inputHeight, setInputHeight] = useState(56);
  const [attachments, setAttachments] = useState<PlanAttachment[]>([]);
  const [toast, setToast] = useState("");
  const inputRef = useRef<TextInput>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOffset = useSharedValue(Dimensions.get("screen").height);
  const progress = useSharedValue(0);
  const expandedHeight = useSharedValue(160);
  const activeTabProgress = useSharedValue(isProfile ? 1 : 0);
  const pressScale = useSharedValue(1);
  const closeStarted = useRef(false);
  const openStarted = useRef(false);
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
    const targetHeight =
      160 +
      (attachments.length > 0 ? 64 : 0) +
      Math.max(0, inputHeight - 56);
    expandedHeight.value = withTiming(targetHeight, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
    });
  }, [attachments.length, expandedHeight, inputHeight]);

  useEffect(() => {
    activeTabProgress.value = withSpring(
      isProfile ? 1 : 0,
      spring,
    );
  }, [activeTabProgress, isProfile]);

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

  const navigateToTab = (target: TabRouteTarget) => {
    const action = getTabNavigationAction(pathname, target);
    if (!action) return;

    if (action.type === "push") {
      router.push(action.href);
    } else {
      router.dismissTo(action.href);
    }
  };

  const finishComposerClose = useCallback(() => {
    openStarted.current = false;
    setExpanded(false);
    onComposerExpandedChange?.(false);
  }, [onComposerExpandedChange]);

  const closeComposer = useCallback(() => {
    if (closeStarted.current) return;
    closeStarted.current = true;
    Keyboard.dismiss();
    progress.value = withTiming(
      0,
      {
        duration: 280,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      },
      (finished) => {
        if (finished) runOnJS(finishComposerClose)();
      },
    );
  }, [finishComposerClose, progress]);

  const openComposer = () => {
    void tapLight();
    closeStarted.current = false;
    setExpanded(true);
    onComposerExpandedChange?.(true);
  };

  useEffect(() => {
    if (!expanded || openStarted.current) return;
    openStarted.current = true;
    inputRef.current?.focus();
    progress.value = withTiming(1, {
      duration: 380,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [expanded, progress]);

  useEffect(() => {
    if (!expanded) return;
    const listener = Keyboard.addListener("keyboardDidHide", () => {
      if (!text.trim() && !closeStarted.current) closeComposer();
    });
    return () => listener.remove();
  }, [closeComposer, expanded, text]);

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
    setInputHeight(56);
    setAttachments([]);
    closeComposer();
    onSubmitPlan(payload);
    showToast("Enviado");
  };

  const morphStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(
        progress.value,
        [0, 1],
        [BAR_HEIGHT, expandedHeight.value],
      ),
      borderRadius: interpolate(
        progress.value,
        [0, 1],
        [BAR_HEIGHT / 2, radius.panel],
      ),
    };
  });

  const composerContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.45, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.45, 1],
          [8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const planButtonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.3],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [{ scale: pressScale.value }],
  }));

  const tabBarStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          progress.value * (BAR_HEIGHT + insets.bottom + 40),
      },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const panelBottomStyle = useAnimatedStyle(() => {
    const collapsedBottom =
      barBottom + BAR_HEIGHT + nativeLayout.baseSpacing * 3;
    return {
      bottom: Math.max(collapsedBottom, keyboard.height.value + 12),
    };
  });

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeTabProgress.value * (tabSlotWidth * 2) }],
  }));

  const canSend = Boolean(text.trim()) || attachments.length > 0;
  const highlightStart = tabSlotWidth / 2 - 46;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        pointerEvents={expanded ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFill,
          styles.dim,
          { backgroundColor: colors.backdrop },
          backdropStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar el campo de petición"
          onPress={closeComposer}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

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
        style={styles.footer}
        pointerEvents="box-none"
      >
        {!isProfile ? (
          <Animated.View
            style={[
              styles.morphShell,
              { width: barWidth },
              panelBottomStyle,
              morphStyle,
            ]}
          >
            <GlassView
              borderRadius={radius.panel}
              style={StyleSheet.absoluteFill}
            >
              <View style={StyleSheet.absoluteFill} />
            </GlassView>
            <Animated.View
              pointerEvents={expanded ? "auto" : "none"}
              style={[StyleSheet.absoluteFill, composerContentStyle]}
            >
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
                          <X size={12} color={colors.onPrimary} strokeWidth={2} />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}

                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  onContentSizeChange={({ nativeEvent }) => {
                    const nextHeight = Math.min(
                      140,
                      Math.max(56, nativeEvent.contentSize.height + 16),
                    );
                    setInputHeight((current) =>
                      Math.abs(current - nextHeight) < 1 ? current : nextHeight,
                    );
                  }}
                  placeholder="Escribe tu petición…"
                  placeholderTextColor={colors.placeholder}
                  selectionColor={colors.gold}
                  keyboardAppearance={isDark ? "dark" : "light"}
                  multiline
                  scrollEnabled
                  textAlignVertical="top"
                  maxLength={3000}
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.fieldBg,
                      height: inputHeight,
                    },
                  ]}
                />

                <View style={styles.composerActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Adjuntar archivo o foto"
                    onPress={openAttachmentOptions}
                    style={styles.attachButtonPressable}
                  >
                    <WhiteChip style={styles.attachButton}>
                      <Paperclip
                        size={22}
                        color={colors.onChip}
                        strokeWidth={1.7}
                      />
                    </WhiteChip>
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
                    <ArrowUp size={22} color={colors.onGold} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
            <Animated.View
              pointerEvents={expanded ? "none" : "auto"}
              style={[styles.planButton, planButtonStyle]}
            >
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
          </Animated.View>
        ) : null}

        <Animated.View
          style={[styles.tabBarEntrance, { bottom: barBottom }]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.tabBarClip, tabBarStyle]}
            pointerEvents={expanded ? "none" : "auto"}
          >
            <GlassView
              borderRadius={radius.control}
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
                >
                  <WhiteChip style={StyleSheet.absoluteFill} />
                </Animated.View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Inicio"
                  accessibilityState={{ selected: !isProfile }}
                  onPress={() => {
                    void tapLight();
                    navigateToTab("home");
                  }}
                  style={[styles.tabButton, { width: tabSlotWidth }]}
                >
                  <Home
                    size={26}
                    color={!isProfile ? colors.gold : colors.iconInactive}
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
                  accessibilityState={{ selected: isProfile }}
                  onPress={() => {
                    void tapLight();
                    navigateToTab("profile");
                  }}
                  style={[styles.tabButton, { width: tabSlotWidth }]}
                >
                  <User
                    size={26}
                    color={isProfile ? colors.gold : colors.iconInactive}
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
  },
  footer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    zIndex: 2,
  },
  morphShell: {
    overflow: "hidden",
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 3,
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
    borderRadius: radius.thumb,
    overflow: "visible",
  },
  attachmentImage: {
    width: 56,
    height: 56,
    borderRadius: radius.thumb,
  },
  fileAttachment: {
    width: 56,
    height: 56,
    borderRadius: radius.thumb,
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
    width: "100%",
    flexShrink: 1,
    minHeight: 56,
    maxHeight: 140,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 0,
    borderWidth: 0,
    borderRadius: radius.field,
    overflow: "hidden",
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
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  attachButtonPressable: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
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
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
    alignItems: "center",
  },
  tabBar: {
    height: BAR_HEIGHT,
    borderRadius: radius.control,
  },
  tabBarContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  activeHighlight: {
    position: "absolute",
    top: (BAR_HEIGHT - 48) / 2,
    width: 92,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
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
