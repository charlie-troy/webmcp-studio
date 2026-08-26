import { useActivityStore } from "../webmcp/activityStore";

function summarize(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "object" && "summary" in (value as Record<string, unknown>)) {
    const s = (value as Record<string, unknown>).summary;
    if (typeof s === "string") return s;
  }
  try {
    return JSON.stringify(value).slice(0, 140);
  } catch {
    return String(value);
  }
}

function argsPreview(args: unknown): string | null {
  if (args == null || (typeof args === "object" && Object.keys(args as object).length === 0)) {
    return null;
  }
  try {
    return JSON.stringify(args).slice(0, 160);
  } catch {
    return String(args);
  }
}

/**
 * Live log of every WebMCP tool invocation. Tools must never act invisibly:
 * each call shows its name, arguments, and human-readable result here.
 */
export function ActivityPanel() {
  const entries = useActivityStore((s) => s.entries);
  const clear = useActivityStore((s) => s.clear);

  return (
    <aside className="activity-panel">
      <div className="panel-title">
        Agent Activity
        <button className="clear-btn" onClick={clear} title="Clear log">
          ✕
        </button>
      </div>
      <div className="activity-list">
        {entries.length === 0 && (
          <div className="activity-empty">
            No agent calls yet.
            <br />
            <span className="hint">
              Open this page in ChatGPT's browser or Chrome with WebMCP enabled and ask the agent to
              compose something.
            </span>
          </div>
        )}
        {entries.map((e) => (
          <div key={e.id} className={`activity-entry ${e.status}`}>
            <div className="entry-head">
              <span className="entry-status-dot" />
              <span className="entry-tool">{e.tool}</span>
              <span className="entry-time">
                {new Date(e.timestamp).toLocaleTimeString([], { hour12: false })}
              </span>
            </div>
            {argsPreview(e.args) && <div className="entry-args">{argsPreview(e.args)}</div>}
            {e.status !== "running" && (
              <div className="entry-result">{summarize(e.result)}</div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
