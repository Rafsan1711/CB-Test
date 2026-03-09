from supabase import create_client, Client
from config import settings
from typing import Optional, List, Dict, Any

class SupabaseService:
    def __init__(self):
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    async def get_or_create_user(self, firebase_uid: str, email: str, github_username: Optional[str] = None, avatar_url: Optional[str] = None) -> dict:
        user = await self.get_user_by_firebase_uid(firebase_uid)
        if user:
            return user
        
        data = {
            "firebase_uid": firebase_uid,
            "email": email,
            "github_username": github_username,
            "avatar_url": avatar_url
        }
        res = self.client.table("users").insert(data).execute()
        return res.data[0] if res.data else {}

    async def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[dict]:
        res = self.client.table("users").select("*").eq("firebase_uid", firebase_uid).execute()
        return res.data[0] if res.data else None

    async def update_user_github_token(self, user_id: str, token: str) -> dict:
        res = self.client.table("users").update({"github_access_token": token}).eq("id", user_id).execute()
        return res.data[0] if res.data else {}

    async def create_repo(self, user_id: str, github_full_name: str, github_repo_url: str) -> dict:
        data = {
            "user_id": user_id,
            "github_full_name": github_full_name,
            "github_repo_url": github_repo_url,
            "contribot_active": False,
            "settings": {}
        }
        res = self.client.table("repos").insert(data).execute()
        return res.data[0] if res.data else {}

    async def get_repos_by_user(self, user_id: str) -> List[dict]:
        res = self.client.table("repos").select("*").eq("user_id", user_id).execute()
        return res.data

    async def get_repo_by_id(self, repo_id: str) -> Optional[dict]:
        res = self.client.table("repos").select("*").eq("id", repo_id).execute()
        return res.data[0] if res.data else None

    async def update_repo(self, repo_id: str, data: dict) -> dict:
        res = self.client.table("repos").update(data).eq("id", repo_id).execute()
        return res.data[0] if res.data else {}

    async def create_issue(self, repo_id: str, data: dict) -> dict:
        data["repo_id"] = repo_id
        res = self.client.table("issues").insert(data).execute()
        return res.data[0] if res.data else {}

    async def get_issues_by_repo(self, repo_id: str, status: Optional[str] = None) -> List[dict]:
        query = self.client.table("issues").select("*").eq("repo_id", repo_id)
        if status:
            query = query.eq("status", status)
        res = query.execute()
        return res.data

    async def update_issue(self, issue_id: str, data: dict) -> dict:
        res = self.client.table("issues").update(data).eq("id", issue_id).execute()
        return res.data[0] if res.data else {}

    async def create_pr(self, repo_id: str, data: dict) -> dict:
        data["repo_id"] = repo_id
        res = self.client.table("pull_requests").insert(data).execute()
        return res.data[0] if res.data else {}

    async def get_prs_by_repo(self, repo_id: str) -> List[dict]:
        res = self.client.table("pull_requests").select("*").eq("repo_id", repo_id).execute()
        return res.data

    async def update_pr(self, pr_id: str, data: dict) -> dict:
        res = self.client.table("pull_requests").update(data).eq("id", pr_id).execute()
        return res.data[0] if res.data else {}

    async def create_agent_task(self, repo_id: str, task_type: str, input_data: dict) -> dict:
        data = {
            "repo_id": repo_id,
            "task_type": task_type,
            "input_data": input_data,
            "status": "pending"
        }
        res = self.client.table("agent_tasks").insert(data).execute()
        return res.data[0] if res.data else {}

    async def update_agent_task(self, task_id: str, status: str, output_data: Optional[dict] = None, error: Optional[str] = None) -> dict:
        data = {"status": status}
        if output_data is not None:
            data["output_data"] = output_data
        if error is not None:
            data["error"] = error
        res = self.client.table("agent_tasks").update(data).eq("id", task_id).execute()
        return res.data[0] if res.data else {}

    async def get_pending_tasks(self, repo_id: Optional[str] = None) -> List[dict]:
        query = self.client.table("agent_tasks").select("*").eq("status", "pending")
        if repo_id:
            query = query.eq("repo_id", repo_id)
        res = query.execute()
        return res.data

    async def create_release(self, repo_id: str, version: str, bump_type: str, notes: str, url: str, tag: str) -> dict:
        data = {
            "repo_id": repo_id,
            "version": version,
            "bump_type": bump_type,
            "notes": notes,
            "url": url,
            "tag": tag
        }
        res = self.client.table("releases").insert(data).execute()
        return res.data[0] if res.data else {}

    async def get_releases_by_repo(self, repo_id: str) -> List[dict]:
        res = self.client.table("releases").select("*").eq("repo_id", repo_id).execute()
        return res.data

    async def log_activity(self, repo_id: str, event_type: str, message: str, metadata: dict = {}, severity: str = 'info') -> dict:
        data = {
            "repo_id": repo_id,
            "event_type": event_type,
            "message": message,
            "metadata": metadata,
            "severity": severity
        }
        res = self.client.table("activity_logs").insert(data).execute()
        return res.data[0] if res.data else {}

    async def get_activity_log(self, repo_id: str, limit: int = 50) -> List[dict]:
        res = self.client.table("activity_logs").select("*").eq("repo_id", repo_id).order("created_at", desc=True).limit(limit).execute()
        return res.data

db = SupabaseService()
