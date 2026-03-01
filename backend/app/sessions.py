"""In-memory session store."""
import time
import uuid
from typing import Optional

from .models import SessionData


_store: dict[str, SessionData] = {}


def create_session() -> SessionData:
    sid = str(uuid.uuid4())
    session: SessionData = {
        "id": sid,
        "createdAt": int(time.time()),
        "currentStep": "look_and_feel",
    }
    _store[sid] = session
    return session


def get_session(session_id: str) -> Optional[SessionData]:
    return _store.get(session_id)


def update_session(session_id: str, updates: dict) -> Optional[SessionData]:
    session = _store.get(session_id)
    if not session:
        return None
    session.update(updates)
    return session
