from fastapi import APIRouter

from app.config import get_exports_dir

router = APIRouter()


@router.get("/list")
def list_exports():
    """List previous models (sessions that have exported files)."""
    exports_dir = get_exports_dir()
    if not exports_dir.exists():
        return {"exports": []}
    result = []
    for session_dir in sorted(exports_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not session_dir.is_dir():
            continue
        session_id = session_dir.name
        has_obj = (session_dir / "model.obj").exists()
        has_fbx = (session_dir / "model.fbx").exists()
        if has_obj or has_fbx:
            mtime = int(session_dir.stat().st_mtime)
            result.append({
                "sessionId": session_id,
                "hasObj": has_obj,
                "hasFbx": has_fbx,
                "createdAt": mtime,
            })
    return {"exports": result}
