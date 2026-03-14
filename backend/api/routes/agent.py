from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from api.middleware.firebase_auth import get_current_user
from services.supabase_service import db
from services.agent_orchestrator import orchestrator
from models.schemas import AgentTaskResponse

from services.gemini_service import gemini_svc

router = APIRouter()

@router.get("/test-ai")
async def test_ai_connection(current_user: dict = Depends(get_current_user)):
    """Test connections to both Gemini and DeepSeek."""
    results = await gemini_svc.test_ai_connection()
    return results

@router.get("/tasks", response_model=List[AgentTaskResponse])
async def list_tasks(repo_id: Optional[str] = Query(None), status: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
    tasks = await db.get_pending_tasks(repo_id)
    return tasks

@router.get("/tasks/{task_id}", response_model=AgentTaskResponse)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.get_agent_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/tasks/{task_id}/retry")
async def retry_task(task_id: str, current_user: dict = Depends(get_current_user)):
    try:
        await orchestrator.retry_task(task_id)
        return {"message": "Task queued for retry"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str, current_user: dict = Depends(get_current_user)):
    await db.update_agent_task(task_id, "cancelled")
    return {"message": "Task cancelled"}
