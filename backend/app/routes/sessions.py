from fastapi import APIRouter, HTTPException

from app.sessions import create_session, get_session

router = APIRouter()


@router.post("/")
def create():
    session = create_session()
    return {"sessionId": session["id"], "currentStep": session["currentStep"]}


@router.get("/{session_id}")
def get(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
