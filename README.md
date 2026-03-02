# 3D Magic Caster

Turn text prompts (and optional reference images) into downloadable 3D models. A retro-styled React wizard drives a Python backend that orchestrates **Claude AI + Blender via MCP** to generate low-poly, high-poly, or mixed-detail 3D content — exported as OBJ or FBX.

```
  Prompt + ref image  -->  Claude AI  -->  Blender (MCP)  -->  OBJ / FBX
        ^                                                        |
        |             React wizard (7 steps)                     v
        +--  style, context, reference, generate, pick  -->  Downloads/
```

## Features

- **7-step wizard**: style & poly level, context & pose, reference image, generate 3 variants, pick one, materials & shaders, export
- **3 generation methods**: AI Generated (Hyper3D/Hunyuan3D), Library Search (Sketchfab), or Scripted (legacy primitives)
- **3 poly levels**: low (stylized game-ready), high (production-quality), mixed (detail where it matters)
- **AI 3D generation**: uses Hyper3D/Rodin or Hunyuan3D for realistic meshes with built-in materials when available
- **Library search**: searches Sketchfab's 4M+ models and Poly Haven for production-quality assets
- **Smart fallback**: automatically detects available integrations and picks the best generation strategy
- **Reference image to 3D**: upload a reference image — Hyper3D can generate a mesh that resembles it directly
- **Humanoid-aware prompts**: anatomical guidelines for human/creature characters with pose control
- **Materials & shaders**: Poly Haven PBR textures when available, Principled BSDF fallback with theme-matched colors
- **Retro pixel UI** with easter-egg doodles (WigglyPaint / Decker aesthetic)
- **Window controls**: pink = mini-tab, red = minimize, blue = toggle other panels
- **Doodle Pad**: hidden drawing app when all panels are minimized (download as PNG)
- **API key in browser only** — never stored on disk
- **Configurable output folder** (defaults to `~/Downloads/3D-Magic-Caster-exports`)
- **Previous exports** list with direct download links

## Prerequisites

| Dependency | Version | Why |
|---|---|---|
| **Python** | 3.10+ | Backend (FastAPI) |
| **Node.js** | 18+ | Frontend (Vite + React) |
| **uv** | latest | Runs `uvx blender-mcp` (the MCP bridge) |
| **Blender** | 3.0+ (tested on 5.0) | 3D engine; needs the blender-mcp addon |
| **Claude API key** | — | Powers the AI orchestration |

### Install uv (if missing)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/AhmedALetworworker/3D-Magic-Caster.git
cd 3D-Magic-Caster

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configure (optional)

```bash
cp .env.example .env
```

The API key can also be entered in the browser Settings panel — no `.env` required.

```dotenv
ANTHROPIC_API_KEY=sk-ant-api03-...   # or leave blank and enter in-browser
BLENDER_HOST=localhost
BLENDER_PORT=9876
OUTPUT_FOLDER=~/Downloads/3D-Magic-Caster-exports
```

### 3. Set up the Blender addon

1. Download the addon:

```bash
curl -L "https://raw.githubusercontent.com/ahujasid/blender-mcp/main/addon.py" \
  -o /tmp/blender_mcp_addon.py
```

2. Open **Blender**
3. Go to **Edit > Preferences > Add-ons**
4. Click **Install...** and select `/tmp/blender_mcp_addon.py`
5. Enable the checkbox next to **"Interface: Blender MCP"**

### 4. Connect the Blender addon

1. In Blender's 3D Viewport, press **N** to open the sidebar
2. Click the **"BlenderMCP"** tab
3. Click **"Connect"**
4. Status should show **Connected** — port 9876 is now listening

> **Important**: Blender must stay open and connected during the entire session. Each wizard run communicates with Blender in real time.

### 4b. Enable AI integrations (optional but recommended)

These integrations dramatically improve model quality. Configure them in **Blender > Edit > Preferences > Add-ons > Blender MCP** (expand the addon preferences):

#### Hyper3D / Rodin (AI text-to-3D and image-to-3D)

Best for: characters, humanoids, organic models — generates real 3D meshes with materials from text or images.

