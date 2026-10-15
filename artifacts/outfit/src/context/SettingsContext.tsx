import AsyncStorage from "@react-native-async-storage/async-storage";
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
  setGlassLevel as setDesignSystemGlassLevel,
} from "@workspace/outfit-design-system/hooks/use-glass-effect";
import {
  loadGlassLevel,
  persistGlassLevel,
  type GlassLevel,
} from "../theme-mode";

type SettingsContextValue = {
  glassLevel: GlassLevel;
  setGlassLevel: (level: GlassLevel) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [glassLevel, setGlassLevelState] = useState<GlassLevel>("clear");
  const glassLevelRef = useRef<GlassLevel>("clear");
  const persistedLevelRef = useRef<GlassLevel>("clear");
  const latestRequestRef = useRef(0);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    void loadGlassLevel(AsyncStorage)
      .catch((error: unknown) => {
        console.error("Unable to load the saved glass level.", error);
        return "clear" as const;
      })
      .then((initialLevel) => {
        if (!active) return;
        glassLevelRef.current = initialLevel;
        persistedLevelRef.current = initialLevel;
        setGlassLevelState(initialLevel);
        setDesignSystemGlassLevel(initialLevel);
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setGlassLevel = useCallback(async (nextLevel: GlassLevel) => {
    const requestId = ++latestRequestRef.current;
    glassLevelRef.current = nextLevel;
    setGlassLevelState(nextLevel);
    setDesignSystemGlassLevel(nextLevel);

    const pendingWrite = writeQueueRef.current.then(() =>
      persistGlassLevel(AsyncStorage, nextLevel),
    );
    writeQueueRef.current = pendingWrite.catch(() => undefined);

    try {
      await pendingWrite;
      persistedLevelRef.current = nextLevel;
    } catch (error) {
      if (latestRequestRef.current === requestId) {
        glassLevelRef.current = persistedLevelRef.current;
        setGlassLevelState(persistedLevelRef.current);
        setDesignSystemGlassLevel(persistedLevelRef.current);
      }
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({ glassLevel, setGlassLevel }),
    [glassLevel, setGlassLevel],
  );

  if (!ready) return null;
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) {
    throw new Error("useSettings must be used within SettingsProvider.");
  }
  return settings;
}
