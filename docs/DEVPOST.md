# Devpost Submission Draft — Agent Music Studio

> Copy/paste into the WebMCP Challenge submission form. Replace the `[PLACEHOLDER]`
> links after deploying and uploading the video. (The full write-up also lives in
> this repo's README.)

## Project title
**Agent Music Studio** — compose with your AI bandmate

## Tagline (one line)
A DAW where humans and agents compose the same song — every agent action visible on the timeline, every action undoable.

## Elevator pitch (short description)
Agent Music Studio is an 8-bar music production app built on WebMCP. A human edits notes in the piano roll; an AI agent composes through **17 registered, schema-described tools** (`set_bpm`, `create_track`, `add_notes`, `quantize_track`, `transpose_track`, `duplicate_section`, `undo_last_agent_action`, …). Both work on the **same live session**: notes the agent adds rain onto the timeline in real time, the Agent Activity panel logs every call, and `undo_last_agent_action` snapshots each mutation so nothing the agent does is irreversible.

## Why WebMCP (the before/after)
A DAW is full of precise, stateful operations — "quantize", "transpose down 3 semitones", "duplicate bars 1–4" — that are slow and unreliable for an agent performing them by scraping the DOM and simulating clicks. WebMCP replaces that with structured tools agents call directly: faster, more accurate, and completely visible.

**What became possible that wasn't before:** a human and an agent composing **the same song on the same screen**, where the human watches every note land, steers with natural language, hears edits mid-loop, and can undo any single agent action. The audio engine (Tone.js) reads live store state on a 16th-note scheduler, so agent edits are audible instantly — collaboration, not automation.

## Judging fit

- **WebMCP Leverage:** 17 narrow, schema-described tools expose the DAW's real operations; the agent reads the live session before editing, and structured results report what changed.
- **Execution:** a seeded 8-bar song makes the first run immediate; the same store powers piano-roll clicks and agent calls; native WebMCP and the official polyfill are both supported.
- **Potential Impact:** musicians can delegate repetitive editing while retaining authorship, audibility, visibility, and one-call undo.
- **Creativity & Ambition:** the agent is a bandmate that can alter a living arrangement mid-loop, not a text generator that exports a detached file.

## How it works / demo flow
1. Open the site in ChatGPT's desktop browser (or Chrome with the WebMCP flag).
2. Ask: *"Compose a dreamy lo-fi beat at 72 BPM."* Watch `set_bpm` → `create_track` ×4 → `add_notes` calls populate the piano roll.
3. Co-use: click notes in yourself, then *"Transpose the bass down 3 semitones and quantize the drums"*, *"Duplicate the progression into bars 5–8"*, *"Actually, undo that."*

## Tools
`get_project_state` · `play_project` · `stop_playback` · `set_bpm` · `create_track` · `delete_track` ⚠ · `rename_track` · `set_instrument` · `set_volume` · `set_mute` · `set_solo` · `add_notes` · `clear_track_notes` ⚠ · `transpose_track` · `quantize_track` · `duplicate_section` · `undo_last_agent_action` ⚠

(⚠ = annotated `destructiveHint`, so agent harnesses can gate them.)

## Tech stack
Vite + React + TypeScript · Zustand (state) · Tone.js (audio) · Zod → JSON Schema (tool schemas) · official `@mcp-b/webmcp-polyfill` fallback · `document.modelContext` / `navigator.modelContext` feature detection

## Links
- **GitHub:** https://github.com/charlie-troy/webmcp-studio
- **Live demo:** https://webmcp-studio-five.vercel.app
- **Video:** [YOUTUBE_URL_PLACEHOLDER] (script: `docs/VIDEO_SCRIPT.md`)

## Team
[Your name] — solo

## Tags
webmcp, ai-agents, music, daw, web-audio, creative-tools

## License
MIT (in-repo)
