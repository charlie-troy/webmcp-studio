import { useStudio, TOTAL_BEATS, BEATS_PER_BAR } from "../state/studioStore";
import { INSTRUMENT_COLORS } from "../state/colors";

const PITCH_MIN = 24;
const PITCH_MAX = 96;
const ROWS = PITCH_MAX - PITCH_MIN + 1;

/**
 * Piano-roll grid. Notes from every track render color-coded by instrument.
 * Click an empty cell to add a 1-beat note on the selected track; click a note
 * to remove it. The agent's notes appear here instantly — that's the point.
 */
export function PianoRoll() {
  const tracks = useStudio((s) => s.project.tracks);
  const selectedTrackId = useStudio((s) => s.selectedTrackId);
  const addNotes = useStudio((s) => s.addNotes);
  const removeNote = useStudio((s) => s.removeNote);
  const selectTrack = useStudio((s) => s.selectTrack);

  const cellClick = (beatIndex: number, pitch: number) => {
    // Did we hit an existing note?
    for (const track of tracks) {
      const note = track.notes.find(
        (n) =>
          n.pitch === pitch &&
          beatIndex >= Math.floor(n.start) &&
          beatIndex < Math.ceil(n.start + n.duration),
      );
      if (note) {
        removeNote(track.id, note.id);
        return;
      }
    }
    let targetId = selectedTrackId;
    if (!targetId || !tracks.some((t) => t.id === targetId)) {
      if (tracks.length === 0) return;
      selectTrack(tracks[tracks.length - 1].id);
      targetId = tracks[tracks.length - 1].id;
    }
    addNotes(targetId, [{ pitch, start: beatIndex, duration: 1, velocity: 0.8 }]);
  };

  return (
    <section className="roll-panel">
      <div className="panel-title">
        Piano Roll <span className="hint">(click to add · click a note to remove)</span>
      </div>
      <div className="roll-scroll">
        <div className="roll-grid" style={{ gridTemplateRows: `repeat(${ROWS}, 12px)` }}>
          {Array.from({ length: ROWS }, (_, rowIdx) => {
            const pitch = PITCH_MAX - rowIdx;
            const isBlack =
              [1, 3, 6, 8, 10].includes(((pitch % 12) + 12) % 12);
            return (
              <div
                key={pitch}
                className={`roll-row ${isBlack ? "black" : ""} ${pitch % BEATS_PER_BAR === 0 ? "c-row" : ""}`}
                style={{ gridColumn: "1 / -1", gridRow: rowIdx + 1 }}
              >
                {Array.from({ length: TOTAL_BEATS }, (_, beat) => (
                  <div
                    key={beat}
                    className={`roll-cell ${beat % BEATS_PER_BAR === 0 ? "bar-line" : ""}`}
                    onClick={() => cellClick(beat, pitch)}
                  />
                ))}
              </div>
            );
          })}
          {/* Notes overlay */}
          <div className="notes-overlay" style={{ gridRow: `1 / ${ROWS + 1}`, gridColumn: "1 / -1" }}>
            {tracks.flatMap((track) =>
              track.notes
                .filter((n) => n.pitch >= PITCH_MIN && n.pitch <= PITCH_MAX)
                .map((note) => {
                  const row = PITCH_MAX - note.pitch;
                  return (
                    <div
                      key={note.id}
                      className="note-block"
                      title={`${track.name} · MIDI ${note.pitch}`}
                      style={{
                        left: `${(note.start / TOTAL_BEATS) * 100}%`,
                        top: `${row * 12}px`,
                        width: `${Math.max((note.duration / TOTAL_BEATS) * 100, 1)}%`,
                        background: INSTRUMENT_COLORS[track.instrument],
                        opacity: track.muted ? 0.25 : 0.9,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNote(track.id, note.id);
                      }}
                    />
                  );
                }),
            )}
            {/* Bar lines */}
            {Array.from({ length: TOTAL_BEATS / BEATS_PER_BAR + 1 }, (_, bar) => (
              <div
                key={bar}
                className="bar-rule"
                style={{ left: `${((bar * BEATS_PER_BAR) / TOTAL_BEATS) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
