/**
 * The Agent Music Studio WebMCP tool catalog.
 *
 * Tools are thin wrappers over studio store actions so that everything an
 * agent does is exactly what a human could do — same state, same undo history,
 * same visible UI updates.
 */
import { z } from "zod";
import { registerTool, type ToolDefinition } from "./modelContext";
import { useStudio, describeTrack } from "../state/studioStore";

const instrumentSchema = z.enum(["dreamy", "pluck", "bass", "drums"]);

const trackRef = z.object({
  /** Track id (preferred). Omit if `track_name` is given. */
  track_id: z.string().optional().describe("Id of the target track from get_project_state."),
  /** Fallback when the caller only knows a track by name (case-insensitive). */
  track_name: z.string().optional().describe("Name of the target track if its id is unknown."),
});

function resolveTrack(input: { track_id?: string; track_name?: string }) {
  const { project } = useStudio.getState();
  let track = input.track_id ? project.tracks.find((t) => t.id === input.track_id) : undefined;
  if (!track && input.track_name) {
    const name = input.track_name.toLowerCase();
    track = project.tracks.find((t) => t.name.toLowerCase() === name);
  }
  return track;
}

const noteSchema = z.object({
  pitch: z.number().int().min(21).max(108).describe("MIDI pitch 21–108. Drums: 36=kick, 38=snare, 42=hi-hat."),
  start: z.number().min(0).max(32).describe("Start in beats (4 beats per bar, 8 bars = 32 beats total)."),
  duration: z.number().min(0.05).max(16).default(0.5).describe("Length in beats."),
  velocity: z.number().min(0.01).max(1).default(0.8).describe("Volume of the note, 0–1."),
});

