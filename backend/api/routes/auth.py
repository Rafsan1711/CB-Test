from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.middleware.firebase_auth import verify_firebase_token, get_current_user
from services.supabase_service import db

router = APIRouter()

class LoginRequest(BaseModel):
    firebase_token: str
    github_access_token: Optional[str] = None

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

@router.post("/logout")
async def logout():
    return {"message": "logged out"}
