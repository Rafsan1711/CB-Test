# This file handles all incoming GitHub webhooks
# ContriBot registers webhooks when a repo is activated
# GitHub sends events here: push, issues, pull_request, issue_comment

import hmac, hashlib
from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks
from services.supabase_service import db
from services.agent_orchestrator import orchestrator

router = APIRouter(prefix="/webhook", tags=["webhook"])

async def verify_signature(payload: bytes, sig_header: str, secret: str) -> bool:
    if not sig_header or not sig_header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", sig_header)

@router.post("/github/{repo_id}")
async def github_webhook(
    repo_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(None),
    x_hub_signature_256: str = Header(None),
):
    payload_bytes = await request.body()
    
    # Get repo and verify webhook secret
    repo = await db.get_repo_by_id(repo_id)
    if not repo:
        raise HTTPException(404, "Repo not found")
    
    webhook_secret = repo.get("webhook_secret", "")
    if webhook_secret:
        if not await verify_signature(payload_bytes, x_hub_signature_256, webhook_secret):
            raise HTTPException(403, "Invalid webhook signature")
    
    payload = await request.json()
    action = payload.get("action", "")
    
    # Route events to background tasks
    if x_github_event == "issues" and action == "opened":
        issue_number = payload["issue"]["number"]
        background_tasks.add_task(orchestrator.process_new_issue, repo_id, issue_number)
    
    elif x_github_event == "issue_comment" and action == "created":
        comment_body = payload["comment"]["body"].strip().lower()
        issue_number = payload["issue"]["number"]
        if comment_body in ["yes", "no"]:
            # Find issue in DB by github_issue_number
            issues = await db.get_issues_by_repo(repo_id, status="pending_approval")
            matching = [i for i in issues if i["github_issue_number"] == issue_number]
            if matching:
                issue_id = matching[0]["id"]
                background_tasks.add_task(
                    orchestrator.handle_user_response, repo_id, issue_id, comment_body
                )
    
    elif x_github_event == "pull_request" and action == "closed":
        if payload["pull_request"].get("merged"):
            pr_number = payload["pull_request"]["number"]
            background_tasks.add_task(orchestrator.handle_pr_merged, repo_id, pr_number)
    
    return {"status": "received", "event": x_github_event, "action": action}
