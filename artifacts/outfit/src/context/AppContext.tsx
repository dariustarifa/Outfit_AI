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
import { createWardrobeActions } from "../wardrobe-actions";
import type {
  Profile,
  ProfileUpdate,
  StoredAppData,
  WardrobeItem,
  WeatherSnapshot,
} from "../types";
import type { NewWardrobeItem } from "../wardrobe-actions";
import { mergeProfileUpdate } from "../profile-update";

export interface AppContextValue extends StoredAppData {
  weather: WeatherSnapshot | null;
  loading: boolean;
  error: Error | null;
  setProfile: (profile: Profile | null) => Promise<Profile | null>;
  updateProfile: (updates: ProfileUpdate) => Promise<Profile>;
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

  const updateProfile = useCallback(
    async (updates: ProfileUpdate) => {
      const existing = currentData.current.profile;
      if (!existing) {
        throw new Error("Cannot update a profile that has not been created.");
      }

      const saved = await setProfile(mergeProfileUpdate(existing, updates));
      if (!saved) throw new Error("Could not save profile.");
      return saved;
    },
    [setProfile],
  );

  const wardrobeActions = useMemo(
    () =>
      createWardrobeActions({
        getData: () => currentData.current,
        commit,
        copyImageToAppDocuments,
        removeStoredImage,
        onError: setError,
      }),
    [commit],
  );
  const { addItem, updateItem, removeItem } = wardrobeActions;

  const value = useMemo(
    () => ({
      profile,
      wardrobe,
      weather,
      loading,
      error,
      setProfile,
      updateProfile,
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
      updateProfile,
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
