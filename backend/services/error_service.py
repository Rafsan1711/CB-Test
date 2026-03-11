import uuid
import traceback
from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from services.supabase_service import db
from services.github_service import GitHubService

class ErrorCategory(Enum):
    GITHUB_API = "github_api"
    GEMINI_API = "gemini_api"  
    SUPABASE = "supabase"
    FIREBASE_AUTH = "firebase_auth"
    WEBHOOK = "webhook"
    AGENT_TASK = "agent_task"
    CONTEXT_BUILD = "context_build"
    TEMPLATE = "template"
    VERSIONING = "versioning"
    EXTERNAL_API = "external_api"

class ErrorService:
    def __init__(self):
        self.github_service = GitHubService()

    async def log_error(
        self, 
        category: ErrorCategory, 
        error: Exception, 
        context: Dict[str, Any], 
        repo_id: Optional[str] = None, 
        task_id: Optional[str] = None,
        severity: str = "error"
    ):
        """Log an error to the database and optionally create a GitHub issue."""
        error_msg = str(error)
        tb = traceback.format_exc()
        
        log_data = {
            "repo_id": repo_id,
            "task_id": task_id,
            "category": category.value,
            "severity": severity,
            "message": error_msg,
            "traceback": tb,
            "context": context
        }
        
        # Save to Supabase
        try:
            result = db.client.table("error_logs").insert(log_data).execute()
            log_record = result.data[0] if result.data else None
        except Exception as e:
            print(f"Failed to log error to Supabase: {e}")
            return None
            
        # If critical and we have a repo_id, create a GitHub issue
        if severity == "critical" and repo_id:
            try:
                repo = await db.get_repo_by_id(repo_id)
                if repo and repo.get("github_full_name"):
                    issue_title = f"[ContriBot Error] {category.value}: {error_msg[:50]}..."
                    issue_body = f"""
## ContriBot Critical Error
An automated critical error was detected by ContriBot.

**Category:** {category.value}
**Context:**
```json
{context}
```

**Traceback:**
```python
{tb}
```
"""
                    # We would need the user's installation token here, but for now we'll just log it
                    # In a real scenario, we'd fetch the installation token and create the issue
                    # await self.github_service.create_issue(installation_id, repo["github_full_name"], issue_title, issue_body, labels=["contribot-error"])
                    pass
            except Exception as e:
                print(f"Failed to create GitHub issue for critical error: {e}")
                
        return log_record

    async def get_errors(self, repo_id: Optional[str] = None, category: Optional[str] = None, since_hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent errors, optionally filtered by repo or category."""
        time_threshold = (datetime.utcnow() - timedelta(hours=since_hours)).isoformat()
        
        query = db.client.table("error_logs").select("*").gte("created_at", time_threshold).order("created_at", desc=True)
        
        if repo_id:
            query = query.eq("repo_id", repo_id)
        if category:
            query = query.eq("category", category)
            
        result = query.execute()
        return result.data

    async def get_error_summary(self) -> Dict[str, Any]:
        """Get a summary of recent errors."""
        time_threshold = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        
        # Get all recent errors
        result = db.client.table("error_logs").select("category, severity, resolved").gte("created_at", time_threshold).execute()
        errors = result.data
        
        summary = {
            "total_24h": len(errors),
            "unresolved": len([e for e in errors if not e.get("resolved")]),
            "critical": len([e for e in errors if e.get("severity") == "critical"]),
            "by_category": {}
        }
        
        for e in errors:
            cat = e.get("category")
            if cat not in summary["by_category"]:
                summary["by_category"][cat] = 0
            summary["by_category"][cat] += 1
            
        return summary

    async def clear_old_errors(self, days: int = 30):
        """Delete errors older than the specified number of days."""
        time_threshold = (datetime.utcnow() - timedelta(days=days)).isoformat()
        db.client.table("error_logs").delete().lt("created_at", time_threshold).execute()
        
    async def mark_resolved(self, error_id: str, resolved: bool = True):
        """Mark an error as resolved or unresolved."""
        result = db.client.table("error_logs").update({"resolved": resolved}).eq("id", error_id).execute()
        return result.data[0] if result.data else None

error_service = ErrorService()
