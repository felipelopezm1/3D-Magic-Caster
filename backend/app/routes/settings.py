from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_exports_dir, set_exports_dir

router = APIRouter()


@router.get("/")
def get_settings():
    """Return current settings (exports path)."""
    return {"exportsPath": str(get_exports_dir())}


class SetOutputFolder(BaseModel):
    path: str


@router.post("/output-folder")
def update_output_folder(body: SetOutputFolder):
    """Set a custom output folder. Must be a valid writable directory path."""
    raw = body.path.strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Path cannot be empty")
    try:
        resolved = set_exports_dir(raw)
        return {"exportsPath": str(resolved)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid path: {e}")
