import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface HomeControlsContextValue {
  planComposerOpen: boolean;
  setPlanComposerOpen: (open: boolean) => void;
}

const HomeControlsContext =
  createContext<HomeControlsContextValue | null>(null);

export function HomeControlsProvider({ children }: { children: ReactNode }) {
  const [planComposerOpen, setPlanComposerOpenState] = useState(false);
  const setPlanComposerOpen = useCallback(
    (open: boolean) => setPlanComposerOpenState(open),
    [],
  );
  const value = useMemo(
    () => ({ planComposerOpen, setPlanComposerOpen }),
    [planComposerOpen, setPlanComposerOpen],
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
