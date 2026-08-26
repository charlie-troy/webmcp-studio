import { useEffect } from "react";
import { Transport } from "./components/Transport";
import { TrackList } from "./components/TrackList";
import { PianoRoll } from "./components/PianoRoll";
import { ActivityPanel } from "./components/ActivityPanel";
import { initWebMCP, getWebMCPStatus } from "./webmcp/modelContext";
import { registerAllTools } from "./webmcp/tools";
import { useStudio } from "./state/studioStore";

export default function App() {
  const projectName = useStudio((s) => s.project.name);
  const trackCount = useStudio((s) => s.project.tracks.length);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load a pleasant starter session so the app is never empty.
      if (useStudio.getState().project.tracks.length === 0) {
        useStudio.getState().loadDemoProject();
      }
      try {
        await initWebMCP();
        if (!cancelled && getWebMCPStatus().mode !== "unavailable") {
          await registerAllTools();
        }
      } catch (err) {
        console.error("[webmcp] init failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">🎛️ Agent Music Studio</div>
        <div className="session-name">{projectName}</div>
        <div className="header-stats">
          {trackCount} tracks · 8 bars
        </div>
      </header>
      <Transport />
      <main className="workspace">
        <TrackList />
        <PianoRoll />
        <ActivityPanel />
      </main>
    </div>
  );
}
