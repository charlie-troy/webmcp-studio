# 🎛️ Agent Music Studio

An agent-native music studio built on **WebMCP**. Humans compose with the piano roll;
AI agents compose through structured tools — both work on the same live session, with
every agent action visible on screen and reversible.

Built for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/).

## Why WebMCP fits this app

A DAW is full of precise, stateful operations (`quantize`, `transpose`, `duplicate bars 1–4`)
that are slow and unreliable for an agent to perform by scraping the DOM and simulating
clicks. With WebMCP the studio registers 17 structured tools that agents call directly —
faster, more accurate, and completely visible in the on-page Agent Activity panel.

## Try it with an agent

1. Open the deployed site in **ChatGPT's desktop browser** (GPT-5.6 Sol/Terra) or in
   Chrome with `chrome://flags/#enable-webmcp-testing` enabled.
2. Ask: *"Compose a dreamy lo-fi beat at 72 BPM"* or *"Transpose the bass down 3 semitones
   and quantize the drums."*
3. Watch notes rain onto the timeline as tool calls fire, then hit Play.

Without an agent, everything is still fully usable by hand — WebMCP is a progressive
enhancement, exactly as the standard intends.

## Tools

| Tool | Kind | Description |
|---|---|---|
| `get_project_state` | read | Full session state incl. every note |
| `play_project` / `stop_playback` | action | Transport control |
| `set_bpm` | action | Session tempo (40–220) |
| `create_track` | action | New track with instrument |
| `delete_track` ⚠ | destructive | Remove a track |
| `rename_track` / `set_instrument` / `set_volume` / `set_mute` / `set_solo` | action | Track settings |
| `add_notes` | action | Batch-add up to 128 notes |
| `clear_track_notes` ⚠ | destructive | Empty a track |
| `transpose_track` / `quantize_track` / `duplicate_section` | action | Pattern operations |
| `undo_last_agent_action` | destructive | Revert the last agent edit |

Every changed tool action snapshots state, so `undo_last_agent_action` always targets
the last real agent edit; failed and idempotent calls do not pollute the undo stack.
Destructive tools are annotated with `destructiveHint` so agent harnesses can gate them.

## Architecture

- `src/state/` — Zustand store; humans and tools mutate through the same reducer.
- `src/audio/engine.ts` — Tone.js; a 16th-note scheduler reads live store state, so
  agent edits are audible instantly, mid-loop.
- `src/webmcp/modelContext.ts` — feature detection (`document.modelContext` /
  `navigator.modelContext`) + official polyfill fallback + logging wrapper.
- `src/webmcp/tools.ts` — Zod schemas compiled to JSON Schema via `z.toJSONSchema`.

## Run locally

```bash
npm install
npm run dev
```

Enable WebMCP testing in Chrome for native support, or use the bundled polyfill
(the header badge shows which mode is active).

## License

MIT
