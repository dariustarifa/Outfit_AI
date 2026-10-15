import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ArrowUpRight,
  Plus,
  Search,
  Shirt,
  Trash2,
  X,
} from "lucide-react-native";
import { GlassView } from "@workspace/outfit-design-system/components/native/glass-view";
import { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";
import { useTheme } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";
import type { WardrobeItem } from "@/src/types";
import { searchWardrobeItems } from "@/src/wardrobe-search";
import { selection, success } from "@/src/haptics";

export default function WardrobeScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { wardrobe, loading, error, removeItem } = useApp();
  const [query, setQuery] = useState("");
  const filteredWardrobe = useMemo(
    () => searchWardrobeItems(wardrobe, query),
    [query, wardrobe],
  );

  const confirmRemove = useCallback(
    (item: WardrobeItem) => {
      const remove = async () => {
        try {
          await removeItem(item.id);
          await success();
        } catch {
          if (Platform.OS === "web" && typeof window !== "undefined") {
            window.alert("No se pudo eliminar la prenda. Inténtalo de nuevo.");
          } else {
            Alert.alert(
              "No se pudo eliminar",
              "Inténtalo de nuevo en unos momentos.",
            );
          }
        }
      };

      if (Platform.OS === "web" && typeof window !== "undefined") {
        if (window.confirm("¿Quieres eliminar esta prenda de tu armario?")) {
          void remove();
        }
        return;
      }

      Alert.alert(
        "Eliminar prenda",
        "Esta prenda y su foto se quitarán de tu armario.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => void remove(),
          },
        ],
      );
    },
    [removeItem],
  );

  const openItem = useCallback((id?: string) => {
    void selection();
    if (id) router.push({ pathname: "/item", params: { id } });
    else {
      router.push({
        pathname: "/onboarding/wardrobe",
        params: { from: "plus" },
      } as never);
    }
  }, []);

  const backHome = useCallback(() => {
    if (source === "onboarding") router.replace("/");
    else router.back();
  }, [source]);

  const renderItem = useCallback(
    ({ item }: { item: WardrobeItem }) => (
      <View style={styles.itemColumn}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar prenda: ${item.note || "sin nota"}`}
          testID={`wardrobe-item-${item.id}`}
          onPress={() => openItem(item.id)}
          style={({ pressed }) => [
            styles.itemPressable,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.photoFrame,
              {
                borderRadius: nativeLayout.cardRadius,
                borderColor: colors.glassBorder,
                backgroundColor: colors.muted,
              },
            ]}
          >
            <Image source={{ uri: item.imageUri }} style={styles.photo} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Eliminar prenda"
              testID={`delete-item-${item.id}`}
              hitSlop={8}
              onPress={() => {
                void selection();
                confirmRemove(item);
              }}
              style={styles.deleteButton}
            >
              <GlassView
                borderRadius={nativeLayout.pillRadius}
                style={styles.iconGlass}
              >
                <Trash2 size={17} color={colors.foreground} />
              </GlassView>
            </Pressable>
            <View
              style={[styles.editHint, { backgroundColor: colors.primaryBg }]}
            >
              <ArrowUpRight size={16} color={colors.onPrimary} />
            </View>
          </View>
          <Text
            numberOfLines={2}
            style={[styles.itemNote, { color: colors.foreground }]}
          >
            {item.note.trim() || "Sin nota"}
          </Text>
        </Pressable>
      </View>
    ),
    [
      colors.foreground,
      colors.muted,
      colors.primary,
      colors.onPrimary,
      confirmRemove,
      openItem,
    ],
  );

  return (
    <View style={styles.fill}>
        <FlatList
          style={styles.fill}
          data={loading ? [] : filteredWardrobe}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 120,
            },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.topBar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver al inicio"
                  testID="back-to-home"
                  onPress={backHome}
                  hitSlop={10}
                  style={styles.backButton}
                >
                  <ArrowLeft size={22} color={colors.textPrimary} />
                </Pressable>
                <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
                  TU ARMARIO
                </Text>
                <View style={styles.backButton} />
              </View>
              <View style={styles.headingRow}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Tus prendas
                </Text>
                <View style={styles.countWrap}>
                  <Text style={[styles.count, { color: colors.textPrimary }]}>
                    {loading
                      ? "…"
                      : query.trim()
                        ? filteredWardrobe.length
                        : wardrobe.length}
                  </Text>
                  <Text
                    style={[styles.countLabel, { color: colors.textSecondary }]}
                  >
                    prendas
                  </Text>
                </View>
              </View>
              <Text style={[styles.intro, { color: colors.textSecondary }]}>
                Guarda aquí las piezas que ya tienes y te encanta llevar.
              </Text>
              {!loading && wardrobe.length > 0 ? (
                <View
                  style={[
                    styles.searchField,
                    {
                      borderColor: colors.glassBorder,
                      backgroundColor: colors.fieldBg,
                    },
                  ]}
                >
                  <Search size={19} color={colors.textSecondary} />
                  <TextInput
                    accessibilityLabel="Buscar prendas por nota"
                    testID="wardrobe-search-input"
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Buscar por nota"
                    placeholderTextColor={colors.placeholder}
                    selectionColor={colors.gold}
                    keyboardAppearance={isDark ? "dark" : "light"}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                  />
                  {query.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Borrar búsqueda"
                      testID="clear-wardrobe-search"
                      hitSlop={8}
                      onPress={() => setQuery("")}
                      style={styles.clearSearchButton}
                    >
                      <X size={18} color={colors.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                testID="add-wardrobe-item"
                onPress={() => openItem()}
                style={({ pressed }) => [
                  styles.addButton,
                  { backgroundColor: colors.primaryBg },
                  pressed && styles.pressed,
                ]}
              >
                <Plus size={20} color={colors.onPrimary} />
                <Text
                  style={[
                    styles.addButtonText,
                    { color: colors.onPrimary },
                  ]}
                >
                  Añadir prenda
                </Text>
              </Pressable>
              {error ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  No se pudieron cargar tus prendas guardadas.
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <Text
                style={[styles.emptyTitle, { color: colors.textSecondary }]}
              >
                Preparando tu armario…
              </Text>
            ) : wardrobe.length > 0 ? (
              <GlassView style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Search size={25} color={colors.textPrimary} />
                  </View>
                  <Text
                    style={[styles.emptyTitle, { color: colors.textPrimary }]}
                  >
                    No encontramos prendas
                  </Text>
                  <Text
                    style={[styles.emptyCopy, { color: colors.textSecondary }]}
                  >
                    Prueba con otra palabra o borra la búsqueda para ver todo tu
                    armario.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    testID="clear-search-empty-state"
                    onPress={() => setQuery("")}
                    style={({ pressed }) => [
                      styles.clearSearchAction,
                      { borderColor: colors.textPrimary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.clearSearchActionText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Borrar búsqueda
                    </Text>
                  </Pressable>
                </View>
              </GlassView>
            ) : (
              <GlassView style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Shirt size={25} color={colors.textPrimary} />
                  </View>
                  <Text
                    style={[styles.emptyTitle, { color: colors.textPrimary }]}
                  >
                    Tu armario empieza aquí
                  </Text>
                  <Text
                    style={[styles.emptyCopy, { color: colors.textSecondary }]}
                  >
                    Haz una foto o elige una de tu galería para guardar tu
                    primera prenda.
                  </Text>
                </View>
              </GlassView>
            )
          }
        />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  listContent: {
    paddingHorizontal: nativeLayout.screenHorizontalPadding,
    flexGrow: 1,
  },
  header: { marginBottom: 24 },
  topBar: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  eyebrow: { fontFamily: "Satoshi_700Bold", fontSize: 11, letterSpacing: 1.6 },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  title: { fontFamily: "Melodrama_500Medium", fontSize: 36, lineHeight: 42 },
  countWrap: { alignItems: "flex-end", paddingBottom: 4 },
  count: { fontFamily: "Satoshi_700Bold", fontSize: 20 },
  countLabel: { fontFamily: "Satoshi_400Regular", fontSize: 12 },
  intro: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 300,
  },
  searchField: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: nativeLayout.pillRadius,
    marginTop: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 0,
    fontFamily: "Satoshi_400Regular",
    fontSize: 15,
  },
  clearSearchButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    minHeight: nativeLayout.primaryButtonHeight,
    borderRadius: nativeLayout.pillRadius,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  addButtonText: { fontFamily: "Satoshi_700Bold", fontSize: 15 },
  errorText: { fontFamily: "Satoshi_500Medium", fontSize: 13, marginTop: 12 },
  gridRow: { gap: 12, marginBottom: 20 },
  itemColumn: { flex: 1 },
  itemPressable: { gap: 9 },
  photoFrame: {
    width: "100%",
    aspectRatio: 0.78,
    overflow: "hidden",
    borderWidth: 1,
  },
  photo: { width: "100%", height: "100%" },
  deleteButton: { position: "absolute", top: 9, right: 9 },
  iconGlass: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  editHint: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  itemNote: {
    fontFamily: "Satoshi_500Medium",
    fontSize: 14,
    lineHeight: 19,
    paddingHorizontal: 2,
  },
  emptyCard: { minHeight: 216 },
  emptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyCopy: {
    fontFamily: "Satoshi_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  clearSearchAction: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: nativeLayout.pillRadius,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 18,
  },
  clearSearchActionText: {
    fontFamily: "Satoshi_700Bold",
    fontSize: 14,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
