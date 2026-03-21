from fastapi import APIRouter, Depends, HTTPException
import logging
from typing import List
from api.middleware.firebase_auth import get_current_user
from services.supabase_service import db
from services.agent_orchestrator import orchestrator
from models.schemas import PRResponse

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{repo_id}/prs", response_model=List[PRResponse])
async def list_prs(repo_id: str, current_user: dict = Depends(get_current_user)):
    logger.debug(f"[PRS_ROUTE] Listing PRs for repo_id: {repo_id}")
    prs = await db.get_prs_by_repo(repo_id)
    return prs

@router.get("/{repo_id}/prs/{pr_id}", response_model=PRResponse)
async def get_pr(repo_id: str, pr_id: str, current_user: dict = Depends(get_current_user)):
    logger.debug(f"[PRS_ROUTE] Getting PR details for repo_id: {repo_id}, pr_id: {pr_id}")
    prs = await db.get_prs_by_repo(repo_id)
    pr = next((p for p in prs if p["id"] == pr_id), None)
    if not pr:
        logger.warning(f"[PRS_ROUTE] PR {pr_id} not found in repo {repo_id}")
        raise HTTPException(status_code=404, detail="PR not found")
    return pr

@router.post("/{repo_id}/prs/{pr_id}/verify")
async def verify_pr(repo_id: str, pr_id: str, current_user: dict = Depends(get_current_user)):
    logger.info(f"[PRS_ROUTE] User {current_user.get('uid')} requesting verification for PR {pr_id} in repo {repo_id}")
    await orchestrator.enqueue_task(repo_id, "verify_pr", {"pr_id": pr_id})
    await db.log_activity(repo_id, "pr_verification_started", f"Verification started for PR {pr_id}")
    return {"message": "Verification task created"}

@router.get("/{repo_id}/prs/{pr_id}/verification")
async def get_pr_verification(repo_id: str, pr_id: str, current_user: dict = Depends(get_current_user)):
    logger.debug(f"[PRS_ROUTE] Getting verification results for PR {pr_id} in repo {repo_id}")
    prs = await db.get_prs_by_repo(repo_id)
    pr = next((p for p in prs if p["id"] == pr_id), None)
    if not pr:
        logger.warning(f"[PRS_ROUTE] PR {pr_id} not found for verification results in repo {repo_id}")
        raise HTTPException(status_code=404, detail="PR not found")
    return pr.get("verification_results", {})