1. Get an API key from [hyper3d.ai](https://hyper3d.ai) or [fal.ai](https://fal.ai) (free trial available with limited daily generations)
2. In the Blender MCP addon preferences, paste the key into the **Hyper3D API Key** field
3. The app will automatically detect and use Hyper3D when the "AI Generated" method is selected

#### Hunyuan3D (alternative AI generator)

Tencent's alternative 3D generator. Follow the same setup as Hyper3D if you prefer this engine.

#### Sketchfab (4M+ existing 3D models)

Best for: real-world objects, vehicles, weapons, architecture — search and download production-quality models.

1. Create a free account at [sketchfab.com](https://sketchfab.com)
2. Go to your profile settings and copy your **API Token**
3. In the Blender MCP addon preferences, paste it into the **Sketchfab API Token** field
4. The app will search Sketchfab when "Library Search" method is selected or as part of the auto strategy

#### Poly Haven (PBR textures, HDRIs, and models)

Best for: realistic materials — metal, wood, fabric, stone textures with full PBR maps.

- **Enabled by default** in blender-mcp — no API key needed
- Used automatically during the Materials step for realistic texturing
- Also provides free 3D models and HDRIs for environment lighting

> **Tip**: For the best humanoid quality, enable Hyper3D and select "AI Generated" in the Look & Feel step. The difference vs scripted primitives is dramatic.

### 5. Start the app

**Terminal 1 — backend:**

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --port 3001 --host 127.0.0.1
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

### 6. Use it

Open **http://localhost:5173** in your browser.

1. In the **Settings** panel, paste your Claude API key and click **Save**
2. Click **"Let's cast!"**
3. **Step 1 — Look & feel**: Choose generation method (AI Generated / Scripted / Library Search), style, poly level, and vibe
4. **Step 2 — Context**: Pick subject type, toggle human/creature, set pose, write a description
5. **Step 3 — Reference image** *(optional)*: Upload a JPEG/PNG/WebP/GIF — used for Claude vision AND Hyper3D image-to-3D
6. **Step 4 — Generate**: Claude creates 3 variants using the selected method (~1-3 min depending on method)
7. **Step 5 — Pick one**: Click the variant you like best
8. **Step 6 — Materials**: Click **Yes** to apply materials (Poly Haven PBR textures if available, Principled BSDF fallback)
9. **Step 7 — Export**: Choose OBJ or FBX, then download

Your model lands in `~/Downloads/3D-Magic-Caster-exports/<session-id>/`.

---

## Production build

Serve everything from one port:

```bash
cd frontend && npm run build && cd ..
cd backend && source .venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --port 3001 --host 0.0.0.0
```

Open **http://localhost:3001**.

---

## How it works

```
Browser (React)                    Backend (FastAPI)               Blender
     |                                   |                           |
     |-- POST /api/steps/:id ----------->|                           |
     |   { step: "generate_variants" }   |                           |
     |                                   |-- spawn uvx blender-mcp ->|
     |                                   |   (stdio MCP session)     |
     |                                   |                           |
     |                                   |-- Claude API call ------->|
     |                                   |   (with MCP tools)        |
     |                                   |                           |
     |                                   |<-- tool_use: create_obj --|
     |                                   |-- call_tool ------------->|
     |                                   |<-- result (screenshot) ---|
     |                                   |   ... repeat per variant  |
     |                                   |                           |
     |<-- { variantScreenshots: [...] } --|                           |
```

The orchestrator (`orchestrator.py`) builds **integration-aware system prompts** that guide Claude to:

1. **Check available integrations**: `get_hyper3d_status()`, `get_sketchfab_status()`, `get_polyhaven_status()`
2. **Use AI generation when available**: Hyper3D for text-to-3D or image-to-3D, then poll and import
3. **Search libraries for existing models**: Sketchfab (4M+ models), Poly Haven
4. **Fall back to scripting** only when all AI tools are disabled
5. **Post-process** with `execute_blender_code` for scale, position, posing

| Generation method | Humanoid quality | Time |
|---|---|---|
| AI Generated (Hyper3D) | Smooth mesh with proportions, materials included | ~2-3 min |
| AI Generated (image-to-3D) | Closely matches reference photo | ~2-3 min |
| Library Search (Sketchfab) | Production-quality existing models | ~30s |
| Scripted (legacy) | Basic primitives, limited anatomy | ~90s |

**Materials**: Claude first checks Poly Haven availability. If enabled, it downloads PBR textures (metal, wood, fabric, etc.) and HDRIs. Falls back to Principled BSDF with manual colors.

---

## Project structure

```
3D-Magic-Caster/
├── .env.example              # Environment template
├── .gitignore
├── README.md
├── backend/
│   ├── requirements.txt      # Python deps (FastAPI, anthropic, mcp, etc.)
│   └── app/
│       ├── main.py           # FastAPI app, CORS, static file serving
│       ├── config.py         # Output folder config (mutable at runtime)
│       ├── sessions.py       # In-memory session store
│       ├── orchestrator.py   # Claude + MCP step logic, prompt engineering
│       ├── mcp_client.py     # Spawns uvx blender-mcp, calls MCP tools
│       └── routes/
│           ├── __init__.py   # Router aggregation
│           ├── sessions.py   # POST / GET sessions
│           ├── steps.py      # POST step + upload reference image
│           ├── settings.py   # GET/POST output folder
│           └── exports_list.py # GET previous exports
├── frontend/
│   ├── index.html
│   ├── vite.config.ts        # Proxy /api -> backend
│   ├── package.json
│   └── src/
│       ├── main.tsx          # Entry + ErrorBoundary
│       ├── App.tsx           # Wizard steps + panel visibility
│       ├── api.ts            # API client (fetch + auth headers)
│       ├── SettingsPanel.tsx  # API key input
│       ├── ExtrasPanel.tsx   # Output folder + previous models
│       ├── DrawingApp.tsx    # Doodle Pad (canvas drawing)
│       ├── EasterEggs.tsx    # Background SVG doodles
│       ├── ErrorBoundary.tsx # React error boundary
│       └── index.css         # Retro pixel theme
└── exports/                  # Legacy (not used; see OUTPUT_FOLDER)
```

## API reference

| Method | Path | Description |
|---|---|---|
| POST | `/api/sessions/` | Create a new wizard session |
| GET | `/api/sessions/:id` | Get session state |
| POST | `/api/steps/:id` | Run a wizard step (`{step, data}`) |
| POST | `/api/steps/:id/upload-reference` | Upload reference image (multipart) |
| GET | `/api/settings/` | Get current output folder path |
| POST | `/api/settings/output-folder` | Set output folder (`{path}`) |
| GET | `/api/previous-exports/list` | List exported models |
| GET | `/api/export/:id?format=obj` | Download exported OBJ or FBX |

### Supported reference image formats

JPEG, PNG, WebP, GIF (max size depends on Claude's vision input limits).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(none)* | Claude key; can also be set in browser |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Model for orchestration |
| `BLENDER_HOST` | `localhost` | Blender addon socket host |
| `BLENDER_PORT` | `9876` | Blender addon socket port |
| `OUTPUT_FOLDER` | `~/Downloads/3D-Magic-Caster-exports` | Where OBJ/FBX are saved |
| `MCP_COMMAND` | `uvx` | Command to start MCP server |
| `MCP_ARGS` | `blender-mcp` | Arguments for MCP command |

---

## For AI agents (Cursor, Cline, etc.)

Copy-paste this block to set up and run everything. The only manual step is connecting the Blender addon (requires the Blender GUI).

```bash
# ── 1. INSTALL ─────────────────────────────────────
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ../frontend && npm install && cd ..

# ── 2. INSTALL BLENDER ADDON ──────────────────────
curl -L "https://raw.githubusercontent.com/ahujasid/blender-mcp/main/addon.py" \
  -o /tmp/blender_mcp_addon.py
echo ">>> MANUAL: In Blender > Edit > Preferences > Add-ons > Install > select /tmp/blender_mcp_addon.py > enable it"
echo ">>> MANUAL: In Blender > 3D Viewport > N > BlenderMCP > Connect"

# ── 3. START SERVERS ───────────────────────────────
cd backend && source .venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --port 3001 --host 127.0.0.1 &
BACKEND_PID=$!
cd ../frontend && npm run dev &
FRONTEND_PID=$!
sleep 3

# ── 4. VERIFY ──────────────────────────────────────
curl -s http://127.0.0.1:3001/api/settings/ && echo ""
echo "Open http://localhost:5173"
echo "Paste your Claude API key in the Settings panel."
```

### Full API test (after Blender is connected)

```bash
API_KEY="sk-ant-api03-YOUR-KEY-HERE"

# Create session
SID=$(curl -s -X POST http://127.0.0.1:3001/api/sessions/ \
  -H "Content-Type: application/json" | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])")
echo "Session: $SID"

# 1. Look & feel
curl -s -X POST "http://127.0.0.1:3001/api/steps/$SID" \
  -H "Content-Type: application/json" -H "X-Anthropic-API-Key: $API_KEY" \
  -d '{"step":"look_and_feel","data":{"lookAndFeel":{"style":"low-poly videogame","polyLevel":"low","vibe":"dark fantasy","generationMethod":"auto"}}}'

# 2. Context
curl -s -X POST "http://127.0.0.1:3001/api/steps/$SID" \
  -H "Content-Type: application/json" -H "X-Anthropic-API-Key: $API_KEY" \
  -d '{"step":"context","data":{"context":{"subject":"character","isHuman":false,"posePosition":"standing heroically","description":"A cute duck in medieval plate armor with a tiny sword"}}}'

# 3. Skip reference image
curl -s -X POST "http://127.0.0.1:3001/api/steps/$SID" \
  -H "Content-Type: application/json" -H "X-Anthropic-API-Key: $API_KEY" \
  -d '{"step":"reference_image","data":{}}'

# 4. Generate 3 variants (~1-2 min, needs Blender connected)
curl -s -X POST "http://127.0.0.1:3001/api/steps/$SID" \
  -H "Content-Type: application/json" -H "X-Anthropic-API-Key: $API_KEY" \
  -d '{"step":"generate_variants","data":{}}'

# 5. Pick variant 0
curl -s -X POST "http://127.0.0.1:3001/api/steps/$SID" \
  -H "Content-Type: application/json" -H "X-Anthropic-API-Key: $API_KEY" \
  -d '{"step":"pick_one","data":{"selectedVariantIndex":0}}'

# 6. Apply materials (Yes)
curl -s -X POST "http://127.0.0.1:3001/api/steps/$SID" \
  -H "Content-Type: application/json" -H "X-Anthropic-API-Key: $API_KEY" \
  -d '{"step":"materials","data":{"materialsRequested":true}}'

# 7. Export OBJ
curl -s -X POST "http://127.0.0.1:3001/api/steps/$SID" \
  -H "Content-Type: application/json" -H "X-Anthropic-API-Key: $API_KEY" \
  -d '{"step":"export","data":{"format":"obj"}}'

# Download
curl -s -o model.obj "http://127.0.0.1:3001/api/export/$SID?format=obj"
ls -la model.obj
```

### Cleanup

```bash
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Port 3001 already in use` | `kill $(lsof -ti :3001)` then restart backend |
| `Port 9876 not open` | Open Blender > sidebar (N) > BlenderMCP > Connect |
| `TaskGroup` error on materials | Update to latest code (fixed: session data was too large for Claude) |
| `generate_variants` timeout | Normal — takes 1-3 min. Ensure Blender addon is connected |
| Frontend blank page | Check browser console; ensure backend is running on 3001 |
| `401 invalid x-api-key` | Check your API key for typos; re-paste in Settings |
| API key not sent | Paste key in Settings panel and click Save (stored in localStorage) |
| Reference image not used | Ensure you click "Upload reference" before clicking "Next" |
| AI Generated produces boxy models | Hyper3D is likely not configured — check Blender MCP addon preferences for the API key |
| Hyper3D generation fails | Check your API key quota at hyper3d.ai; free tier has limited daily generations |
| Sketchfab search returns no results | Verify your Sketchfab API token in Blender MCP addon preferences |
| Poly Haven textures not applied | Poly Haven should be enabled by default; check addon preferences if disabled |

## License

MIT
