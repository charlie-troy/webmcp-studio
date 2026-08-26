import { create } from "zustand";
import { INSTRUMENTS, type Instrument, type Note, type Project, type Track } from "./model";

/* ------------------------------------------------------------------ */
/* Undo history                                                        */
/* ------------------------------------------------------------------ */

export interface HistoryEntry {
  /** Snapshot taken BEFORE the mutation. */
  snapshot: Project;
  source: "human" | "agent";
  label: string;
}

interface StudioState {
  project: Project;
  selectedTrackId: string | null;
  isPlaying: boolean;
  loop: boolean;
  history: HistoryEntry[];

  /* transport */
  play: () => void;
  stop: () => void;
  setLoop: (loop: boolean) => void;

  /* selection */
  selectTrack: (id: string | null) => void;

  /* mutations — every one snapshots first */
  setBpm: (bpm: number, source?: "human" | "agent") => void;
  createTrack: (opts?: { name?: string; instrument?: Instrument }, source?: "human" | "agent") => Track;
  deleteTrack: (id: string, source?: "human" | "agent") => boolean;
  renameTrack: (id: string, name: string, source?: "human" | "agent") => boolean;
  setInstrument: (id: string, instrument: Instrument, source?: "human" | "agent") => boolean;
  setVolume: (id: string, volume: number, source?: "human" | "agent") => boolean;
  setMute: (id: string, muted: boolean, source?: "human" | "agent") => boolean;
  setSolo: (id: string, soloed: boolean, source?: "human" | "agent") => boolean;
  addNotes: (
    trackId: string,
    notes: Array<Omit<Note, "id">>,
    source?: "human" | "agent",
  ) => Note[] | null;
  clearTrackNotes: (trackId: string, source?: "human" | "agent") => number | null;
  transposeTrack: (trackId: string, semitones: number, source?: "human" | "agent") => number | null;
  quantizeTrack: (trackId: string, grid: number, source?: "human" | "agent") => number | null;
  duplicateSection: (
    trackId: string,
    startBeat: number,
    endBeat: number,
    destinationBeat: number,
    source?: "human" | "agent",
  ) => number | null;
  removeNote: (trackId: string, noteId: string) => void;

  /* undo */
  undoLastAgentAction: () => { label: string } | null;
  loadDemoProject: () => void;
}

let idCounter = 1;
export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const TOTAL_BARS = 8;
export const BEATS_PER_BAR = 4;
export const TOTAL_BEATS = TOTAL_BARS * BEATS_PER_BAR;

export function makeDefaultProject(): Project {
  return {
    name: "Untitled Session",
    bpm: 90,
    tracks: [],
  };
}

function emptyTrack(instrument: Instrument, index: number): Track {
  const defaults: Record<Instrument, { name: string; volume: number }> = {
    dreamy: { name: "Dream Pad", volume: 0.7 },
    pluck: { name: "Pluck", volume: 0.7 },
    bass: { name: "Bass", volume: 0.8 },
    drums: { name: "Drums", volume: 0.9 },
  };
  return {
    id: uid("track"),
    name: `${defaults[instrument].name} ${index + 1}`,
    instrument,
    volume: defaults[instrument].volume,
    muted: false,
    soloed: false,
    notes: [],
  };
}

