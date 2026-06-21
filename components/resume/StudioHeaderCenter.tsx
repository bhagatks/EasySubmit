"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

/** Stable setter — safe to use in effect dependency arrays. */
const StudioHeaderCenterSetterContext = createContext<
  Dispatch<SetStateAction<ReactNode>> | null
>(null);

const StudioHeaderCenterSlotContext = createContext<ReactNode>(null);

export function StudioHeaderCenterProvider({ children }: { children: ReactNode }) {
  const [center, setCenter] = useState<ReactNode>(null);

  return (
    <StudioHeaderCenterSetterContext.Provider value={setCenter}>
      <StudioHeaderCenterSlotContext.Provider value={center}>
        {children}
      </StudioHeaderCenterSlotContext.Provider>
    </StudioHeaderCenterSetterContext.Provider>
  );
}

/** Register content in the dashboard studio header center slot. */
export function useRegisterStudioHeaderCenter(node: ReactNode) {
  const setCenter = useContext(StudioHeaderCenterSetterContext);

  useEffect(() => {
    if (!setCenter) return;
    setCenter(node);
    return () => {
      setCenter(null);
    };
  }, [setCenter, node]);
}

export function StudioHeaderCenterSlot() {
  return useContext(StudioHeaderCenterSlotContext);
}
