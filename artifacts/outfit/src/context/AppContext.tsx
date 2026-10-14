import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  copyImageToAppDocuments,
  loadAppData,
  loadWeatherSnapshot,
  removeStoredImage,
  saveAppData,
  saveWeatherSnapshot,
} from "../storage";
import type {
  Profile,
  StoredAppData,
  WardrobeItem,
  WeatherSnapshot,
} from "../types";

export interface NewWardrobeItem {
  imageUri: string;
  note: string;
}

export interface AppContextValue extends StoredAppData {
  weather: WeatherSnapshot | null;
  loading: boolean;
  error: Error | null;
  setProfile: (profile: Profile | null) => Promise<Profile | null>;
  addItem: (item: NewWardrobeItem) => Promise<WardrobeItem>;
  updateItem: (
    itemId: string,
    updates: Partial<Pick<WardrobeItem, "imageUri" | "note">>,
  ) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  setWeather: (weather: WeatherSnapshot | null) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [wardrobe, setWardrobeState] = useState<WardrobeItem[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const currentData = useRef<StoredAppData>({ profile: null, wardrobe: [] });

  useEffect(() => {
    let mounted = true;

    loadAppData()
      .then((stored) => {
        if (!mounted) return;
        currentData.current = stored;
        setProfileState(stored.profile);
        setWardrobeState(stored.wardrobe);
      })
      .catch((cause: unknown) => {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause
              : new Error("Could not load local app data."),
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    loadWeatherSnapshot()
      .then((stored) => {
        if (mounted) setWeather(stored);
      })
      .catch((cause: unknown) => {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause
              : new Error("Could not load saved weather."),
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const commit = useCallback(async (next: StoredAppData) => {
    await saveAppData(next);
    currentData.current = next;
    setProfileState(next.profile);
    setWardrobeState(next.wardrobe);
    setError(null);
  }, []);

  const persistWeather = useCallback(
    async (nextWeather: WeatherSnapshot | null) => {
      await saveWeatherSnapshot(nextWeather);
      setWeather(nextWeather);
    },
    [],
  );

  const setProfile = useCallback(
    async (nextProfile: Profile | null) => {
      try {
        const previousUri = currentData.current.profile?.bodyPhotoUri;
        const savedProfile =
          nextProfile && nextProfile.bodyPhotoUri
            ? {
                ...nextProfile,
                bodyPhotoUri: await copyImageToAppDocuments(
                  nextProfile.bodyPhotoUri,
                ),
              }
            : nextProfile;
        await commit({ ...currentData.current, profile: savedProfile });
        if (
          previousUri &&
          previousUri !== savedProfile?.bodyPhotoUri
        ) {
          await removeStoredImage(previousUri);
        }
        return savedProfile;
      } catch (cause) {
        const nextError =
          cause instanceof Error ? cause : new Error("Could not save profile.");
        setError(nextError);
        throw nextError;
      }
    },
    [commit],
  );

  const addItem = useCallback(
    async (item: NewWardrobeItem) => {
      try {
        const savedItem: WardrobeItem = {
          id: `${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 10)}`,
          imageUri: await copyImageToAppDocuments(item.imageUri),
          note: item.note,
          createdAt: Date.now(),
        };
        const nextWardrobe = [...currentData.current.wardrobe, savedItem];
        await commit({ ...currentData.current, wardrobe: nextWardrobe });
        return savedItem;
      } catch (cause) {
        const nextError =
          cause instanceof Error ? cause : new Error("Could not save wardrobe item.");
        setError(nextError);
        throw nextError;
      }
    },
    [commit],
  );

  const updateItem = useCallback(
    async (
      itemId: string,
      updates: Partial<Pick<WardrobeItem, "imageUri" | "note">>,
    ) => {
      try {
        const previousItem = currentData.current.wardrobe.find(
          (item) => item.id === itemId,
        );
        if (!previousItem) throw new Error("Wardrobe item was not found.");

        const nextImageUri =
          updates.imageUri && updates.imageUri !== previousItem.imageUri
            ? await copyImageToAppDocuments(updates.imageUri)
            : previousItem.imageUri;
        const updatedItem: WardrobeItem = {
          ...previousItem,
          note: updates.note ?? previousItem.note,
          imageUri: nextImageUri,
        };
        const nextWardrobe = currentData.current.wardrobe.map((item) =>
          item.id === itemId ? updatedItem : item,
        );
        await commit({ ...currentData.current, wardrobe: nextWardrobe });
        if (nextImageUri !== previousItem.imageUri) {
          await removeStoredImage(previousItem.imageUri);
        }
      } catch (cause) {
        const nextError =
          cause instanceof Error ? cause : new Error("Could not update wardrobe item.");
        setError(nextError);
        throw nextError;
      }
    },
    [commit],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      try {
        const previousItem = currentData.current.wardrobe.find(
          (item) => item.id === itemId,
        );
        if (!previousItem) return;

        const nextWardrobe = currentData.current.wardrobe.filter(
          (item) => item.id !== itemId,
        );
        await commit({ ...currentData.current, wardrobe: nextWardrobe });
        await removeStoredImage(previousItem.imageUri);
      } catch (cause) {
        const nextError =
          cause instanceof Error ? cause : new Error("Could not remove wardrobe item.");
        setError(nextError);
        throw nextError;
      }
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      profile,
      wardrobe,
      weather,
      loading,
      error,
      setProfile,
      addItem,
      updateItem,
      removeItem,
      setWeather: persistWeather,
    }),
    [
      profile,
      wardrobe,
      weather,
      loading,
      error,
      setProfile,
      addItem,
      updateItem,
      removeItem,
      persistWeather,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider.");
  }
  return context;
}
