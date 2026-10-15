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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadDailyPlan, persistDailyPlan } from "../daily-plan";

interface HomeControlsContextValue {
  planComposerOpen: boolean;
  setPlanComposerOpen: (open: boolean) => void;
  dailyPlan: string | null;
  dailyPlanReady: boolean;
  setDailyPlan: (plan: string | null) => Promise<void>;
  profileEditorOpen: boolean;
  setProfileEditorOpen: (open: boolean) => void;
}

const HomeControlsContext =
  createContext<HomeControlsContextValue | null>(null);

export function HomeControlsProvider({ children }: { children: ReactNode }) {
  const [planComposerOpen, setPlanComposerOpenState] = useState(false);
  const [dailyPlan, setDailyPlanState] = useState<string | null>(null);
  const [dailyPlanReady, setDailyPlanReady] = useState(false);
  const [profileEditorOpen, setProfileEditorOpenState] = useState(false);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    void loadDailyPlan(AsyncStorage)
      .then((savedPlan) => {
        if (active) setDailyPlanState(savedPlan);
      })
      .catch((error: unknown) => {
        console.error("Unable to load today's saved plan.", error);
      })
      .finally(() => {
        if (active) setDailyPlanReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setPlanComposerOpen = useCallback(
    (open: boolean) => setPlanComposerOpenState(open),
    [],
  );
  const setDailyPlan = useCallback(async (plan: string | null) => {
    const pendingWrite = writeQueueRef.current.then(() =>
      persistDailyPlan(AsyncStorage, plan),
    );
    writeQueueRef.current = pendingWrite.then(
      () => undefined,
      () => undefined,
    );
    const savedPlan = await pendingWrite;
    setDailyPlanState(savedPlan);
  }, []);
  const setProfileEditorOpen = useCallback(
    (open: boolean) => setProfileEditorOpenState(open),
    [],
  );
  const value = useMemo(
    () => ({
      planComposerOpen,
      setPlanComposerOpen,
      dailyPlan,
      dailyPlanReady,
      setDailyPlan,
      profileEditorOpen,
      setProfileEditorOpen,
    }),
    [
      planComposerOpen,
      dailyPlan,
      dailyPlanReady,
      profileEditorOpen,
      setPlanComposerOpen,
      setDailyPlan,
      setProfileEditorOpen,
    ],
  );

  return (
    <HomeControlsContext.Provider value={value}>
      {children}
    </HomeControlsContext.Provider>
  );
}

export function useHomeControlsState() {
  const context = useContext(HomeControlsContext);
  if (!context) {
    throw new Error(
      "useHomeControlsState must be used within HomeControlsProvider.",
    );
  }
  return context;
}
