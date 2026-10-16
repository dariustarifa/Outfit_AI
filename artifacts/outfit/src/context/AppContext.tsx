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
  copyProfilePhotoToAppDocuments,
  clearOnboardingDraft as clearStoredOnboardingDraft,
  loadAppData,
  loadOnboardingDraft,
  loadWeatherSnapshot,
  removeStoredImage,
  removeUnreferencedStoredImage,
  saveAppData,
  saveOnboardingDraft as saveStoredOnboardingDraft,
  saveWeatherSnapshot,
} from "../storage";
import { createWardrobeActions } from "../wardrobe-actions";
import { createAppDataCommitter } from "../app-data-commit";
import type {
  Profile,
  OnboardingDraft,
  ProfileUpdate,
  StoredAppData,
  WardrobeItem,
  WeatherSnapshot,
} from "../types";
import type { NewWardrobeItem } from "../wardrobe-actions";
import { updateAndSaveProfile } from "../profile-update";
import { saveProfileWithPhoto } from "../profile-storage";
import { isWeatherForProfile } from "../services/home-weather";

export interface AppContextValue extends StoredAppData {
  weather: WeatherSnapshot | null;
  loading: boolean;
  error: Error | null;
  onboardingDraft: OnboardingDraft | null;
  saveOnboardingDraft: (draft: OnboardingDraft) => Promise<void>;
  clearOnboardingDraft: () => Promise<void>;
  saveOnboardingPhoto: (sourceUri: string) => Promise<string>;
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
  const [onboardingDraft, setOnboardingDraft] =
    useState<OnboardingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const currentData = useRef<StoredAppData>({ profile: null, wardrobe: [] });
  const appDataCommitter =
    useRef<ReturnType<typeof createAppDataCommitter> | null>(null);
  if (!appDataCommitter.current) {
    appDataCommitter.current = createAppDataCommitter({
      getData: () => currentData.current,
      saveData: saveAppData,
      onCommit(next) {
        currentData.current = next;
        setProfileState(next.profile);
        setWardrobeState(next.wardrobe);
        setError(null);
      },
    });
  }

  useEffect(() => {
    let mounted = true;

    Promise.all([loadAppData(), loadOnboardingDraft()])
      .then(([stored, draft]) => {
        if (!mounted) return;
        currentData.current = stored;
        setProfileState(stored.profile);
        setWardrobeState(stored.wardrobe);
        setOnboardingDraft(draft);
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

  const commitProfile = useCallback(
    (nextProfile: Profile | null) =>
      appDataCommitter.current!((current) => ({
        next: { ...current, profile: nextProfile },
        result: current.profile,
      })),
    [],
  );

  const persistWeather = useCallback(
    async (nextWeather: WeatherSnapshot | null) => {
      await saveWeatherSnapshot(nextWeather);
      setWeather(nextWeather);
    },
    [],
  );

  const persistOnboardingDraft = useCallback(
    async (draft: OnboardingDraft) => {
      await saveStoredOnboardingDraft(draft);
      setOnboardingDraft(draft);
    },
    [],
  );

  const clearOnboardingDraft = useCallback(async () => {
    await clearStoredOnboardingDraft();
    setOnboardingDraft(null);
  }, []);

  const persistOnboardingPhoto = useCallback(
    (sourceUri: string) => copyProfilePhotoToAppDocuments(sourceUri),
    [],
  );

  const setProfile = useCallback(
    async (nextProfile: Profile | null) => {
      try {
        return await saveProfileWithPhoto(nextProfile, {
          copyProfilePhotoToAppDocuments,
          commitProfile,
          removeStoredImage,
          removeUnreferencedStoredImage,
        });
      } catch (cause) {
        const nextError =
          cause instanceof Error ? cause : new Error("Could not save profile.");
        setError(nextError);
        throw nextError;
      }
    },
    [commitProfile],
  );

  const updateProfile = useCallback(
    (updates: ProfileUpdate) =>
      updateAndSaveProfile(currentData.current.profile, updates, setProfile),
    [setProfile],
  );

  const wardrobeActions = useMemo(
    () =>
      createWardrobeActions({
        getData: () => currentData.current,
        commitWardrobe: (nextWardrobe) =>
          appDataCommitter.current!((current) => ({
            next: { ...current, wardrobe: nextWardrobe },
            result: undefined,
          })),
        copyImageToAppDocuments,
        removeStoredImage,
        removeUnreferencedStoredImage,
        onError: setError,
      }),
    [],
  );
  const { addItem, updateItem, removeItem } = wardrobeActions;

  const value = useMemo(
    () => ({
      profile,
      wardrobe,
      weather: isWeatherForProfile(weather, profile) ? weather : null,
      loading,
      error,
      onboardingDraft,
      saveOnboardingDraft: persistOnboardingDraft,
      clearOnboardingDraft,
      saveOnboardingPhoto: persistOnboardingPhoto,
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
      onboardingDraft,
      persistOnboardingDraft,
      clearOnboardingDraft,
      persistOnboardingPhoto,
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
