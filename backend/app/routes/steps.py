import re
from pathlib import Path

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.orchestrator import run_step
from app.sessions import get_session, update_session

router = APIRouter()

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = REPO_ROOT / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE = re.compile(r"image/(jpeg|png|webp|gif)", re.I)


@router.post("/{session_id}")
async def run_step_endpoint(
    session_id: str,
    body: dict,
    x_anthropic_api_key: str | None = Header(None, alias="X-Anthropic-API-Key"),
):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    step = body.get("step")
    if not step:
        raise HTTPException(status_code=400, detail="Missing step")
    data = body.get("data") or {}
    try:
        result = await run_step(session_id, step, data, session, api_key=x_anthropic_api_key)
        return JSONResponse(content=result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e), "detail": traceback.format_exc()})


@router.post("/{session_id}/upload-reference")
async def upload_reference(session_id: str, image: UploadFile = File(...)):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not image.content_type or not ALLOWED_IMAGE.match(image.content_type):
        raise HTTPException(status_code=400, detail="Only images (jpeg, png, webp, gif) allowed")
    session_uploads = UPLOADS_DIR / session_id
    session_uploads.mkdir(parents=True, exist_ok=True)
    ext = Path(image.filename or "").suffix or ".png"
    dest = session_uploads / f"reference{ext}"
    content = await image.read()
    dest.write_bytes(content)
    update_session(session_id, {"referenceImagePath": str(dest)})
    return {"ok": True, "path": str(dest)}
