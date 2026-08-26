/**
 * Audio engine built on Tone.js.
 *
 * Design: a single 16th-note scheduler loop reads the live Zustand store on
 * every tick. Human edits and agent tool calls take effect immediately — no
 * rescheduling, no drift between what the UI shows and what plays.
 */
import * as Tone from "tone";
import { useStudio, TOTAL_BEATS } from "../state/studioStore";
import type { Instrument, Track } from "../state/model";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface TriggerInput {
  trigger: (pitch: number, velocity: number, durationBeats: number, time: number) => void;
}

interface TrackNodes {
  instrument: Instrument;
  gain: Tone.Gain;
  sources: Tone.ToneAudioNode[];
  triggers: TriggerInput[];
}

const trackNodes = new Map<string, TrackNodes>();

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const midi = (p: number) => `${Math.floor(p / 12 - 1)}${NOTE_NAMES[((p % 12) + 12) % 12]}`;
/** Convert beats to seconds at the current transport tempo. */
const beatsToSeconds = (b: number) => (60 / Tone.getTransport().bpm.value) * b;

/** Map a MIDI pitch to a drum lane index (kick/snare/hat). */
function drumLane(pitch: number): number {
  if (pitch <= 37) return 0;
  if (pitch <= 40) return 1;
  return 2;
}

function ensureTrackNodes(track: Track): TrackNodes {
  let entry = trackNodes.get(track.id);
  if (!entry || entry.instrument !== track.instrument) {
    if (entry) {
      entry.sources.forEach((s) => s.dispose());
      entry.gain.dispose();
    }
    const gain = new Tone.Gain(1);
    gain.toDestination();
    const sources: Tone.ToneAudioNode[] = [];
    let triggers: TriggerInput[];

    switch (track.instrument) {
      case "dreamy": {
        const synth = new Tone.PolySynth(Tone.FMSynth as any, {
          harmonicity: 2.5,
          modulationIndex: 6,
          envelope: { attack: 0.05, decay: 0.6, sustain: 0.3, release: 1.6 },
          modulationEnvelope: { attack: 0.2, decay: 0.4, sustain: 0.2, release: 1 },
        } as any);
        synth.maxPolyphony = 24;
        const reverb = new Tone.Reverb({ decay: 4, wet: 0.35 });
        synth.chain(reverb, gain);
        sources.push(synth, reverb);
        triggers = [{ trigger: (p, v, d, t) => void synth.triggerAttackRelease(midi(p), beatsToSeconds(d), t, v) }];
        break;
      }
      case "pluck": {
        // PluckSynth is NOT a Monophonic voice, so Tone v15's PolySynth refuses
        // it ("Voice must extend Monophonic class"). Use a small round-robin
        // pool of individual PluckSynths instead.
        const pool: Tone.PluckSynth[] = [];
        const delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.25, wet: 0.22 });
        delay.connect(gain);
        for (let i = 0; i < 12; i++) {
          const pluck = new Tone.PluckSynth({ dampening: 3200, resonance: 0.9 });
          pluck.connect(delay);
          pool.push(pluck);
        }
        sources.push(...pool, delay);
        let cursor = 0;
        triggers = [
          {
            trigger: (p, _v, _d, t) => {
              const pluck = pool[cursor % pool.length];
              cursor++;
              pluck.triggerAttack(midi(p), t);
            },
          },
        ];
        break;
      }
      case "bass": {
        const synth = new Tone.MonoSynth({
          oscillator: { type: "triangle" },
          filterEnvelope: { baseFrequency: 120, octaves: 2.2 },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.4 },
        });
        synth.connect(gain);
        sources.push(synth);
        triggers = [{ trigger: (p, v, d, t) => void synth.triggerAttackRelease(midi(p), beatsToSeconds(d), t, v) }];
        break;
      }
      case "drums":
      default: {
        const kick = new Tone.MembraneSynth({ pitchDecay: 0.06, octaves: 6 });
        const snare = new Tone.NoiseSynth({
          noise: { type: "white" },
          envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
        });
        const hat = new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
          harmonicity: 5.1,
          resonance: 6200,
          octaves: 1,
        } as any);
        kick.connect(gain);
        snare.connect(gain);
        hat.connect(gain);
        sources.push(kick, snare, hat);
        triggers = [
          { trigger: (_p, v, _d, t) => void kick.triggerAttackRelease("C1", "16n", t, Math.min(1, v + 0.1)) },
          { trigger: (_p, v, _d, t) => void snare.triggerAttackRelease("16n", t, v * 0.7) },
          { trigger: (_p, v, _d, t) => void hat.triggerAttackRelease("32n", t, v * 0.45) },
        ];
        break;
      }
    }

    entry = { instrument: track.instrument, gain, sources, triggers };
    trackNodes.set(track.id, entry);
  }
  return entry;
}

let loopId: number | null = null;

export async function startPlayback(): Promise<void> {
  await Tone.start();
  const transport = Tone.getTransport();
  transport.bpm.value = useStudio.getState().project.bpm;
  transport.loop = true;
  transport.loopEnd = `${TOTAL_BEATS}m`;
  if (loopId == null) {
    loopId = transport.scheduleRepeat((time) => tick(time), "16n");
  }
  transport.start();
}

export function stopPlayback(): void {
  const transport = Tone.getTransport();
  transport.stop();
  transport.position = 0;
  stepCounter = 0;
  for (const node of trackNodes.values()) {
    for (const src of node.sources) {
      const s = src as any;
      if (typeof s.releaseAll === "function") s.releaseAll();
    }
  }
}

let stepCounter = 0;

function tick(time: number): void {
  const { project } = useStudio.getState();
  const transport = Tone.getTransport();
  transport.bpm.rampTo(project.bpm, 0.05);

  const beat = stepCounter / 4;
  const beatEnd = beat + 0.25;
  stepCounter++;

  const anySolo = project.tracks.some((t) => t.soloed);

  for (const track of project.tracks) {
    const audible = anySolo ? track.soloed : !track.muted;
    const nodes = ensureTrackNodes(track);
    nodes.gain.gain.rampTo(audible ? track.volume : 0, 0.03);
    if (!audible) continue;

    for (const note of track.notes) {
      if (note.start >= beat && note.start < beatEnd) {
        const lane =
          track.instrument === "drums" ? nodes.triggers[drumLane(note.pitch)] : nodes.triggers[0];
        try {
          lane.trigger(note.pitch, note.velocity, note.duration, time);
        } catch (err) {
          /* voice exhaustion etc. — never kill the transport */
          console.error(`[engine] trigger failed on "${track.name}"`, err);
        }
      }
    }
  }

  if (beat >= TOTAL_BEATS) stepCounter = 0;
}
