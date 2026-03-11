from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from api.middleware.firebase_auth import get_current_user
from services.supabase_service import db
from services.agent_orchestrator import orchestrator
from models.schemas import IssueCreate, IssueResponse

router = APIRouter()

class IssueResponseAction(BaseModel):
    response: str

@router.get("/{repo_id}/issues", response_model=List[IssueResponse])
async def list_issues(repo_id: str, status: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
    issues = await db.get_issues_by_repo(repo_id, status)
    return issues

@router.post("/{repo_id}/issues", response_model=IssueResponse)
async def create_issue(repo_id: str, issue: IssueCreate, current_user: dict = Depends(get_current_user)):
    new_issue = await db.create_issue(repo_id, issue.model_dump())
    return new_issue

@router.get("/{repo_id}/issues/{issue_id}", response_model=IssueResponse)
async def get_issue(repo_id: str, issue_id: str, current_user: dict = Depends(get_current_user)):
    issues = await db.get_issues_by_repo(repo_id)
    issue = next((i for i in issues if i["id"] == issue_id), None)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue

@router.put("/{repo_id}/issues/{issue_id}/respond")
async def respond_to_issue(repo_id: str, issue_id: str, action: IssueResponseAction, current_user: dict = Depends(get_current_user)):
    response = action.response.lower()
    if response in ["yes", "no"]:
        await orchestrator.handle_user_response(repo_id, issue_id, response)
        return {"message": f"Response '{response}' processed"}
    else:
        raise HTTPException(status_code=400, detail="Response must be 'yes' or 'no'")
