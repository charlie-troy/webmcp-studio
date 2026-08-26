import { useStudio } from "../state/studioStore";
import { INSTRUMENT_COLORS, type Track } from "../state/colors";

function TrackRow({ track }: { track: Track }) {
  const selectedTrackId = useStudio((s) => s.selectedTrackId);
  const selectTrack = useStudio((s) => s.selectTrack);
  const setMute = useStudio((s) => s.setMute);
  const setSolo = useStudio((s) => s.setSolo);
  const setVolume = useStudio((s) => s.setVolume);
  const selected = selectedTrackId === track.id;

  return (
    <div
      className={`track-row ${selected ? "selected" : ""} ${track.muted ? "muted" : ""}`}
      onClick={() => selectTrack(track.id)}
    >
      <div className="track-header">
        <span className="track-dot" style={{ background: INSTRUMENT_COLORS[track.instrument] }} />
        <input
          className="track-name"
          value={track.name}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => useStudio.getState().renameTrack(track.id, e.target.value)}
        />
      </div>
      <div className="track-meta">
        {track.instrument} · {track.notes.length} notes
      </div>
      <div className="track-controls" onClick={(e) => e.stopPropagation()}>
        <button
          className={`pill ${track.muted ? "on danger" : ""}`}
          title="Mute"
          onClick={() => setMute(track.id, !track.muted)}
        >
          M
        </button>
        <button
          className={`pill ${track.soloed ? "on" : ""}`}
          title="Solo"
          onClick={() => setSolo(track.id, !track.soloed)}
        >
          S
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={track.volume}
          title={`Volume ${Math.round(track.volume * 100)}%`}
          onChange={(e) => setVolume(track.id, Number(e.target.value))}
        />
      </div>
    </div>
  );
}

export function TrackList() {
  const tracks = useStudio((s) => s.project.tracks);
  const createTrack = useStudio((s) => s.createTrack);

  return (
    <aside className="tracks-panel">
      <div className="panel-title">Tracks</div>
      <div className="track-list">
        {tracks.map((t) => (
          <TrackRow key={t.id} track={t} />
        ))}
      </div>
      <button
        className="add-track"
        onClick={() => createTrack({ instrument: "dreamy", name: `Track ${tracks.length + 1}` })}
      >
        + Add track
      </button>
    </aside>
  );
}
