import { useState, useCallback, useEffect } from "react";
import {
  createSession,
  getSession,
  runStep,
  uploadReference,
  exportDownloadUrl,
  type Session,
  type WizardStep,
} from "./api";
import { EasterEggs } from "./EasterEggs";
import { SettingsPanel } from "./SettingsPanel";
import { ExtrasPanel } from "./ExtrasPanel";
import { DrawingApp } from "./DrawingApp";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "look_and_feel", label: "Look & feel" },
  { id: "context", label: "Context" },
  { id: "reference_image", label: "Reference image" },
  { id: "generate_variants", label: "Generate 3 variants" },
  { id: "pick_one", label: "Pick one" },
  { id: "materials", label: "Materials & shaders" },
  { id: "export", label: "Export" },
];

const STEP_ORDER: WizardStep[] = [
  "look_and_feel", "context", "reference_image",
  "generate_variants", "pick_one", "materials", "export",
];

function previousStep(step: WizardStep): WizardStep | null {
  const i = STEP_ORDER.indexOf(step);
  return i <= 0 ? null : STEP_ORDER[i - 1];
}

type PanelVis = "visible" | "hidden" | "mini";

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [displayStep, setDisplayStep] = useState<WizardStep | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mainVis, setMainVis] = useState<PanelVis>("visible");
  const [settingsVis, setSettingsVis] = useState<PanelVis>("visible");
  const [extrasVis, setExtrasVis] = useState<PanelVis>("visible");

  const allHidden = mainVis !== "visible" && settingsVis !== "visible" && extrasVis !== "visible";

  const restoreAll = () => {
    setMainVis("visible");
    setSettingsVis("visible");
    setExtrasVis("visible");
  };

  const toggleOthersFromMain = () => {
    setSettingsVis((p) => (p === "visible" ? "hidden" : "visible"));
    setExtrasVis((p) => (p === "visible" ? "hidden" : "visible"));
  };
  const toggleOthersFromSettings = () => {
    setMainVis((p) => (p === "visible" ? "hidden" : "visible"));
    setExtrasVis((p) => (p === "visible" ? "hidden" : "visible"));
  };
  const toggleOthersFromExtras = () => {
    setMainVis((p) => (p === "visible" ? "hidden" : "visible"));
    setSettingsVis((p) => (p === "visible" ? "hidden" : "visible"));
  };

  const miniTabs: { label: string; restore: () => void }[] = [];
  if (mainVis === "mini") miniTabs.push({ label: "3D Magic Caster", restore: () => setMainVis("visible") });
  if (settingsVis === "mini") miniTabs.push({ label: "Settings", restore: () => setSettingsVis("visible") });
  if (extrasVis === "mini") miniTabs.push({ label: "Extras", restore: () => setExtrasVis("visible") });

  useEffect(() => {
    if (session?.currentStep) setDisplayStep(session.currentStep);
  }, [session?.currentStep]);

  const startSession = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { sessionId: id } = await createSession();
      setSessionId(id);
      const s = await getSession(id);
      setSession(s);
      setDisplayStep("look_and_feel");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }, []);

  const goBack = useCallback(() => {
    if (!displayStep) return;
    const prev = previousStep(displayStep);
    if (prev === null) {
      setSessionId(null);
      setSession(null);
      setDisplayStep(null);
    } else {
      setDisplayStep(prev);
    }
  }, [displayStep]);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    try { setSession(await getSession(sessionId)); } catch { /* ignore */ }
  }, [sessionId]);

  const doStep = useCallback(
    async (step: WizardStep, data: Record<string, unknown> = {}) => {
      if (!sessionId) return;
      setError(null);
      setLoading(true);
      try {
        const result = await runStep(sessionId, step, data);
        setSession(result.session);
        if (result.session?.currentStep) setDisplayStep(result.session.currentStep);
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Step failed");
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  const handleUploadReference = useCallback(
    async (file: File) => {
      if (!sessionId) return;
      setError(null);
      setLoading(true);
      try {
        await uploadReference(sessionId, file);
        await refreshSession();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setLoading(false);
      }
    },
    [sessionId, refreshSession],
  );

  const currentIndex = sessionId && session
    ? STEPS.findIndex((s) => s.id === (displayStep ?? session.currentStep))
    : 0;
  const stepIndex = currentIndex >= 0 ? currentIndex : 0;
  const showBack = sessionId !== null && displayStep != null;
  const backToPrevious = previousStep(displayStep ?? "look_and_feel");

  return (
    <div className="retro-app" style={miniTabs.length > 0 ? { paddingBottom: 36 } : undefined}>
      {/* Drawing app when all panels hidden */}
      {allHidden && (
        <>
          <DrawingApp />
          <button type="button" className="retro-btn restore-all-btn" onClick={restoreAll}>
            Show all panels
          </button>
        </>
      )}

      {/* Main panel */}
      {mainVis === "visible" && (
        <div className="os-window">
          <div className="title-bar">
            <button type="button" className="window-control wc-pink" onClick={() => setMainVis("mini")} title="Mini tab" />
            <h1>{sessionId ? "3D Magic Caster - Wizard" : "3D Magic Caster - Create 3D from prompts"}</h1>
            <button type="button" className="window-control wc-red" onClick={() => setMainVis("hidden")} title="Minimize" />
            <button type="button" className="window-control wc-blue" onClick={toggleOthersFromMain} title="Toggle others" />
          </div>
          <div className="inner-window">
            <div className="menu-bar">
              <span>3D Magic Caster</span>
              <span>File</span>
              <span>Edit</span>
              <span>Card</span>
              <span>Tool</span>
              <span>Help</span>
            </div>
            <div className="content-area">
              <EasterEggs />
              {!sessionId ? (
                <>
                  <h2 className="landing-title">Turn your ideas into 3D models</h2>
                  <p className="landing-sub">Low & high poly, videogame-style. Powered by Blender + MCP.</p>
                  <p className="landing-sub">Draw with prompts and reference images, export OBJ or FBX.</p>
                  {error && <p className="retro-error">{error}</p>}
                  <button type="button" className="landing-cta" onClick={startSession} disabled={loading}>
                    {loading ? "Starting..." : "Let's cast!"}
                  </button>
                  <span className="version">v1.0</span>
                </>
              ) : (
                <>
                  {showBack && (
                    <button type="button" className="retro-back" onClick={goBack} title={backToPrevious ? "Previous step" : "Back to start"}>
                      <span className="retro-back-arrow" aria-hidden />
                      BACK
                    </button>
                  )}
                  <nav className="stepper">
                    {STEPS.map((s, i) => (
                      <span key={s.id} className={i === stepIndex ? "active" : i < stepIndex ? "done" : ""}>
                        {i + 1}. {s.label}
                      </span>
                    ))}
                  </nav>
                  {error && <p className="retro-error">{error}</p>}
                  {displayStep === "look_and_feel" && (
                    <LookAndFeelStep onNext={(data) => doStep("look_and_feel", data)} loading={loading} />
                  )}
                  {displayStep === "context" && (
                    <ContextStep onNext={(data) => doStep("context", data)} loading={loading} />
                  )}
                  {displayStep === "reference_image" && (
                    <ReferenceImageStep onUpload={handleUploadReference} onNext={() => doStep("reference_image")} loading={loading} />
                  )}
                  {displayStep === "generate_variants" && session && (
                    <GenerateVariantsStep
                      onRun={() => doStep("generate_variants", {})}
                      onContinueToPick={() => setDisplayStep("pick_one")}
                      loading={loading}
                      session={session}
                    />
                  )}
                  {session?.variantScreenshots && session.variantScreenshots.length > 0 && displayStep === "pick_one" && (
                    <PickOneStep
                      screenshots={session.variantScreenshots}
                      onPick={(index) => doStep("pick_one", { selectedVariantIndex: index })}
                      loading={loading}
                    />
                  )}
                  {displayStep === "materials" && (
                    <MaterialsStep onNext={(yes) => doStep("materials", { materialsRequested: yes })} loading={loading} />
                  )}
                  {displayStep === "export" && (
                    <ExportStep sessionId={sessionId!} onExport={(format) => doStep("export", { format })} loading={loading} />
                  )}
                  {displayStep && !STEP_ORDER.includes(displayStep) && <p>Current step: {displayStep}</p>}
                  <span className="version">v1.0</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {settingsVis === "visible" && (
        <SettingsPanel
          onPink={() => setSettingsVis("mini")}
          onRed={() => setSettingsVis("hidden")}
          onBlue={toggleOthersFromSettings}
        />
      )}

      {/* Extras panel */}
      {extrasVis === "visible" && (
        <ExtrasPanel
          onPink={() => setExtrasVis("mini")}
          onRed={() => setExtrasVis("hidden")}
          onBlue={toggleOthersFromExtras}
        />
      )}

      {/* Mini-tabs bar at the bottom */}
      {miniTabs.length > 0 && (
        <div className="mini-tabs-bar">
          {miniTabs.map((tab) => (
            <button key={tab.label} type="button" className="mini-tab-btn" onClick={tab.restore}>
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Step sub-components ────────────────────────────── */

function LookAndFeelStep({
  onNext,
  loading,
}: {
  onNext: (data: { lookAndFeel: { style: string; polyLevel: string; vibe: string } }) => void;
  loading: boolean;
}) {
  const [style, setStyle] = useState("");
  const [polyLevel, setPolyLevel] = useState<"low" | "high" | "mixed">("low");
  const [vibe, setVibe] = useState("");
  return (
    <section>
      <h2>Look & feel</h2>
      <p>Style (e.g. low-poly, stylized, realistic):</p>
      <input className="retro-input" type="text" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="e.g. low-poly videogame" />
      <p>Poly level:</p>
      <select className="retro-select" value={polyLevel} onChange={(e) => setPolyLevel(e.target.value as "low" | "high" | "mixed")}>
        <option value="low">Low poly</option>
        <option value="high">High poly</option>
        <option value="mixed">Mixed</option>
      </select>
      <p>Vibe (e.g. dungeon, beach, studio):</p>
      <input className="retro-input" type="text" value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="e.g. dark fantasy" />
      <button type="button" className="retro-btn primary" onClick={() => onNext({ lookAndFeel: { style, polyLevel, vibe } })} disabled={loading}>
        {loading ? "Saving..." : "Next"}
      </button>
    </section>
  );
}

function ContextStep({
  onNext,
  loading,
}: {
  onNext: (data: { context: { subject: string; isHuman: boolean; posePosition?: string; description: string } }) => void;
  loading: boolean;
}) {
  const [subject, setSubject] = useState<"character" | "prop" | "scene">("character");
  const [isHuman, setIsHuman] = useState(false);
  const [posePosition, setPosePosition] = useState("");
  const [description, setDescription] = useState("");
  return (
    <section>
      <h2>Context</h2>
      <p>Subject:</p>
      <select className="retro-select" value={subject} onChange={(e) => setSubject(e.target.value as "character" | "prop" | "scene")}>
        <option value="character">Character</option>
        <option value="prop">Prop</option>
        <option value="scene">Scene</option>
      </select>
      <p>
        <label>
          <input type="checkbox" checked={isHuman} onChange={(e) => setIsHuman(e.target.checked)} /> Human (or creature)
        </label>
      </p>
      <p>Pose/position (optional):</p>
      <input className="retro-input" type="text" value={posePosition} onChange={(e) => setPosePosition(e.target.value)} placeholder="e.g. standing, arms crossed" />
      <p>Short description:</p>
      <textarea className="retro-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. A warrior with a sword" rows={3} />
      <button type="button" className="retro-btn primary" onClick={() => onNext({ context: { subject, isHuman, posePosition, description } })} disabled={loading}>
        {loading ? "Saving..." : "Next"}
      </button>
    </section>
  );
}

function ReferenceImageStep({
  onUpload,
  onNext,
  loading,
}: { onUpload: (file: File) => void; onNext: () => void; loading: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const handleFile = (f: File | null) => {
    setFile(f);
    setUploaded(false);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };
  const handleUpload = async () => {
    if (!file) return;
    onUpload(file);
    setUploaded(true);
  };
  return (
    <section>
      <h2>Reference image (optional)</h2>
      <p>Upload a reference image to guide the 3D generation. Claude will use it for shape and style.</p>
      <input className="retro-input" type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
      {preview && (
        <div style={{ margin: "8px 0" }}>
          <img src={preview} alt="Preview" style={{ maxWidth: 200, maxHeight: 200, border: "2px solid #000", imageRendering: "auto" }} />
        </div>
      )}
      {file && !uploaded && (
        <button type="button" className="retro-btn" onClick={handleUpload} disabled={loading}>
          {loading ? "Uploading..." : "Upload reference"}
        </button>
      )}
      {uploaded && <p style={{ fontWeight: "bold" }}>Reference uploaded. Click Next to continue.</p>}
      <button type="button" className="retro-btn primary" onClick={onNext} disabled={loading}>
        {loading ? "..." : uploaded ? "Next" : "Skip / Next"}
      </button>
    </section>
  );
}

function GenerateVariantsStep({
  onRun,
  onContinueToPick,
  loading,
  session,
}: { onRun: () => void; onContinueToPick?: () => void; loading: boolean; session: Session }) {
  const result = session.variantScreenshots;
  return (
    <section>
      <h2>Generate 3 rough variants</h2>
      <p>Blender (via MCP) will create 3 different options. This may take a minute.</p>
      {!result?.length && (
        <button type="button" className="retro-btn primary" onClick={onRun} disabled={loading}>
          {loading ? "Generating..." : "Generate 3 variants"}
        </button>
      )}
      {result && result.length > 0 && (
        <div>
          <div className="variant-grid">
            {result.map((src, i) => (
              <img key={i} src={src} alt={`Variant ${i + 1}`} style={{ width: "100%", border: "2px solid #000" }} />
            ))}
          </div>
          <p style={{ marginTop: 12 }}>Pick one in the next step.</p>
          {onContinueToPick && (
            <button type="button" className="retro-btn primary" onClick={onContinueToPick} style={{ marginTop: 8 }}>
              Next: Pick one
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function PickOneStep({ screenshots, onPick, loading }: { screenshots: string[]; onPick: (index: number) => void; loading: boolean }) {
  return (
    <section>
      <h2>Pick one variant</h2>
      <p>Click a variant to select it and continue.</p>
      <div className="variant-grid">
        {screenshots.map((src, i) => (
          <button key={i} type="button" className="variant-card" onClick={() => onPick(i)} disabled={loading}>
            <img src={src} alt={`Variant ${i + 1}`} />
            <span>Choose {i + 1}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MaterialsStep({ onNext, loading }: { onNext: (yes: boolean) => void; loading: boolean }) {
  return (
    <section>
      <h2>Materials & shaders</h2>
      <p>Apply materials and shaders (e.g. Poly Haven textures, Principled BSDF)?</p>
      <button type="button" className="retro-btn" onClick={() => onNext(true)} disabled={loading}>
        {loading ? "Applying..." : "Yes"}
      </button>
      <button type="button" className="retro-btn primary" onClick={() => onNext(false)} disabled={loading}>
        No
      </button>
    </section>
  );
}

function ExportStep({
  sessionId,
  onExport,
  loading,
}: { sessionId: string; onExport: (format: "obj" | "fbx") => void; loading: boolean }) {
  const [done, setDone] = useState(false);
  const handleExport = async (format: "obj" | "fbx") => {
    await onExport(format);
    setDone(true);
  };
  return (
    <section>
      <h2>Export</h2>
      <p>Choose format and run export. Then download the file.</p>
      <button type="button" className="retro-btn" onClick={() => handleExport("obj")} disabled={loading}>
        {loading ? "Exporting..." : "Export OBJ"}
      </button>
      <button type="button" className="retro-btn" onClick={() => handleExport("fbx")} disabled={loading}>
        {loading ? "Exporting..." : "Export FBX"}
      </button>
      {done && (
        <p style={{ marginTop: 12 }}>
          Download: <a className="retro-link" href={exportDownloadUrl(sessionId, "obj")} download="model.obj">OBJ</a>
          {" - "}
          <a className="retro-link" href={exportDownloadUrl(sessionId, "fbx")} download="model.fbx">FBX</a>
        </p>
      )}
    </section>
  );
}