/** Build a pleasant starter project so the app never looks empty. */
function demoProject(): Project {
  const drums = emptyTrack("drums", 0);
  drums.notes = [
    ...Array.from({ length: TOTAL_BARS * 2 }, (_, i) => i * 2).flatMap((beat) => [
      { pitch: 36, start: beat, duration: 0.25, velocity: 0.9 },
      { pitch: 42, start: beat + 1, duration: 0.25, velocity: 0.5 },
      { pitch: 38, start: beat + 1 + 0.5, duration: 0.25, velocity: 0.7 } as Omit<Note, "id">,
    ]),
  ].map((n) => ({ ...n, id: uid("note") }));

  const bass = emptyTrack("bass", 0);
  bass.notes = [
    [33, 0], [33, 1], [40, 2], [33, 3],
    [31, 4], [31, 5], [38, 6], [31, 7],
    [28, 8], [28, 9], [35, 10], [28, 11],
    [33, 12], [33, 13], [40, 14], [45, 15],
  ].map(([pitch, start]) => ({
    id: uid("note"),
    pitch: pitch as number,
    start: start as number,
    duration: 0.75,
    velocity: 0.8,
  }));

  const keys = emptyTrack("dreamy", 0);
  const chord = (root: number, beat: number): Array<Omit<Note, "id">> =>
    [root, root + 3, root + 7, root + 10].map((p) => ({
      pitch: p + 24,
      start: beat,
      duration: 1.75,
      velocity: 0.45,
    }));
  keys.notes = [
    ...chord(57, 0), ...chord(53, 4), ...chord(55, 8), ...chord(57, 12),
  ].map((n) => ({ ...n, id: uid("note") }));

  const pluck = emptyTrack("pluck", 0);
  pluck.volume = 0.5;
  pluck.notes = Array.from({ length: 32 }, (_, i) => ({
    id: uid("note"),
    pitch: 72 + ((i * 5) % 12),
    start: i * 0.5 + (i % 4 === 3 ? 0.25 : 0),
    duration: 0.4,
    velocity: 0.35,
  }));

  return { name: "Midnight Lo-fi", bpm: 76, tracks: [drums, bass, keys, pluck] };
}

