import { create } from "zustand";

export type WebMCPMode = "checking" | "native" | "polyfill" | "unavailable";

interface StatusState {
  mode: WebMCPMode;
  setMode: (mode: WebMCPMode) => void;
}

/**
 * Reactive WebMCP status. `initWebMCP` in modelContext.ts updates this store,
 * so UI badges re-render the moment the real mode is known (the previous
 * non-reactive read of a module-level variable left badges stuck on
 * "unavailable").
 */
export const useWebMCPStatus = create<StatusState>((set) => ({
  mode: "checking",
  setMode: (mode) => set({ mode }),
}));
