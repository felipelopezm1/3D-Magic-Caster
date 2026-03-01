from fastapi import APIRouter
from app.routes.sessions import router as sessions_router
from app.routes.steps import router as steps_router
from app.routes.settings import router as settings_router
from app.routes.exports_list import router as exports_list_router

api_router = APIRouter()
api_router.include_router(sessions_router, prefix="/sessions", tags=["sessions"])
api_router.include_router(steps_router, prefix="/steps", tags=["steps"])
api_router.include_router(settings_router, prefix="/settings", tags=["settings"])
api_router.include_router(exports_list_router, prefix="/previous-exports", tags=["exports"])
