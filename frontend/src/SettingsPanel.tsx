import { useState, useEffect } from "react";
import { getStoredApiKey, setStoredApiKey } from "./api";

interface Props {
  onPink: () => void;
  onRed: () => void;
  onBlue: () => void;
}

export function SettingsPanel({ onPink, onRed, onBlue }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getStoredApiKey();
    if (stored) setApiKey(stored);
  }, []);

  const handleSave = () => {
    const value = apiKey.trim() || null;
    setStoredApiKey(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="os-window settings-panel">
      <div className="title-bar">
        <button type="button" className="window-control wc-pink" onClick={onPink} title="Mini tab" />
        <h1>Settings - API Key</h1>
        <button type="button" className="window-control wc-red" onClick={onRed} title="Minimize" />
        <button type="button" className="window-control wc-blue" onClick={onBlue} title="Toggle others" />
      </div>
      <div className="inner-window">
        <div className="menu-bar">
          <span>Settings</span>
        </div>
        <div className="content-area content-area-small">
          <p>Claude API Key (used for Blender steps). Stored in this browser only.</p>
          <input
            className="retro-input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            autoComplete="off"
          />
          <button type="button" className="retro-btn primary" onClick={handleSave}>
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
