from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from api.middleware.firebase_auth import get_current_user
from services.supabase_service import db
from models.schemas import AgentTaskResponse

router = APIRouter()

@router.get("/tasks", response_model=List[AgentTaskResponse])
async def list_tasks(repo_id: Optional[str] = Query(None), status: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
    tasks = await db.get_pending_tasks(repo_id)
    return tasks

@router.get("/tasks/{task_id}", response_model=AgentTaskResponse)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented")

@router.post("/tasks/{task_id}/retry")
async def retry_task(task_id: str, current_user: dict = Depends(get_current_user)):
    await db.update_agent_task(task_id, "pending", error=None)
    return {"message": "Task queued for retry"}

@router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str, current_user: dict = Depends(get_current_user)):
    await db.update_agent_task(task_id, "cancelled")
    return {"message": "Task cancelled"}
