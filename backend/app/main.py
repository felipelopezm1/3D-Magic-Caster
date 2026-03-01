"""3D Magic Caster API - FastAPI app."""
import os
from pathlib import Path

# Load .env from repo root if present (ANTHROPIC_API_KEY, BLENDER_HOST, etc.)
try:
    from dotenv import load_dotenv
    _root = Path(__file__).resolve().parent.parent.parent
    load_dotenv(_root / ".env")
except ImportError:
    pass

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routes import api_router
from app.config import get_exports_dir, REPO_ROOT

app = FastAPI(title="3D Magic Caster API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router, prefix="/api")

FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"

@app.get("/api/export/{session_id}")
async def download_export(session_id: str, format: str = "obj"):
    if format not in ("obj", "fbx"):
        raise HTTPException(status_code=400, detail="Format must be obj or fbx")
    from app.sessions import get_session
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    ext = "obj" if format == "obj" else "fbx"
    path = get_exports_dir() / session_id / f"model.{ext}"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Export file not ready. Run export step first.")
    return FileResponse(path, filename=f"model.{ext}", media_type="application/octet-stream")


# Ensure default exports dir exists
get_exports_dir().mkdir(parents=True, exist_ok=True)


# Serve frontend in production
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
