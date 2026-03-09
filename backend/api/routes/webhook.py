from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks
import hmac
import hashlib
import json
from services.supabase_service import db
from config import settings

router = APIRouter()

async def process_webhook_event(event_type: str, payload: dict):
    action = payload.get("action")
    repo_data = payload.get("repository", {})
    github_repo_url = repo_data.get("html_url")
    
    if event_type == "issues" and action == "opened":
        issue_data = payload.get("issue", {})
        pass
    elif event_type == "pull_request" and action == "closed":
        pr_data = payload.get("pull_request", {})
        if pr_data.get("merged"):
            pass
    elif event_type == "issue_comment" and action == "created":
        comment = payload.get("comment", {}).get("body", "").strip().lower()
        if comment in ["yes", "no"]:
            pass

@router.post("/github")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str = Header(None),
    x_github_event: str = Header(None)
):
    if not x_hub_signature_256:
        raise HTTPException(status_code=401, detail="Missing signature")
        
    payload_body = await request.body()
    
    secret = settings.CONTRIBOT_GITHUB_TOKEN.encode()
    if secret:
        expected_signature = "sha256=" + hmac.new(secret, payload_body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_signature, x_hub_signature_256):
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = json.loads(payload_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    background_tasks.add_task(process_webhook_event, x_github_event, payload)
    
    return {"status": "accepted"}
