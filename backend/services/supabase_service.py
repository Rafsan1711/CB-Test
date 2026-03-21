from supabase import create_client, Client
from config import settings
from typing import Optional, List, Dict, Any
from datetime import datetime
import secrets
import logging

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        logger.info("[DB] Initialized SupabaseService")

    # --- Users ---
    async def get_or_create_user(self, firebase_uid: str, email: str, github_username: Optional[str] = None, avatar_url: Optional[str] = None) -> dict:
        logger.debug(f"[DB] get_or_create_user for {email}")
        user = await self.get_user_by_firebase_uid(firebase_uid)
        if user:
            return user
        
        data = {
            "firebase_uid": firebase_uid,
            "email": email,
            "github_username": github_username,
            "avatar_url": avatar_url
        }
        try:
            res = self.client.table("users").insert(data).execute()
            logger.info(f"[DB] Created new user: {email}")
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.error(f"[DB] Failed to create user {email}: {e}")
            raise

    async def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[dict]:
        logger.debug(f"[DB] get_user_by_firebase_uid: {firebase_uid}")
        try:
            res = self.client.table("users").select("*").eq("firebase_uid", firebase_uid).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"[DB] Failed to get user by firebase_uid {firebase_uid}: {e}")
            return None

    async def update_user_github_token(self, user_id: str, token: str) -> dict:
        logger.info(f"[DB] Updating GitHub token for user {user_id}")
        data = {
            "github_access_token": token
        }
        try:
            # Try with updated_at first
            update_data = {**data, "updated_at": datetime.utcnow().isoformat()}
            res = self.client.table("users").update(update_data).eq("id", user_id).execute()
        except Exception as e:
            if "updated_at" in str(e):
                res = self.client.table("users").update(data).eq("id", user_id).execute()
            else:
                logger.error(f"[DB] Failed to update GitHub token for user {user_id}: {e}")
                raise e
        return res.data[0] if res.data else {}

    # --- Repos ---
    async def create_repo(self, user_id: str, github_full_name: str, github_repo_url: str) -> dict:
        logger.info(f"[DB] Creating repo record for {github_full_name}")
        data = {
            "user_id": user_id,
            "github_full_name": github_full_name,
            "github_repo_url": github_repo_url,
            "contribot_active": False,
            "current_version": "v0.0.0",
            "webhook_secret": secrets.token_hex(16),
            "settings": {}
        }
        try:
            res = self.client.table("repos").insert(data).execute()
            logger.info(f"[DB] Repo record created for {github_full_name}")
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.error(f"[DB] Failed to create repo record for {github_full_name}: {e}")
            raise

    async def get_repos_by_user(self, user_id: str) -> List[dict]:
        logger.debug(f"[DB] get_repos_by_user: {user_id}")
        try:
            res = self.client.table("repos").select("*").eq("user_id", user_id).execute()
            return res.data
        except Exception as e:
            logger.error(f"[DB] Failed to get repos for user {user_id}: {e}")
            return []

    async def get_repo_by_id(self, repo_id: str) -> Optional[dict]:
        logger.debug(f"[DB] get_repo_by_id: {repo_id}")
        try:
            res = self.client.table("repos").select("*").eq("id", repo_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"[DB] Failed to get repo by id {repo_id}: {e}")
            return None

    async def update_repo(self, repo_id: str, data: dict) -> dict:
        logger.info(f"[DB] Updating repo {repo_id}")
        try:
            # Try with updated_at first
            update_data = {**data, "updated_at": datetime.utcnow().isoformat()}
            res = self.client.table("repos").update(update_data).eq("id", repo_id).execute()
        except Exception as e:
            if "updated_at" in str(e):
                res = self.client.table("repos").update(data).eq("id", repo_id).execute()
            else:
                logger.error(f"[DB] Failed to update repo {repo_id}: {e}")
                raise e
        return res.data[0] if res.data else {}

    async def delete_repo(self, repo_id: str) -> bool:
        logger.info(f"[DB] Deleting repo {repo_id} and all related records")
        try:
            # Delete related records first to avoid foreign key constraints
            self.client.table("activity_log").delete().eq("repo_id", repo_id).execute()
            self.client.table("agent_tasks").delete().eq("repo_id", repo_id).execute()
            self.client.table("pull_requests").delete().eq("repo_id", repo_id).execute()
            self.client.table("issues").delete().eq("repo_id", repo_id).execute()
            
            # Finally delete the repo
            res = self.client.table("repos").delete().eq("id", repo_id).execute()
            logger.info(f"[DB] Repo {repo_id} deleted successfully")
            return True
        except Exception as e:
            logger.error(f"[DB] Failed to delete repo {repo_id}: {e}")
            raise

    # --- Issues ---
    async def create_issue(self, repo_id: str, data: dict) -> dict:
        logger.info(f"[DB] Creating issue record for repo {repo_id}")
        data["repo_id"] = repo_id
        try:
            res = self.client.table("issues").insert(data).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.error(f"[DB] Failed to create issue record for repo {repo_id}: {e}")
            raise

    async def get_issues_by_repo(self, repo_id: str, status: Optional[str] = None) -> List[dict]:
        logger.debug(f"[DB] get_issues_by_repo: {repo_id} (status: {status})")
        try:
            query = self.client.table("issues").select("*").eq("repo_id", repo_id)
            if status:
                query = query.eq("status", status)
            res = query.execute()
            return res.data
        except Exception as e:
            logger.error(f"[DB] Failed to get issues for repo {repo_id}: {e}")
            return []

    async def update_issue(self, issue_id: str, data: dict) -> dict:
        logger.info(f"[DB] Updating issue record {issue_id}")
        try:
            update_data = {**data, "updated_at": datetime.utcnow().isoformat()}
            res = self.client.table("issues").update(update_data).eq("id", issue_id).execute()
        except Exception as e:
            if "updated_at" in str(e):
                res = self.client.table("issues").update(data).eq("id", issue_id).execute()
            else:
                logger.error(f"[DB] Failed to update issue record {issue_id}: {e}")
                raise e
        return res.data[0] if res.data else {}

    # --- Pull Requests ---
    async def create_pr(self, repo_id: str, data: dict) -> dict:
        logger.info(f"[DB] Creating PR record for repo {repo_id}")
        data["repo_id"] = repo_id
        try:
            res = self.client.table("pull_requests").insert(data).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.error(f"[DB] Failed to create PR record for repo {repo_id}: {e}")
            raise

    async def get_prs_by_repo(self, repo_id: str) -> List[dict]:
        logger.debug(f"[DB] get_prs_by_repo: {repo_id}")
        try:
            res = self.client.table("pull_requests").select("*").eq("repo_id", repo_id).execute()
            return res.data
        except Exception as e:
            logger.error(f"[DB] Failed to get PRs for repo {repo_id}: {e}")
            return []

    async def update_pr(self, pr_id: str, data: dict) -> dict:
        logger.info(f"[DB] Updating PR record {pr_id}")
        try:
            update_data = {**data, "updated_at": datetime.utcnow().isoformat()}
            res = self.client.table("pull_requests").update(update_data).eq("id", pr_id).execute()
        except Exception as e:
            if "updated_at" in str(e):
                res = self.client.table("pull_requests").update(data).eq("id", pr_id).execute()
            else:
                logger.error(f"[DB] Failed to update PR record {pr_id}: {e}")
                raise e
        return res.data[0] if res.data else {}

    # --- Agent Tasks ---
    async def create_agent_task(self, repo_id: str, task_type: str, input_data: dict) -> dict:
        logger.info(f"[DB] Creating agent task record: {task_type} for repo {repo_id}")
        data = {
            "repo_id": repo_id,
            "task_type": task_type,
            "input_data": input_data,
            "status": "queued"
        }
        try:
            res = self.client.table("agent_tasks").insert(data).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.error(f"[DB] Failed to create agent task record: {e}")
            raise

    async def update_agent_task(self, task_id: str, status: str, output_data: Optional[dict] = None, error_message: Optional[str] = None, model_used: Optional[str] = None, retry_count: Optional[int] = None) -> dict:
        logger.info(f"[DB] Updating agent task {task_id} to status {status}")
        data = {"status": status}
        if output_data is not None:
            data["output_data"] = output_data
        if error_message is not None:
            data["error_message"] = error_message
        if model_used is not None:
            data["model_used"] = model_used
        if retry_count is not None:
            data["retry_count"] = retry_count
            
        if status == "running":
            data["started_at"] = datetime.utcnow().isoformat()
        elif status in ["completed", "failed"]:
            data["completed_at"] = datetime.utcnow().isoformat()
            
        try:
            update_data = {**data, "updated_at": datetime.utcnow().isoformat()}
            res = self.client.table("agent_tasks").update(update_data).eq("id", task_id).execute()
        except Exception as e:
            if "updated_at" in str(e):
                res = self.client.table("agent_tasks").update(data).eq("id", task_id).execute()
            else:
                logger.error(f"[DB] Failed to update agent task {task_id}: {e}")
                raise e
        return res.data[0] if res.data else {}

    async def get_pending_tasks(self, repo_id: Optional[str] = None) -> List[dict]:
        query = self.client.table("agent_tasks").select("*").in_("status", ["queued", "running"])
        if repo_id:
            query = query.eq("repo_id", repo_id)
        res = query.execute()
        return res.data

    async def get_agent_task_by_id(self, task_id: str) -> Optional[dict]:
        res = self.client.table("agent_tasks").select("*").eq("id", task_id).execute()
        return res.data[0] if res.data else None

    async def get_agent_tasks_by_repo(self, repo_id: str) -> List[dict]:
        res = self.client.table("agent_tasks").select("*").eq("repo_id", repo_id).execute()
        return res.data

    # --- Releases ---
    async def create_release(self, repo_id: str, version: str, bump_type: str, release_notes: str, github_release_url: str, tag_name: str) -> dict:
        data = {
            "repo_id": repo_id,
            "version": version,
            "bump_type": bump_type,
            "release_notes": release_notes,
            "github_release_url": github_release_url,
            "tag_name": tag_name
        }
        res = self.client.table("releases").insert(data).execute()
        return res.data[0] if res.data else {}

    async def get_releases_by_repo(self, repo_id: str) -> List[dict]:
        res = self.client.table("releases").select("*").eq("repo_id", repo_id).execute()
        return res.data

    # --- Activity Log ---
    async def log_activity(self, repo_id: str, event_type: str, message: str, metadata: dict = {}, severity: str = 'info') -> dict:
        logger.debug(f"[DB] log_activity for repo {repo_id}: {message}")
        data = {
            "repo_id": repo_id,
            "event_type": event_type,
            "message": message,
            "metadata": metadata,
            "severity": severity
        }
        try:
            res = self.client.table("activity_log").insert(data).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.error(f"[DB] Failed to log activity for repo {repo_id}: {e}")
            return {}

    async def get_activity_log(self, repo_id: str, limit: int = 50) -> List[dict]:
        res = self.client.table("activity_log").select("*").eq("repo_id", repo_id).order("created_at", desc=True).limit(limit).execute()
        return res.data

db = SupabaseService()
