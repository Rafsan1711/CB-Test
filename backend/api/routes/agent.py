from fastapi import APIRouter, Depends, HTTPException, Query
import logging
from typing import List, Optional
from api.middleware.firebase_auth import get_current_user
from services.supabase_service import db
from services.agent_orchestrator import orchestrator
from models.schemas import AgentTaskResponse

from services.gemini_service import gemini_svc

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/test-ai")
async def test_ai_connection(current_user: dict = Depends(get_current_user)):
    """Test connections to both Gemini and DeepSeek."""
    logger.info(f"[AGENT_ROUTE] User {current_user.get('uid')} testing AI connection")
    results = await gemini_svc.test_ai_connection()
    return results

@router.get("/tasks", response_model=List[AgentTaskResponse])
async def list_tasks(repo_id: Optional[str] = Query(None), status: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
    logger.debug(f"[AGENT_ROUTE] Listing tasks for repo_id: {repo_id}, status: {status}")
    tasks = await db.get_pending_tasks(repo_id)
    return tasks

@router.get("/tasks/{task_id}", response_model=AgentTaskResponse)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    logger.debug(f"[AGENT_ROUTE] Getting task details for task_id: {task_id}")
    task = await db.get_agent_task_by_id(task_id)
    if not task:
        logger.warning(f"[AGENT_ROUTE] Task {task_id} not found")
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/tasks/{task_id}/retry")
async def retry_task(task_id: str, current_user: dict = Depends(get_current_user)):
    logger.info(f"[AGENT_ROUTE] User {current_user.get('uid')} retrying task {task_id}")
    try:
        await orchestrator.retry_task(task_id)
        return {"message": "Task queued for retry"}
    except ValueError as e:
        logger.error(f"[AGENT_ROUTE] Failed to retry task {task_id}: {e}")
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str, current_user: dict = Depends(get_current_user)):
    logger.info(f"[AGENT_ROUTE] User {current_user.get('uid')} cancelling task {task_id}")
    await db.update_agent_task(task_id, "cancelled")
    return {"message": "Task cancelled"}
