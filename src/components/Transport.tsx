import { useStudio } from "../state/studioStore";
import { startPlayback, stopPlayback } from "../audio/engine";
import { useWebMCPStatus } from "../webmcp/statusStore";

export function Transport() {
  const isPlaying = useStudio((s) => s.isPlaying);
  const loop = useStudio((s) => s.loop);
  const bpm = useStudio((s) => s.project.bpm);
  const play = useStudio((s) => s.play);
  const stop = useStudio((s) => s.stop);
  const setLoop = useStudio((s) => s.setLoop);
  const setBpm = useStudio((s) => s.setBpm);
  const mode = useWebMCPStatus((s) => s.mode);

  const handlePlayStop = async () => {
    if (isPlaying) {
      stopPlayback();
      stop();
    } else {
      await startPlayback();
      play();
    }
  };

  return (
    <div className="transport">
      <button className={`transport-btn ${isPlaying ? "active" : ""}`} onClick={handlePlayStop}>
        {isPlaying ? "⏹ Stop" : "▶ Play"}
      </button>
      <label className="bpm-control">
        BPM
        <input
          type="range"
          min={40}
          max={220}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
        />
        <span className="bpm-value">{bpm}</span>
      </label>
      <button
        className={`transport-btn small ${loop ? "active" : ""}`}
        onClick={() => setLoop(!loop)}
      >
        🔁 Loop
      </button>
      <div className="spacer" />
      <div className={`mcp-badge ${mode}`} role="status">
        {mode === "native" && "● WebMCP native"}
        {mode === "polyfill" && "● WebMCP polyfill"}
        {mode === "unavailable" && "○ WebMCP unavailable"}
        {mode === "checking" && "○ WebMCP…"}
      </div>
    </div>
  );
}
