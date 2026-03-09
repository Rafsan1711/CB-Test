from fastapi import APIRouter, Depends, HTTPException
from typing import List
from api.middleware.firebase_auth import get_current_user
from services.supabase_service import db
from models.schemas import RepoCreate, RepoResponse, RepoUpdate

router = APIRouter()

async def get_user_id(current_user: dict) -> str:
    user = await db.get_user_by_firebase_uid(current_user["uid"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user["id"]

@router.get("/", response_model=List[RepoResponse])
async def list_repos(current_user: dict = Depends(get_current_user)):
    user_id = await get_user_id(current_user)
    repos = await db.get_repos_by_user(user_id)
    return repos

@router.post("/", response_model=RepoResponse)
async def create_repo(repo: RepoCreate, current_user: dict = Depends(get_current_user)):
    user_id = await get_user_id(current_user)
    new_repo = await db.create_repo(user_id, repo.github_full_name, repo.github_repo_url)
    return new_repo

@router.get("/{repo_id}", response_model=RepoResponse)
async def get_repo(repo_id: str, current_user: dict = Depends(get_current_user)):
    repo = await db.get_repo_by_id(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    return repo

@router.put("/{repo_id}", response_model=RepoResponse)
async def update_repo(repo_id: str, repo_update: RepoUpdate, current_user: dict = Depends(get_current_user)):
    update_data = repo_update.model_dump(exclude_unset=True)
    repo = await db.update_repo(repo_id, update_data)
    return repo

@router.delete("/{repo_id}")
async def delete_repo(repo_id: str, current_user: dict = Depends(get_current_user)):
    await db.update_repo(repo_id, {"contribot_active": False})
    return {"message": "Repo removed from management"}

@router.post("/{repo_id}/activate")
async def activate_repo(repo_id: str, current_user: dict = Depends(get_current_user)):
    repo = await db.update_repo(repo_id, {"contribot_active": True})
    await db.log_activity(repo_id, "repo_activated", "ContriBot activated for repo")
    return repo

@router.post("/{repo_id}/deactivate")
async def deactivate_repo(repo_id: str, current_user: dict = Depends(get_current_user)):
    repo = await db.update_repo(repo_id, {"contribot_active": False})
    await db.log_activity(repo_id, "repo_deactivated", "ContriBot deactivated for repo")
    return repo

@router.get("/{repo_id}/activity")
async def get_repo_activity(repo_id: str, current_user: dict = Depends(get_current_user)):
    activities = await db.get_activity_log(repo_id)
    return activities
