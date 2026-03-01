"""Shared config: exports/output folder (default: user Downloads)."""
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

_DEFAULT_EXPORTS = (Path.home() / "Downloads" / "3D-Magic-Caster-exports").resolve()

_custom_exports_dir: Path | None = None


def get_exports_dir() -> Path:
    if _custom_exports_dir is not None:
        return _custom_exports_dir
    raw = os.environ.get("OUTPUT_FOLDER", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return _DEFAULT_EXPORTS


def set_exports_dir(path_str: str) -> Path:
    """Set a custom exports directory. Returns the resolved path."""
    global _custom_exports_dir
    p = Path(path_str).expanduser().resolve()
    p.mkdir(parents=True, exist_ok=True)
    _custom_exports_dir = p
    return p


EXPORTS_DIR = get_exports_dir()
