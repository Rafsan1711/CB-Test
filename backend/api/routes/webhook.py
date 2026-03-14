# This file handles all incoming GitHub webhooks
# ContriBot registers webhooks when a repo is activated
# GitHub sends events here: push, issues, pull_request, issue_comment

import hmac, hashlib, logging
from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks
from services.supabase_service import db
from services.agent_orchestrator import orchestrator

logger = logging.getLogger(__name__)

router = APIRouter()

async def verify_signature(payload: bytes, sig_header: str, secret: str) -> bool:
    if not sig_header or not sig_header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", sig_header)

@router.post("/github/{repo_id}")
@router.post("/github/{repo_id}/")
async def github_webhook(
    repo_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(None),
    x_hub_signature_256: str = Header(None),
):
    try:
        logger.info(f"Received webhook for repo {repo_id}. Event: {x_github_event}")
        payload_bytes = await request.body()
        
        # Get repo and verify webhook secret
        repo = await db.get_repo_by_id(repo_id)
        if not repo:
            logger.error(f"Webhook received for unknown repo: {repo_id}")
            raise HTTPException(404, "Repo not found")
        
        webhook_secret = repo.get("webhook_secret", "")
        if webhook_secret:
            if not await verify_signature(payload_bytes, x_hub_signature_256, webhook_secret):
                logger.error(f"Invalid webhook signature for repo {repo_id}")
                raise HTTPException(403, "Invalid webhook signature")
        
        try:
            payload = await request.json()
        except Exception as e:
            logger.error(f"Failed to parse webhook JSON: {e}")
            raise HTTPException(400, "Invalid JSON")

        action = payload.get("action", "")
        logger.info(f"Webhook event: {x_github_event}, Action: {action}")
        
        # Log webhook arrival
        await db.log_activity(
            repo_id, 
            "webhook_received", 
            f"Received {x_github_event} event from GitHub",
            metadata={"event": x_github_event, "action": action}
        )
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
        
        elif x_github_event == "pull_request" and action == "opened":
            pr_number = payload["pull_request"]["number"]
            background_tasks.add_task(orchestrator.handle_new_pr, repo_id, pr_number)
            
        elif x_github_event == "pull_request" and action == "closed":
            if payload["pull_request"].get("merged"):
                pr_number = payload["pull_request"]["number"]
                background_tasks.add_task(orchestrator.handle_pr_merged, repo_id, pr_number)
                
        elif x_github_event == "check_run" and action == "completed":
            if payload["check_run"]["conclusion"] == "failure":
                # Find the PR associated with this check run
                pull_requests = payload["check_run"].get("pull_requests", [])
                for pr in pull_requests:
                    pr_number = pr["number"]
                    background_tasks.add_task(orchestrator.handle_ci_failure, repo_id, pr_number, payload["check_run"]["id"])
                    
        return {"status": "received", "event": x_github_event, "action": action}
    except Exception as e:
        logger.exception(f"Unhandled exception in webhook handler for repo {repo_id}: {e}")
        raise HTTPException(500, f"Internal server error: {str(e)}")