export async function registerAllTools(): Promise<number> {
  const defs: ToolDefinition[] = [
    /* ---------------------------------------------------------------- */
    /* Read-only                                                         */
    /* ---------------------------------------------------------------- */
    {
      name: "get_project_state",
      description:
        "Read the full state of the music session: tempo, every track with its instrument, mute/solo status, volume, note counts, and each note (pitch/start/duration/velocity). Call this first to understand the project.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
      execute: () => {
        const { project } = useStudio.getState();
        return {
          summary: `${project.tracks.length} tracks at ${project.bpm} BPM.`,
          project_name: project.name,
          bpm: project.bpm,
          bars: 8,
          beats_per_bar: 4,
          tracks: project.tracks.map((t) => ({
            id: t.id,
            name: t.name,
            instrument: t.instrument,
            volume: t.volume,
            muted: t.muted,
            soloed: t.soloed,
            notes: t.notes.map((n) => ({ pitch: n.pitch, start: n.start, duration: n.duration, velocity: n.velocity })),
          })),
        };
      },
    },

    {
      name: "play_project",
      description: "Start playback of the session from the beginning. It loops over all 8 bars.",
      inputSchema: z.object({}),
      annotations: { idempotentHint: true },
      execute: async () => {
        const { play } = useStudio.getState();
        play();
        return { summary: "Playback started (8-bar loop)." };
      },
    },

    {
      name: "stop_playback",
      description: "Stop playback and reset the playhead to the start.",
      inputSchema: z.object({}),
      annotations: { idempotentHint: true },
      execute: () => {
        const { stop } = useStudio.getState();
        stop();
        return { summary: "Playback stopped." };
      },
    },

    /* ---------------------------------------------------------------- */
    /* Project-level                                                     */
    /* ---------------------------------------------------------------- */
    {
      name: "set_bpm",
      description: "Set the session tempo in beats per minute (40–220).",
      inputSchema: z.object({ bpm: z.number().int().min(40).max(220) }),
      execute: ({ bpm }) => {
        useStudio.getState().setBpm(bpm, "agent");
        return { summary: `Tempo set to ${bpm} BPM.` };
      },
    },

    /* ---------------------------------------------------------------- */
    /* Track management                                                  */
    /* ---------------------------------------------------------------- */
    {
      name: "create_track",
      description: "Create a new empty track with the given instrument and optional name.",
      inputSchema: z.object({
        instrument: instrumentSchema.describe(
          "'dreamy' = FM pad, 'pluck' = plucked string, 'bass' = mono bass synth, 'drums' = kick/snare/hat kit.",
        ),
        name: z.string().max(60).optional(),
      }),
      execute: ({ instrument, name }) => {
        const track = useStudio.getState().createTrack({ instrument, name }, "agent");
        return {
          summary: `Created ${describeTrack(track)}.`,
          track_id: track.id,
        };
      },
    },

    {
      name: "delete_track",
      description: "Permanently delete a track and all of its notes.",
      inputSchema: trackRef,
      annotations: { destructiveHint: true },
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: `Track not found.` as string, ok: false };
        useStudio.getState().deleteTrack(track.id, "agent");
        return { summary: `Deleted track "${track.name}".`, ok: true };
      },
    },

    {
      name: "rename_track",
      description: "Rename a track to a new display name (up to 60 characters).",
      inputSchema: trackRef.extend({ name: z.string().max(60) }),
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: "Track not found.", ok: false };
        useStudio.getState().renameTrack(track.id, input.name, "agent");
        return { summary: `Renamed "${track.name}" to "${input.name}".`, ok: true };
      },
    },

    {
      name: "set_instrument",
      description: "Change the instrument of a track ('dreamy' | 'pluck' | 'bass' | 'drums').",
      inputSchema: trackRef.extend({ instrument: instrumentSchema }),
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: "Track not found.", ok: false };
        useStudio.getState().setInstrument(track.id, input.instrument, "agent");
        return { summary: `"${track.name}" now uses the ${input.instrument} sound.`, ok: true };
      },
    },

    {
      name: "set_volume",
      description: "Set a track's volume between 0 (silent) and 1 (full).",
      inputSchema: trackRef.extend({ volume: z.number().min(0).max(1) }),
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: "Track not found.", ok: false };
        useStudio.getState().setVolume(track.id, input.volume, "agent");
        return { summary: `"${track.name}" volume set to ${Math.round(input.volume * 100)}%.`, ok: true };
      },
    },

    {
      name: "set_mute",
      description: "Mute or unmute a track without deleting anything.",
      inputSchema: trackRef.extend({ muted: z.boolean() }),
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: "Track not found.", ok: false };
        useStudio.getState().setMute(track.id, input.muted, "agent");
        return { summary: `"${track.name}" ${input.muted ? "muted" : "unmuted"}.`, ok: true };
      },
    },

    {
      name: "set_solo",
      description: "Solo or unsolo a track. When any track is soloed, only soloed tracks are audible.",
      inputSchema: trackRef.extend({ soloed: z.boolean() }),
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: "Track not found.", ok: false };
        useStudio.getState().setSolo(track.id, input.soloed, "agent");
        return { summary: `"${track.name}" ${input.soloed ? "soloed" : "unsoloed"}.`, ok: true };
      },
    },

    /* ---------------------------------------------------------------- */
    /* Note editing                                                      */
    /* ---------------------------------------------------------------- */
    {
      name: "add_notes",
      description:
        "Add one or more notes to a track in a single call. Session is 8 bars = 32 beats; 4 beats per bar. For drums use pitch 36 (kick), 38 (snare), 42 (hi-hat). This is how the agent composes — call it many times to build patterns.",
      inputSchema: trackRef.extend({ notes: z.array(noteSchema).min(1).max(128) }),
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: "Track not found.", ok: false };
        const added = useStudio
          .getState()
          .addNotes(
            track.id,
            input.notes.map((n: { pitch: number; start: number; duration: number; velocity: number }) => ({
              pitch: n.pitch,
              start: n.start,
              duration: n.duration,
              velocity: n.velocity,
            })),
            "agent",
          );
        if (!added) return { summary: "Track not found.", ok: false };
        return {
          summary: `Added ${added.length} note${added.length === 1 ? "" : "s"} to "${track.name}" (now ${track.notes.length + added.length} total).`,
          ok: true,
          note_count: track.notes.length + added.length,
        };
      },
    },

    {
      name: "clear_track_notes",
      description: "Remove ALL notes from a track (the track itself remains).",
      inputSchema: trackRef,
      annotations: { destructiveHint: true },
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: "Track not found.", ok: false };
        const count = useStudio.getState().clearTrackNotes(track.id, "agent");
        if (count == null) return { summary: "Track not found.", ok: false };
        return { summary: `Cleared ${count} notes from "${track.name}".`, ok: true, removed: count };
      },
    },

    {
      name: "transpose_track",
      description:
        "Transpose every note on a track up or down by semitones (negative values transpose down). Useful for key changes and harmonizing.",
      inputSchema: trackRef.extend({ semitones: z.number().int().min(-36).max(36) }),
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: "Track not found.", ok: false };
        const count = useStudio.getState().transposeTrack(track.id, input.semitones, "agent");
        if (count == null) return { summary: "Track not found.", ok: false };
        return {
          summary: `Transposed ${count} notes on "${track.name}" by ${input.semitones > 0 ? "+" : ""}${input.semitones} semitones.`,
          ok: true,
          notes_changed: count,
        };
      },
    },

    {
      name: "quantize_track",
      description:
        "Snap all note starts on a track to a rhythmic grid: '1/16' (0.25 beat), '1/8' (0.5 beat), or '1/4' (1 beat).",
      inputSchema: trackRef.extend({
        grid: z.enum(["1/16", "1/8", "1/4"]).default("1/16"),
      }),
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: "Track not found.", ok: false };
        const gridValue = input.grid === "1/4" ? 1 : input.grid === "1/8" ? 0.5 : 0.25;
        const count = useStudio.getState().quantizeTrack(track.id, gridValue, "agent");
        if (count == null) return { summary: "Track not found.", ok: false };
        return {
          summary: `Quantized ${count} notes on "${track.name}" to ${input.grid}.`,
          ok: true,
          notes_changed: count,
        };
      },
    },

    {
      name: "duplicate_section",
      description:
        "Copy the notes in a beat range [start_beat, end_beat) to another position on the same track. Great for repeating a good bar.",
      inputSchema: z.object({
        track_id: z.string().optional(),
        track_name: z.string().optional(),
        start_beat: z.number().min(0),
        end_beat: z.number().max(32),
        destination_beat: z.number().min(0).max(32),
      }),
      execute: (input) => {
        const track = resolveTrack(input);
        if (!track) return { summary: "Track not found.", ok: false };
        const copied = useStudio
          .getState()
          .duplicateSection(track.id, input.start_beat, input.end_beat, input.destination_beat, "agent");
        if (copied == null) return { summary: "Track not found.", ok: false };
        return { summary: `Copied ${copied} notes on "${track.name}" from beat ${input.start_beat} to beat ${input.destination_beat}.`, ok: true };
      },
    },

    {
      name: "undo_last_agent_action",
      description:
        "Undo the most recent change made by an agent tool, restoring the session exactly as it was before that action. Use this if the user says the last change was wrong.",
      inputSchema: z.object({}),
      annotations: { destructiveHint: true },
      execute: () => {
        const undone = useStudio.getState().undoLastAgentAction();
        if (!undone) return { summary: "No agent action left to undo.", ok: false };
        return { summary: `Undid: ${undone.label}.`, ok: true };
      },
    },
  ];

  const results = await Promise.all(defs.map((d) => registerTool(d)));
  return results.filter(Boolean).length;
}
