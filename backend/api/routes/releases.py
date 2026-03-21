from fastapi import APIRouter, Depends, HTTPException
import logging
from typing import List
from api.middleware.firebase_auth import get_current_user
from services.supabase_service import db
from services.agent_orchestrator import orchestrator
from models.schemas import ReleaseResponse

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{repo_id}/releases", response_model=List[ReleaseResponse])
async def list_releases(repo_id: str, current_user: dict = Depends(get_current_user)):
    logger.debug(f"[RELEASES_ROUTE] Listing releases for repo_id: {repo_id}")
    releases = await db.get_releases_by_repo(repo_id)
    return releases

@router.post("/{repo_id}/releases/trigger")
async def trigger_release(repo_id: str, current_user: dict = Depends(get_current_user)):
    logger.info(f"[RELEASES_ROUTE] User {current_user.get('uid')} triggering manual release for repo {repo_id}")
    await orchestrator.enqueue_task(repo_id, "release", {})
    await db.log_activity(repo_id, "release_triggered", "Manual release triggered")
    return {"message": "Release task created"}

@router.get("/{repo_id}/releases/latest", response_model=ReleaseResponse)
async def get_latest_release(repo_id: str, current_user: dict = Depends(get_current_user)):
    logger.debug(f"[RELEASES_ROUTE] Getting latest release for repo_id: {repo_id}")
    releases = await db.get_releases_by_repo(repo_id)
    if not releases:
        logger.warning(f"[RELEASES_ROUTE] No releases found for repo {repo_id}")
        raise HTTPException(status_code=404, detail="No releases found")
    releases.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return releases[0]
