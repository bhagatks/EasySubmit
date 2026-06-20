/** @deprecated Import from `@/src/stores/use-ignition-store` */
export {
  getIgnitionProviderLabel,
  INITIAL_IGNITION_STATE,
  INITIAL_IGNITION_STORE,
  selectDiscoveredModels,
  selectHandshakeValidated,
  selectPrimaryFuel,
  useIgnitionStore,
  type IgnitionDiscoveryStatus,
  type IgnitionProvider,
  type IgnitionStore,
  type IgnitionStoreState,
} from "@/src/stores/use-ignition-store";

export type { IgnitionLockSource, LockIgnitionInput } from "@/src/lib/ai/ignition-guard";

/** @deprecated Use IgnitionStoreState */
export type IgnitionState = import("@/src/stores/use-ignition-store").IgnitionStoreState & {
  discoveredModels: string[];
  primaryFuel: string | null;
  handshakeValidated: boolean;
  providerLabel: string | null;
};
