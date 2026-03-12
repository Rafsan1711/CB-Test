from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from api.middleware.firebase_auth import verify_firebase_token, get_current_user
from services.supabase_service import db

router = APIRouter()

class LoginRequest(BaseModel):
    firebase_token: str
    github_access_token: Optional[str] = None

class SettingsUpdate(BaseModel):
    display_name: Optional[str] = None
    github_settings: Optional[Dict[str, Any]] = None
    ai_settings: Optional[Dict[str, Any]] = None
    notification_settings: Optional[Dict[str, Any]] = None
    repo_defaults: Optional[Dict[str, Any]] = None

@router.post("/login")
async def login(request: LoginRequest):
    user_data = await verify_firebase_token(request.firebase_token)
    
    user = await db.get_or_create_user(
        firebase_uid=user_data["uid"],
        email=user_data.get("email", "")
    )
    
    if request.github_access_token:
        user = await db.update_user_github_token(user["id"], request.github_access_token)
        
    return user

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.get_user_by_firebase_uid(current_user["uid"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/settings")
async def update_settings(settings: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    user = await db.get_user_by_firebase_uid(current_user["uid"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Merge existing settings with new settings
    current_settings = user.get("settings") or {}
    
    new_settings = {
        "display_name": settings.display_name if settings.display_name is not None else current_settings.get("display_name"),
        "github_settings": settings.github_settings if settings.github_settings is not None else current_settings.get("github_settings"),
        "ai_settings": settings.ai_settings if settings.ai_settings is not None else current_settings.get("ai_settings"),
        "notification_settings": settings.notification_settings if settings.notification_settings is not None else current_settings.get("notification_settings"),
        "repo_defaults": settings.repo_defaults if settings.repo_defaults is not None else current_settings.get("repo_defaults"),
    }
    
    # Update user in Supabase
    try:
        res = db.client.table("users").update({
            "settings": new_settings,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", user["id"]).execute()
    except Exception as e:
        if "updated_at" in str(e):
            res = db.client.table("users").update({
                "settings": new_settings
            }).eq("id", user["id"]).execute()
        else:
            raise e
    return res.data[0] if res.data else {}

@router.post("/logout")
async def logout():
    return {"message": "logged out"}
