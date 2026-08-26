import { create } from "zustand";

export type ToolCallStatus = "running" | "success" | "error";

export interface ActivityEntry {
  id: number;
  tool: string;
  args: unknown;
  result?: unknown;
  status: ToolCallStatus;
  timestamp: number;
}

interface ActivityState {
  entries: ActivityEntry[];
  push: (entry: Omit<ActivityEntry, "id" | "timestamp">) => number;
  update: (id: number, patch: Partial<Omit<ActivityEntry, "id">>) => void;
  clear: () => void;
}

let nextId = 1;

export const useActivityStore = create<ActivityState>((set) => ({
  entries: [],
  push: (entry) => {
    const id = nextId++;
    set((s) => ({
      entries: [{ ...entry, id, timestamp: Date.now() }, ...s.entries].slice(0, 200),
    }));
    return id;
  },
  update: (id, patch) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  clear: () => set({ entries: [] }),
}));

/** Log a tool call; returns a handle to update it when it completes. */
export function logToolCall(call: {
  id?: number;
  tool: string;
  args: unknown;
  status: ToolCallStatus;
  result?: unknown;
}): number {
  const store = useActivityStore.getState();
  if (call.id != null) {
    store.update(call.id, {
      status: call.status,
      result: call.result,
    });
    return call.id;
  }
  return store.push({ tool: call.tool, args: call.args, status: call.status, result: call.result });
}
