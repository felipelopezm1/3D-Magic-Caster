import { useState, useEffect, useCallback } from "react";
import { getSettings, getPreviousExports, exportDownloadUrl, setOutputFolder } from "./api";

interface Props {
  onPink: () => void;
  onRed: () => void;
  onBlue: () => void;
}

export function ExtrasPanel({ onPink, onRed, onBlue }: Props) {
  const [exportsPath, setExportsPath] = useState<string | null>(null);
  const [editPath, setEditPath] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [exports, setExports] = useState<{ sessionId: string; hasObj: boolean; hasFbx: boolean; createdAt: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, list] = await Promise.all([getSettings(), getPreviousExports()]);
      setExportsPath(settings.exportsPath);
      setEditPath(settings.exportsPath);
      setExports(list.exports);
    } catch {
      setExportsPath(null);
      setExports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveFolder = async () => {
    const trimmed = editPath.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await setOutputFolder(trimmed);
      setExportsPath(res.exportsPath);
      setEditPath(res.exportsPath);
      setEditing(false);
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleBrowse = async () => {
    try {
      // File System Access API (Chromium browsers)
      const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      if (handle?.name) {
        setEditPath(handle.name);
        setEditing(true);
      }
    } catch {
      // User cancelled or API not supported -- no-op
    }
  };

  const supportsDirectoryPicker = typeof (window as any).showDirectoryPicker === "function";

  const formatDate = (ts: number) => {
    try {
      return new Date(ts * 1000).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="os-window extras-panel">
      <div className="title-bar">
        <button type="button" className="window-control wc-pink" onClick={onPink} title="Mini tab" />
        <h1>Output folder &amp; previous models</h1>
        <button type="button" className="window-control wc-red" onClick={onRed} title="Minimize" />
        <button type="button" className="window-control wc-blue" onClick={onBlue} title="Toggle others" />
      </div>
      <div className="inner-window">
        <div className="menu-bar">
          <span>Extras</span>
        </div>
        <div className="content-area content-area-small">
          <p><strong>Output folder</strong></p>
          {editing ? (
            <div className="folder-edit-row">
              <input
                className="retro-input"
                type="text"
                value={editPath}
                onChange={(e) => setEditPath(e.target.value)}
                placeholder="/path/to/folder"
                style={{ marginBottom: 0, flex: 1 }}
              />
              {supportsDirectoryPicker && (
                <button type="button" className="retro-btn" onClick={handleBrowse} title="Browse">
                  ...
                </button>
              )}
              <button type="button" className="retro-btn primary" onClick={handleSaveFolder} disabled={saving}>
                {saving ? "..." : "Save"}
              </button>
              <button type="button" className="retro-btn" onClick={() => { setEditing(false); setEditPath(exportsPath ?? ""); setSaveMsg(null); }}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="folder-display-row">
              <p className="retro-output-path">{loading ? "..." : exportsPath ?? "-"}</p>
              <button type="button" className="retro-btn" onClick={() => setEditing(true)} style={{ marginTop: 0 }}>
                Change
              </button>
            </div>
          )}
          {saveMsg && <p className="folder-save-msg">{saveMsg}</p>}

          <p style={{ marginTop: 8 }}><strong>Previous models</strong></p>
          {loading ? (
            <p>Loading...</p>
          ) : exports.length === 0 ? (
            <p>No exports yet. Complete the wizard and export to see them here.</p>
          ) : (
            <ul className="previous-models-list">
              {exports.map((ex) => (
                <li key={ex.sessionId} className="previous-model-item">
                  <span className="previous-model-id">{ex.sessionId.slice(0, 8)}...</span>
                  <span className="previous-model-date">{formatDate(ex.createdAt)}</span>
                  <span className="previous-model-links">
                    {ex.hasObj && (
                      <a className="retro-link" href={exportDownloadUrl(ex.sessionId, "obj")} download="model.obj">OBJ</a>
                    )}
                    {ex.hasObj && ex.hasFbx && " - "}
                    {ex.hasFbx && (
                      <a className="retro-link" href={exportDownloadUrl(ex.sessionId, "fbx")} download="model.fbx">FBX</a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="retro-btn" onClick={load} style={{ marginTop: 4 }}>Refresh</button>
        </div>
      </div>
    </div>
  );
}
