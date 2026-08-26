export type Instrument = "dreamy" | "pluck" | "bass" | "drums";

export const INSTRUMENTS: Instrument[] = ["dreamy", "pluck", "bass", "drums"];

export interface Note {
  id: string;
  /** MIDI pitch (21–108). For the drums kit: 36=kick, 38=snare, 42=hi-hat. */
  pitch: number;
  /** Start position in beats from session start. */
  start: number;
  /** Length in beats. */
  duration: number;
  /** 0–1. */
  velocity: number;
}

export interface Track {
  id: string;
  name: string;
  instrument: Instrument;
  /** 0–1. */
  volume: number;
  muted: boolean;
  soloed: boolean;
  notes: Note[];
}

export interface Project {
  name: string;
  bpm: number;
  tracks: Track[];
}
