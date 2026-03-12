from fastapi import APIRouter, Depends, HTTPException
from typing import List
from api.middleware.firebase_auth import get_current_user
from services.supabase_service import db
from services.agent_orchestrator import orchestrator
from models.schemas import ReleaseResponse

router = APIRouter()

@router.get("/{repo_id}/releases", response_model=List[ReleaseResponse])
async def list_releases(repo_id: str, current_user: dict = Depends(get_current_user)):
    releases = await db.get_releases_by_repo(repo_id)
    return releases

@router.post("/{repo_id}/releases/trigger")
async def trigger_release(repo_id: str, current_user: dict = Depends(get_current_user)):
    await orchestrator.enqueue_task(repo_id, "release", {})
    await db.log_activity(repo_id, "release_triggered", "Manual release triggered")
    return {"message": "Release task created"}

@router.get("/{repo_id}/releases/latest", response_model=ReleaseResponse)
async def get_latest_release(repo_id: str, current_user: dict = Depends(get_current_user)):
    releases = await db.get_releases_by_repo(repo_id)
    if not releases:
        raise HTTPException(status_code=404, detail="No releases found")
    releases.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return releases[0]
