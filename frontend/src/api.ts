/**
 * API client for 3D Magic Caster backend (Python FastAPI).
 * In dev, Vite proxies /api to the backend; in prod, same origin when served by Python.
 */

const API = "/api";
const API_KEY_STORAGE = "anthropic_api_key";

function authHeaders(): HeadersInit {
  const key = typeof localStorage !== "undefined" ? localStorage.getItem(API_KEY_STORAGE) : null;
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (key) (h as Record<string, string>)["X-Anthropic-API-Key"] = key;
  return h;
}

export function getStoredApiKey(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(API_KEY_STORAGE);
}

export function setStoredApiKey(key: string | null): void {
  if (typeof localStorage === "undefined") return;
  if (key == null) localStorage.removeItem(API_KEY_STORAGE);
  else localStorage.setItem(API_KEY_STORAGE, key);
}

export type WizardStep =
  | "look_and_feel"
  | "context"
  | "reference_image"
  | "generate_variants"
  | "pick_one"
  | "materials"
  | "export";

export interface Session {
  id: string;
  createdAt: number;
  currentStep: WizardStep;
  lookAndFeel?: { style: string; polyLevel: string; vibe: string; generationMethod?: string };
  context?: { subject: string; isHuman: boolean; posePosition?: string; description: string };
  referenceImagePath?: string;
  variantScreenshots?: string[];
  selectedVariantIndex?: number;
  materialsRequested?: boolean;
  exportFormat?: "obj" | "fbx";
  exportPath?: string;
}

export async function createSession(): Promise<{ sessionId: string; currentStep: string }> {
  const r = await fetch(`${API}/sessions/`, { method: "POST", headers: authHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getSession(sessionId: string): Promise<Session> {
  const r = await fetch(`${API}/sessions/${sessionId}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function runStep(
  sessionId: string,
  step: string,
  data: Record<string, unknown> = {}
): Promise<{ session: Session; variantScreenshots?: string[]; exportPath?: string }> {
  const r = await fetch(`${API}/steps/${sessionId}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ step, data }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error || r.statusText);
  }
  return r.json();
}

export async function uploadReference(sessionId: string, file: File): Promise<{ ok: boolean; path: string }> {
  const key = getStoredApiKey();
  const headers: HeadersInit = {};
  if (key) (headers as Record<string, string>)["X-Anthropic-API-Key"] = key;
  const form = new FormData();
  form.append("image", file);
  const r = await fetch(`${API}/steps/${sessionId}/upload-reference`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getSettings(): Promise<{ exportsPath: string }> {
  const r = await fetch(`${API}/settings/`, { headers: authHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export interface PreviousExport {
  sessionId: string;
  hasObj: boolean;
  hasFbx: boolean;
  createdAt: number;
}

export async function getPreviousExports(): Promise<{ exports: PreviousExport[] }> {
  const r = await fetch(`${API}/previous-exports/list`, { headers: authHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function setOutputFolder(path: string): Promise<{ exportsPath: string }> {
  const r = await fetch(`${API}/settings/output-folder`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ path }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail || r.statusText);
  }
  return r.json();
}

/** Returns download URL for OBJ or FBX. Open in new tab or use as href for <a download>. */
export function exportDownloadUrl(sessionId: string, format: "obj" | "fbx"): string {
  return `${API}/export/${sessionId}?format=${format}`;
}
