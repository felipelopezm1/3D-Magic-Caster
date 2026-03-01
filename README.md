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
- **3 poly levels**: low (stylized game-ready), high (production-quality with subdivision surfaces), mixed (detail where it matters)
- **Humanoid-aware prompts**: anatomical guidelines for human/creature characters with pose control
- **Reference image support**: upload JPEG/PNG/WebP/GIF — Claude sees it as visual guidance for shape and style
- **Materials & shaders**: Claude applies Principled BSDF materials with theme-aware colors (e.g. dark steel armor, warm skin tones, glowing magic)
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
3. **Step 1 — Look & feel**: Choose style (e.g. "low-poly videogame"), poly level, and vibe (e.g. "dark fantasy")
4. **Step 2 — Context**: Pick subject type, toggle human/creature, set pose, write a description
5. **Step 3 — Reference image** *(optional)*: Upload a JPEG/PNG/WebP/GIF — Claude will use it as visual guidance
6. **Step 4 — Generate**: Claude creates 3 variants in Blender via MCP (~1-2 min)
7. **Step 5 — Pick one**: Click the variant you like best
8. **Step 6 — Materials**: Click **Yes** to apply Principled BSDF materials, or **No** to skip
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

The orchestrator (`orchestrator.py`) builds **poly-level-aware and subject-aware system prompts**:

- **Low poly**: faceted aesthetic, simple geometric building blocks
- **High poly**: subdivision surfaces (level 2-3), edge loops, detailed anatomy, quad-dominant mesh
- **Mixed**: high detail on focal areas (face, hands), medium elsewhere
- **Humanoid characters**: anatomical section-by-section construction, proper proportions, joint placement, pose instructions
- **Materials step**: Principled BSDF with theme-matched colors, metallic/roughness values, optional Poly Haven textures

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
  -d '{"step":"look_and_feel","data":{"lookAndFeel":{"style":"low-poly videogame","polyLevel":"low","vibe":"dark fantasy"}}}'

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
| `generate_variants` timeout | Normal — takes 1-2 min. Ensure Blender addon is connected |
| Frontend blank page | Check browser console; ensure backend is running on 3001 |
| `401 invalid x-api-key` | Check your API key for typos; re-paste in Settings |
| API key not sent | Paste key in Settings panel and click Save (stored in localStorage) |
| Reference image not used | Ensure you click "Upload reference" before clicking "Next" |

## License

MIT