export const useStudio = create<StudioState>((set, get) => {
  /** Snapshot current project and apply the mutation. */
  function mutate(
    source: "human" | "agent",
    label: string,
    fn: (project: Project) => Project | void,
  ) {
    set((s) => {
      const before = structuredClone(s.project);
      const draft = structuredClone(s.project);
      const result = fn(draft);
      const next = result ?? draft;
      return {
        project: next,
        history: [...s.history, { snapshot: before, source, label }].slice(-100),
      };
    });
  }

  function findTrack(project: Project, id: string): Track | undefined {
    return project.tracks.find((t) => t.id === id);
  }

  return {
    project: makeDefaultProject(),
    selectedTrackId: null,
    isPlaying: false,
    loop: true,
    history: [],

    play: () => set({ isPlaying: true }),
    stop: () => set({ isPlaying: false }),
    setLoop: (loop) => set({ loop }),

    selectTrack: (id) => set({ selectedTrackId: id }),

    setBpm: (bpm, source = "human") =>
      mutate(source, `set_bpm(${bpm})`, (p) => {
        p.bpm = clamp(Math.round(bpm), 40, 220);
      }),

    createTrack: (opts, source = "human") => {
      const instrument = opts?.instrument ?? "dreamy";
      let created!: Track;
      mutate(source, `create_track(${opts?.name ?? instrument})`, (p) => {
        created = emptyTrack(instrument, p.tracks.length);
        if (opts?.name) created.name = opts.name;
        p.tracks.push(created);
      });
      return created;
    },

    deleteTrack: (id, source = "human") => {
      let removed = false;
      mutate(source, "delete_track()", (p) => {
        const idx = p.tracks.findIndex((t) => t.id === id);
        if (idx >= 0) {
          p.tracks.splice(idx, 1);
          removed = true;
        }
      });
      return removed;
    },

    renameTrack: (id, name, source = "human") => {
      let ok = false;
      mutate(source, `rename_track("${name}")`, (p) => {
        const t = findTrack(p, id);
        if (t) {
          t.name = name.slice(0, 60);
          ok = true;
        }
      });
      return ok;
    },

    setInstrument: (id, instrument, source = "human") => {
      let ok = false;
      mutate(source, `set_instrument(${instrument})`, (p) => {
        const t = findTrack(p, id);
        if (t) {
          t.instrument = INSTRUMENTS.includes(instrument) ? instrument : "dreamy";
          ok = true;
        }
      });
      return ok;
    },

    setVolume: (id, volume, source = "human") => {
      let ok = false;
      mutate(source, `set_volume(${volume})`, (p) => {
        const t = findTrack(p, id);
        if (t) {
          t.volume = clamp(volume, 0, 1);
          ok = true;
        }
      });
      return ok;
    },

    setMute: (id, muted, source = "human") => {
      let ok = false;
      mutate(source, `set_mute(${muted})`, (p) => {
        const t = findTrack(p, id);
        if (t) {
          t.muted = muted;
          ok = true;
        }
      });
      return ok;
    },

    setSolo: (id, soloed, source = "human") => {
      let ok = false;
      mutate(source, `set_solo(${soloed})`, (p) => {
        const t = findTrack(p, id);
        if (t) {
          t.soloed = soloed;
          ok = true;
        }
      });
      return ok;
    },

    addNotes: (trackId, notes, source = "human") => {
      let added: Note[] | null = null;
      mutate(source, `add_notes(${notes.length} note${notes.length === 1 ? "" : "s"})`, (p) => {
        const t = findTrack(p, trackId);
        if (!t) return;
        added = notes
          .map((n) => ({
            id: uid("note"),
            pitch: clamp(Math.round(n.pitch), 21, 108),
            start: Math.max(0, n.start),
            duration: clamp(n.duration ?? 0.5, 0.05, 16),
            velocity: clamp(n.velocity ?? 0.8, 0.01, 1),
          }))
          .filter((n) => n.start < TOTAL_BEATS);
        t.notes.push(...added);
      });
      return added;
    },

    clearTrackNotes: (trackId, source = "human") => {
      let count: number | null = null;
      mutate(source, "clear_track_notes()", (p) => {
        const t = findTrack(p, trackId);
        if (t) {
          count = t.notes.length;
          t.notes = [];
        }
      });
      return count;
    },

    transposeTrack: (trackId, semitones, source = "human") => {
      let count: number | null = null;
      mutate(source, `transpose_track(${semitones > 0 ? "+" : ""}${semitones})`, (p) => {
        const t = findTrack(p, trackId);
        if (t) {
          count = t.notes.length;
          t.notes.forEach((n) => {
            n.pitch = clamp(n.pitch + semitones, 21, 108);
          });
        }
      });
      return count;
    },

    quantizeTrack: (trackId, grid, source = "human") => {
      let count: number | null = null;
      mutate(source, `quantize_track(grid=${grid})`, (p) => {
        const t = findTrack(p, trackId);
        if (t) {
          count = t.notes.length;
          t.notes.forEach((n) => {
            n.start = Math.round(n.start / grid) * grid;
          });
        }
      });
      return count;
    },

    duplicateSection: (trackId, startBeat, endBeat, destinationBeat, source = "human") => {
      let copied: number | null = null;
      mutate(source, `duplicate_section(${startBeat}–${endBeat} → ${destinationBeat})`, (p) => {
        const t = findTrack(p, trackId);
        if (!t) return;
        const section = t.notes.filter((n) => n.start >= startBeat && n.start < endBeat);
        const offset = destinationBeat - startBeat;
        const clones = section.map((n) => ({
          ...n,
          id: uid("note"),
          start: n.start + offset,
        }));
        t.notes.push(...clones);
        copied = clones.length;
      });
      return copied;
    },

    removeNote: (trackId, noteId) =>
      mutate("human", "remove note", (p) => {
        const t = findTrack(p, trackId);
        if (t) t.notes = t.notes.filter((n) => n.id !== noteId);
      }),

    undoLastAgentAction: () => {
      const { history } = get();
      for (let i = history.length - 1; i >= 0; i--) {
        const entry = history[i];
        if (entry.source !== "agent") continue;
        set({
          project: entry.snapshot,
          history: history.slice(0, i),
        });
        return { label: entry.label };
      }
      return null;
    },

    loadDemoProject: () => set({ project: demoProject(), selectedTrackId: null }),
  };
});

/** Convenience helper for tools/UI: resolve a track or its display name. */
export function describeTrack(t: Track): string {
  return `"${t.name}" (${t.instrument}, ${t.notes.length} notes${t.muted ? ", muted" : ""}${t.soloed ? ", soloed" : ""})`;
}
