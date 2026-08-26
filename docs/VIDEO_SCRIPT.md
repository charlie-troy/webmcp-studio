# 🎛️ Agent Music Studio — Demo Video Script (<3 min)

**Target length:** 2:35–2:50 · **Format:** 1080p, browser maximized, screen + voiceover.
Captions on (YouTube auto-captions, then fix). No editing skill needed: record each section
in one continuous take; the cut points below are the only edits.

## Arc at a glance

| Time | Section | Goal |
|---|---|---|
| 0:00–0:18 | Cold open | Hook: human + agent composing the same song |
| 0:18–0:40 | The problem | Agent without WebMCP fails at a DAW |
| 0:40–1:50 | The magic | 17 WebMCP tools compose in real time |
| 1:50–2:25 | Co-use | Human steers, agent refines, agent undoes |
| 2:25–2:45 | Close | What this unlocks + links |

---

## Shot-by-shot

### 0:00–0:18 — Cold open (audio: the beat already looping)
**Visual:** App open on the demo project. Hit Play so the 8-bar loop is playing as the video starts.
**VO:** "This is an agent-native music studio. Humans compose in the piano roll — and so can an AI agent. Same session, same screen, working together."

### 0:18–0:40 — The problem
**Visual:** Quick clip of an agent trying to use a normal music site *without* WebMCP — hovering, mis-clicking, failing to drag notes. Keep it ~10s, then cut.
**VO:** "Without WebMCP, an agent helping with music has to scrape pixels and fake clicks. Drag-and-drop note editing? Impossible. It can't even tell you what notes are in the project."

### 0:40–1:50 — The magic
**Visual:** ChatGPT desktop (or flagged Chrome), site open. Type the prompt; camera stays on the site as the Agent Activity panel fills and notes land on the piano roll.
**Prompt on screen:** `Compose a dreamy lo-fi beat at 72 BPM.`
**Tool calls to expect in the Activity panel:** `set_bpm(72)` → `create_track(dreamy)` → `create_track(pluck)` → `add_notes` ×several → `create_track(bass)` → `add_notes` ×several → `create_track(drums)` → `add_notes` ×several.
**VO:** "Now watch what happens with WebMCP. The site registers structured tools — seventeen of them — and the agent calls them directly. It sets the tempo, creates a dreamy pad, a pluck, a bass, a drum kit… and every note lands on the timeline in real time. Every call shows up in the Agent Activity panel. Nothing hidden, nothing faked."
**Beat:** Hit Play. Let the loop run 2 bars.
**VO:** "Hit play and it's a song. Because the scheduler reads live state, you can hear every edit the instant it lands."

### 1:50–2:25 — Co-use
**Visual:** Human clicks a few melody notes into the piano roll, then types:
`Transpose the bass down 3 semitones and quantize the drums.`
**Tool calls:** `transpose_track(bass, -3)` → `quantize_track(drums, "1/16")`.
Then type: `Duplicate the chord progression into bars 5 through 8.`
**Tool call:** `duplicate_section(0, 4, 16)`.
Then type: `Actually, undo that.`
**Tool call:** `undo_last_agent_action`.
**VO:** "Now the co-use part. I'm clicking notes in while the agent works. 'Transpose the bass down three semitones, quantize the drums' — done. 'Duplicate the progression into bars five through eight' — done, instantly. 'Actually, undo that' — the agent reverts its own last action, because every tool call snapshots the session. The human stays in charge the whole time."

### 2:25–2:45 — Close
**Visual:** Full studio, music playing, Activity panel full of entries.
**VO:** "This is what WebMCP unlocks: a DAW where the agent is a bandmate, not a script. Every action visible, every action reversible — human and agent composing the same song. Try it yourself; the repo and live link are below."
**End card:** Title · "Built with WebMCP" · GitHub repo · live URL.

---

## Recording checklist
- [ ] Confirm the header badge reads **"WebMCP active"** (native). If it says "polyfill", native WebMCP isn't on — enable `chrome://flags/#enable-webmcp-testing` or use ChatGPT desktop.
- [ ] Browser window 1600×900+, no stray tabs or notifications visible.
- [ ] Record system audio for the music; record VO separately over it (don't talk over the beat).
- [ ] If you stumble, just pause 1 second and restart the sentence — cut it later.
- [ ] Total runtime ≤ 2:50. YouTube auto-captions on, then fix the tool names (they may garble `set_bpm` → "set BPM" etc.).
