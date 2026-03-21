import asyncio
import logging
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from enum import IntEnum

from services.github_service import github_svc
from services.gemini_service import gemini_svc
from services.supabase_service import db
from services.repo_context_service import repo_context_service
from services.error_service import error_service, ErrorCategory

logger = logging.getLogger(__name__)

class TaskPriority(IntEnum):
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4

@dataclass(order=True)
class QueueItem:
    priority: TaskPriority
    timestamp: float
    task_id: str = field(compare=False)
    repo_id: str = field(compare=False)
    task_type: str = field(compare=False)
    input_data: Dict[str, Any] = field(compare=False)

class AgentOrchestrator:
    def __init__(self):
        self.global_semaphore = asyncio.Semaphore(10)
        self.repo_semaphores: Dict[str, asyncio.Semaphore] = {}
        self.queue = asyncio.PriorityQueue()
        self._worker_task: Optional[asyncio.Task] = None
        self._is_running = False

    def start(self):
        if not self._is_running:
            self._is_running = True
            self._worker_task = asyncio.create_task(self._worker_loop())
            logger.info("AgentOrchestrator started.")

    def stop(self):
        self._is_running = False
        if self._worker_task:
            self._worker_task.cancel()
            logger.info("AgentOrchestrator stopped.")

    def _get_repo_semaphore(self, repo_id: str) -> asyncio.Semaphore:
        if repo_id not in self.repo_semaphores:
            self.repo_semaphores[repo_id] = asyncio.Semaphore(3)
        return self.repo_semaphores[repo_id]

    async def _log(self, repo_id: str, task_type: str, message: str, task_id: str, start_time: float, severity: str = "info"):
        duration_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
        log_msg = f"[ContriBot][{repo_id}][{task_type}] {message} | task_id={task_id} | duration={duration_ms}ms"
        
        if severity == "error":
            logger.error(log_msg)
        elif severity == "warning":
            logger.warning(log_msg)
        else:
            logger.info(log_msg)
            
        try:
            await db.log_activity(
                repo_id=repo_id,
                event_type=task_type,
                message=message,
                metadata={"task_id": task_id, "duration_ms": duration_ms},
                severity=severity
            )
        except Exception as e:
            logger.error(f"Failed to log activity to DB: {e}")

    async def enqueue_task(self, repo_id: str, task_type: str, input_data: Dict[str, Any], priority: TaskPriority = TaskPriority.NORMAL) -> str:
        """Create a task in DB and enqueue it."""
        try:
            task_record = await db.create_agent_task(repo_id, task_type, input_data)
            task_id = task_record["id"]
            
            # Update priority if needed (e.g. bug fixes are HIGH)
            if task_type == "fix_bug" or task_type == "verify_pr" or task_type == "release":
                priority = TaskPriority.HIGH
                
            item = QueueItem(
                priority=priority,
                timestamp=asyncio.get_event_loop().time(),
                task_id=task_id,
                repo_id=repo_id,
                task_type=task_type,
                input_data=input_data
            )
            await self.queue.put(item)
            logger.info(f"[TASK] Enqueued task {task_id} ({task_type}) for repo {repo_id} with priority {priority.name}")
            return task_id
        except Exception as e:
            logger.error(f"[TASK] Failed to enqueue task: {e}")
            raise

    async def process_new_issue(self, repo_id: str, issue_number: int):
        """Called by webhook when a new issue is opened."""
        await self.enqueue_task(repo_id, "analyze_issue", {"github_issue_number": issue_number}, TaskPriority.HIGH)

    async def handle_user_response(self, repo_id: str, issue_id: str, response: str):
        """Called by webhook or API when a user responds to an AI analysis."""
        if response == "yes":
            await self.enqueue_task(repo_id, "write_code", {"issue_id": issue_id}, TaskPriority.HIGH)
        elif response == "no":
            await db.update_issue(issue_id, {"status": "rejected"})
            await db.log_activity(repo_id, "issue_rejected", f"Issue {issue_id} rejected by user")

    async def handle_new_pr(self, repo_id: str, pr_number: int):
        """Called by webhook when a new PR is opened."""
        await self.enqueue_task(repo_id, "verify_pr", {"github_pr_number": pr_number}, TaskPriority.HIGH)

    async def handle_pr_merged(self, repo_id: str, pr_number: int):
        """Called by webhook when a PR is merged."""
        await self.enqueue_task(repo_id, "process_pr_merge", {"github_pr_number": pr_number}, TaskPriority.HIGH)

    async def handle_ci_failure(self, repo_id: str, pr_number: int, check_run_id: int):
        """Called by webhook when a CI check fails."""
        await self.enqueue_task(repo_id, "fix_ci", {"github_pr_number": pr_number, "check_run_id": check_run_id}, TaskPriority.HIGH)

    async def retry_task(self, task_id: str):
        """Re-enqueue a failed or cancelled task."""
        task = await db.get_agent_task_by_id(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")
            
        await db.update_agent_task(task_id, {"status": "pending", "retry_count": 0})
        
        item = QueueItem(
            priority=TaskPriority.NORMAL, # Default to normal for retries
            timestamp=asyncio.get_event_loop().time(),
            task_id=task_id,
            repo_id=task["repo_id"],
            task_type=task["task_type"],
            input_data=task["input_data"]
        )
        await self.queue.put(item)
        logger.info(f"Re-enqueued task {task_id} for retry")

    async def _worker_loop(self):
        while self._is_running:
            try:
                item: QueueItem = await self.queue.get()
                asyncio.create_task(self._process_item(item))
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in worker loop: {e}")
                await asyncio.sleep(1)

    async def _process_item(self, item: QueueItem):
        repo_sem = self._get_repo_semaphore(item.repo_id)
        repo = await db.get_repo_by_id(item.repo_id)
        repo_name = repo.get("github_full_name", "unknown/repo")
        repo_prefix = f"[REPO: {repo_name}]"
        
        async with self.global_semaphore:
            async with repo_sem:
                start_time = asyncio.get_event_loop().time()
                logger.info("=" * 60)
                logger.info(f"[TASK]{repo_prefix} Starting task {item.task_id} ({item.task_type})")
                await self._log(item.repo_id, item.task_type, f"Starting task execution", item.task_id, start_time)
                
                try:
                    # Mark as running
                    await db.update_agent_task(item.task_id, "running")
                    
                    result = await self._execute_with_retry(item)
                    
                    duration_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
                    if result == "no_changes":
                        logger.info(f"[TASK]{repo_prefix} Task {item.task_id} completed: No code changes were needed. Duration: {duration_ms}ms")
                        await self._log(item.repo_id, item.task_type, f"Task completed: No code changes were needed", item.task_id, start_time)
                    else:
                        logger.info(f"[TASK]{repo_prefix} Task {item.task_id} completed successfully. Duration: {duration_ms}ms")
                        await self._log(item.repo_id, item.task_type, f"Task completed successfully", item.task_id, start_time)
                except Exception as e:
                    duration_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
                    logger.error(f"[TASK]{repo_prefix} Task {item.task_id} failed permanently after {duration_ms}ms: {e}")
                    await self._log(item.repo_id, item.task_type, f"Task failed permanently: {e}", item.task_id, start_time, "error")
                finally:
                    self.queue.task_done()

    async def _execute_with_retry(self, item: QueueItem):
        max_retries = 3
        repo = await db.get_repo_by_id(item.repo_id)
        repo_name = repo.get("github_full_name", "unknown/repo")
        repo_prefix = f"[REPO: {repo_name}]"
        
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    logger.info(f"[TASK]{repo_prefix} Retry attempt {attempt}/{max_retries} for task {item.task_id}")
                
                result = await self._route_task(item)
                # If successful, update DB and break
                await db.update_agent_task(item.task_id, "completed")
                return result
                
            except Exception as e:
                error_msg = str(e).lower()
                
                # Update retry count in DB
                await db.update_agent_task(item.task_id, "running", retry_count=attempt + 1)
                
                if attempt == max_retries:
                    # Final failure
                    logger.error(f"[TASK]{repo_prefix} Task {item.task_id} failed after {max_retries} retries. Error: {e}")
                    await db.update_agent_task(item.task_id, "failed", error_message=str(e))
                    
                    # Log to error_service
                    await error_service.log_error(
                        repo_id=item.repo_id,
                        task_id=item.task_id,
                        category=ErrorCategory.SYSTEM,
                        message=f"Task {item.task_type} failed after {max_retries} retries: {e}",
                        severity="error"
                    )
                    raise e
                
                # Determine backoff strategy
                if "404" in error_msg and "github" in error_msg:
                    # Permanent failure
                    logger.error(f"[TASK]{repo_prefix} Permanent GitHub 404 error for task {item.task_id}. Aborting.")
                    db.client.table("agent_tasks").update({
                        "status": "failed",
                        "error_message": "GitHub 404 Not Found",
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    }).eq("id", item.task_id).execute()
                    raise e
                    
                elif "rate limit" in error_msg or "429" in error_msg:
                    if "gemini" in error_msg:
                        wait_time = 60
                        logger.warning(f"[TASK]{repo_prefix} Gemini rate limit hit. Waiting {wait_time}s before retry {attempt+1}/{max_retries}. Error: {e}")
                    else:
                        wait_time = 300
                        logger.warning(f"[TASK]{repo_prefix} GitHub API rate limit hit. Waiting {wait_time}s before retry {attempt+1}/{max_retries}. Error: {e}")
                else:
                    # Network or other error -> exponential backoff: 30s, 60s, 120s
                    wait_time = 30 * (2 ** attempt)
                    logger.warning(f"[TASK]{repo_prefix} Error executing task {item.task_id}: {e}. Waiting {wait_time}s before retry {attempt+1}/{max_retries}")
                
                await asyncio.sleep(wait_time)

    async def _route_task(self, item: QueueItem):
        if item.task_type == "analyze_issue":
            return await self._handle_analyze_issue(item)
        elif item.task_type in ["write_code", "fix_bug", "implement_feature"]:
            return await self._handle_implement_issue(item)
        elif item.task_type == "verify_pr":
            return await self._handle_verify_pr(item)
        elif item.task_type == "revise_code":
            return await self._handle_revise_code(item)
        elif item.task_type == "process_pr_merge":
            return await self._handle_pr_merged(item)
        elif item.task_type == "fix_ci":
            return await self._handle_fix_ci(item)
        elif item.task_type == "repo_ingestion":
            return await self._handle_repo_ingestion(item)
        elif item.task_type == "install_templates":
            return await self._handle_install_templates(item)
        elif item.task_type == "install_ci":
            return await self._handle_install_ci(item)
        elif item.task_type == "install_labels":
            return await self._handle_install_labels(item)
        elif item.task_type == "sync_issues":
            return await self._handle_sync_issues(item)
        elif item.task_type == "post_comment":
            return await self._handle_post_comment(item)
        elif item.task_type == "release":
            return await self._handle_release(item)
        elif item.task_type == "build_context":
            return await self._handle_build_context(item)
        else:
            raise ValueError(f"Unknown task type: {item.task_type}")

    # =========================================================================
    # Task Handlers
    # =========================================================================

    async def _handle_repo_ingestion(self, item: QueueItem):
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        start_time = asyncio.get_event_loop().time()
        await repo_context_service.get_context(item.repo_id, full_name, force_rebuild=True)
        await self._log(item.repo_id, "repo_ingestion", "Repository ingestion complete", item.task_id, start_time)

    async def _handle_install_templates(self, item: QueueItem):
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        start_time = asyncio.get_event_loop().time()
        from services.template_service import template_svc
        res = await template_svc.install_templates_on_repo(full_name)
        await self._log(item.repo_id, "install_templates", f"Templates installation: {res['status']}", item.task_id, start_time)

    async def _handle_install_ci(self, item: QueueItem):
        # This is now handled within install_templates_on_repo in template_svc
        await self._log(item.repo_id, "install_ci", "CI workflows installed via template service", item.task_id, asyncio.get_event_loop().time())

    async def _handle_install_labels(self, item: QueueItem):
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        start_time = asyncio.get_event_loop().time()
        labels = [
            {"name": "bug", "color": "d73a4a", "description": "Something isn't working"},
            {"name": "enhancement", "color": "a2eeef", "description": "New feature or request"},
            {"name": "contribot-task", "color": "7057ff", "description": "Direct task for ContriBot"},
            {"name": "priority: critical", "color": "b60205", "description": "Highest priority"},
            {"name": "priority: high", "color": "d93f0b", "description": "High priority"},
            {"name": "priority: medium", "color": "fbca04", "description": "Medium priority"},
            {"name": "priority: low", "color": "0e8a16", "description": "Low priority"},
        ]
        
        gh_repo = github_svc.client.get_repo(full_name)
        for label in labels:
            try:
                await github_svc._run_async(gh_repo.create_label, name=label["name"], color=label["color"], description=label["description"])
            except Exception:
                # Label might already exist
                pass
        await self._log(item.repo_id, "install_labels", "Standard labels installed", item.task_id, start_time)

    async def _handle_sync_issues(self, item: QueueItem):
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        start_time = asyncio.get_event_loop().time()
        
        await self._log(item.repo_id, "sync_issues", f"Fetching issues from GitHub for {full_name}", item.task_id, start_time)
        github_issues = await github_svc.list_open_issues(full_name)
        
        existing_issues = await db.get_issues_by_repo(item.repo_id)
        existing_numbers = {i["github_issue_number"] for i in existing_issues if i.get("github_issue_number")}
        
        count = 0
        for issue in github_issues:
            if issue["number"] not in existing_numbers:
                await db.create_issue(item.repo_id, {
                    "github_issue_number": issue["number"],
                    "title": issue["title"],
                    "body": issue["body"],
                    "status": "open"
                })
                # Trigger analysis for the new issue
                await self.enqueue_task(item.repo_id, "analyze_issue", {"github_issue_number": issue["number"]}, TaskPriority.NORMAL)
                count += 1
        
        await self._log(item.repo_id, "sync_issues", f"Issue sync complete. Found {count} new issues to analyze.", item.task_id, start_time)

    async def _handle_analyze_issue(self, item: QueueItem):
        github_issue_number = item.input_data.get("github_issue_number")
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        repo_prefix = f"[REPO: {full_name}]"
        preferred_model = repo.get("settings", {}).get("preferred_model")
        
        logger.info(f"[TASK]{repo_prefix} Analyzing issue #{github_issue_number} (Preferred Model: {preferred_model})")
        
        issue_data = await github_svc.get_issue(full_name, github_issue_number)
        logger.info(f"[TASK]{repo_prefix} Building focused context for issue #{github_issue_number}")
        focused_context = await repo_context_service.build_focused_context(full_name, issue_data)
        
        logger.info(f"[TASK]{repo_prefix} Calling Gemini to analyze issue #{github_issue_number}")
        analysis = await gemini_svc.analyze_issue(
            issue_title=issue_data.get("title", ""),
            issue_body=issue_data.get("body", ""),
            repo_context=focused_context,
            preferred_model=preferred_model
        )
        
        issue_type = analysis.get("type", "feature").lower()
        requires_approval = analysis.get("requires_approval", False)
        logger.info(f"[TASK]{repo_prefix} Analysis result: type={issue_type}, requires_approval={requires_approval}")
        
        # Update or create issue in DB
        existing = await db.get_issues_by_repo(item.repo_id)
        db_issue = next((i for i in existing if i.get("github_issue_number") == github_issue_number), None)
        
        if not db_issue:
            db_issue = await db.create_issue(item.repo_id, {
                "github_issue_number": github_issue_number,
                "title": issue_data.get("title", ""),
                "body": issue_data.get("body", ""),
                "issue_type": issue_type,
                "ai_analysis": analysis,
                "status": "open"
            })
        else:
            db_issue = await db.update_issue(db_issue["id"], {
                "issue_type": issue_type,
                "ai_analysis": analysis
            })
            
        # Post Analysis Comment
        hints = analysis.get('implementation_hints') or []
        questions = analysis.get('questions_for_owner') or []
        components = analysis.get('affected_components') or []
        
        if issue_type == "bug" or not requires_approval:
            comment = f"""## 🤖 ContriBot — Bug Analysis

**Classification:** 🐛 Bug  
**Priority:** 🔴 {analysis.get('priority', 'High').capitalize()}  
**Estimated Fix:** ~30-60 minutes  

### 🔍 Likely Root Cause
{analysis.get('analysis_summary', 'Root cause analysis in progress...')}

### 🛠️ Fix Plan
{chr(10).join([f"{i+1}. {hint}" for i, hint in enumerate(hints)]) if hints else "No specific hints provided."}

ContriBot is now implementing this fix automatically..."""
            
            await github_svc.add_issue_comment(full_name, github_issue_number, comment)
            await db.update_issue(db_issue["id"], {"status": "approved"})
            await self.enqueue_task(item.repo_id, "write_code", {"issue_id": db_issue["id"], "github_issue_number": github_issue_number}, TaskPriority.HIGH)
        else:
            comment = f"""## 🤖 ContriBot — Issue Analysis

**Classification:** ✨ {issue_type.capitalize()}  
**Priority:** 🟡 {analysis.get('priority', 'Medium').capitalize()}  
**Estimated Complexity:** {analysis.get('estimated_complexity', 'Moderate').capitalize()}  
**Estimated Time:** ~{analysis.get('estimated_time_hours', 4)} hours  
**Affected Areas:** {", ".join([f"`{c}`" for c in components]) if components else "General"}

### 📋 What ContriBot Will Do
{chr(10).join([f"{i+1}. {hint}" for i, hint in enumerate(hints)]) if hints else "No specific hints provided."}

### ⚠️ Things to Consider
{chr(10).join([f"- {q}" for q in questions]) if questions else "No specific questions."}

---
Reply **`yes`** to have ContriBot implement this.  
Reply **`no`** to close this issue."""
            
            await github_svc.add_issue_comment(full_name, github_issue_number, comment)
            await db.update_issue(db_issue["id"], {"status": "pending_approval"})

    async def _handle_implement_issue(self, item: QueueItem):
        issue_id = item.input_data.get("issue_id")
        github_issue_number = item.input_data.get("github_issue_number")
        
        if not github_issue_number and issue_id:
            issues = await db.get_issues_by_repo(item.repo_id)
            db_issue = next((i for i in issues if i["id"] == issue_id), None)
            if db_issue:
                github_issue_number = db_issue.get("github_issue_number")
                
        if not github_issue_number:
            raise ValueError(f"Missing github_issue_number for task {item.task_id}")
            
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        repo_prefix = f"[REPO: {full_name}]"
        preferred_model = repo.get("settings", {}).get("preferred_model")
        
        logger.info(f"[TASK]{repo_prefix} Implementing issue #{github_issue_number} (Preferred Model: {preferred_model})")
        
        issue_data = await github_svc.get_issue(full_name, github_issue_number)
        
        # Build focused context
        logger.info(f"[TASK]{repo_prefix} Building focused context for implementation of #{github_issue_number}")
        context = await repo_context_service.build_focused_context(full_name, issue_data)
        
        # Generate code
        logger.info(f"[TASK]{repo_prefix} Generating code for issue #{github_issue_number}")
        plan = await gemini_svc.write_code_for_issue(context, issue_data, preferred_model=preferred_model)
        
        # Create branch
        branch_name = plan.get("branch_name", f"contribot/issue-{github_issue_number}").replace("{{number}}", str(github_issue_number))
        logger.info(f"[TASK]{repo_prefix} Creating branch {branch_name}")
        await github_svc.create_branch(full_name, branch_name)
        
        # Apply changes
        files_created = plan.get("files_to_create", [])
        files_modified = plan.get("files_to_modify", [])
        files_deleted = plan.get("files_to_delete", [])
        
        logger.info(f"[TASK]{repo_prefix} Applying changes: {len(files_created)} created, {len(files_modified)} modified, {len(files_deleted)} deleted")
        
        if not files_created and not files_modified and not files_deleted:
            error_msg = "🤖 ContriBot analyzed the issue but couldn't determine any necessary code changes. Please provide more details or clarify the requirements."
            logger.warning(f"[TASK]{repo_prefix} No changes generated for issue {github_issue_number}. {error_msg}")
            await github_svc.add_issue_comment(full_name, github_issue_number, error_msg)
            await db.update_issue(issue_id, {"status": "open"})
            return "no_changes"

        for f in files_created:
            path = f.get("path")
            content = f.get("content")
            if not path or content is None:
                logger.warning(f"[TASK]{repo_prefix} Skipping invalid file creation: {f}")
                continue
            logger.info(f"[TASK]{repo_prefix} Creating file {path} ({len(content)} chars)")
            await github_svc.create_or_update_file(full_name, path, content, f"feat: create {path}", branch_name)
            
        for f in files_modified:
            path = f.get("path")
            content = f.get("modified_content")
            if not path or content is None:
                logger.warning(f"[TASK]{repo_prefix} Skipping invalid file modification: {f}")
                continue
            logger.info(f"[TASK]{repo_prefix} Updating file {path} ({len(content)} chars)")
            await github_svc.create_or_update_file(full_name, path, content, f"fix: update {path}", branch_name)
        for path in files_deleted:
            logger.info(f"[TASK]{repo_prefix} Deleting file {path}")
            # PyGithub delete_file requires sha
            try:
                repo_obj = github_svc.client.get_repo(full_name)
                contents = repo_obj.get_contents(path, ref=branch_name)
                repo_obj.delete_file(path, f"chore: delete {path}", contents.sha, branch=branch_name)
            except Exception as e:
                logger.error(f"[TASK]{repo_prefix} Failed to delete {path}: {e}")
                pass
                
        # Create PR
        default_title = f"Fix #{github_issue_number}" if github_issue_number else "Automated Fix"
        default_body = f"Resolves #{github_issue_number}" if github_issue_number else "Automated implementation by ContriBot."
        
        pr_title = plan.get("pr_title", default_title)
        pr_body = plan.get("pr_body", default_body)
        
        logger.info(f"[TASK]{repo_prefix} Creating Pull Request: {pr_title}")
        
        try:
            pr_number = await github_svc.create_pull_request(
                full_name, 
                pr_title, 
                pr_body, 
                branch_name
            )
            logger.info(f"[TASK]{repo_prefix} PR #{pr_number} created successfully")
        except Exception as e:
            logger.error(f"Failed to create PR: {e}")
            await github_svc.add_issue_comment(full_name, github_issue_number, f"🤖 ContriBot failed to create a Pull Request: {e}")
            raise e
        
        # Save PR to DB
        db_pr = await db.create_pr(item.repo_id, {
            "issue_id": issue_id,
            "github_pr_number": pr_number,
            "title": pr_title,
            "branch_name": branch_name,
            "status": "open"
        })
        
        # Post PR Creation Comment
        files_table = "| File | Action |\n|------|--------|\n"
        for f in plan.get("files_to_create", []): files_table += f"| `{f['path']}` | ✅ Created |\n"
        for f in plan.get("files_to_modify", []): files_table += f"| `{f['path']}` | ✏️ Modified |\n"
        for path in plan.get("files_to_delete", []): files_table += f"| `{path}` | 🗑️ Deleted |\n"
        
        pr_comment = f"""## 🤖 ContriBot — Implementation Complete

**Resolves:** #{github_issue_number}  
**Branch:** `{branch_name}`  

### 📁 Changes Made
{files_table}

### 🔍 Running Multi-Model Verification...
_(2 AI models are reviewing this PR. Results below.)_"""
        
        await github_svc.add_issue_comment(full_name, pr_number, pr_comment)
        
        # Also comment on the original issue
        issue_comment = f"🤖 ContriBot has implemented a fix for this issue in PR #{pr_number}."
        await github_svc.add_issue_comment(full_name, github_issue_number, issue_comment)
        
        await db.update_issue(issue_id, {"status": "in_progress"})
        
        # Enqueue verification
        await self.enqueue_task(item.repo_id, "verify_pr", {"pr_id": db_pr["id"], "github_pr_number": pr_number}, TaskPriority.HIGH)

    async def _handle_verify_pr(self, item: QueueItem):
        pr_id = item.input_data.get("pr_id")
        github_pr_number = item.input_data.get("github_pr_number")
        
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        repo_prefix = f"[REPO: {full_name}]"
        
        if not github_pr_number and pr_id:
            # Fetch from DB if missing
            prs = await db.get_prs_by_repo(item.repo_id)
            db_pr = next((p for p in prs if p["id"] == pr_id), None)
            if db_pr:
                github_pr_number = db_pr.get("github_pr_number")
        
        if not github_pr_number:
            raise ValueError(f"Missing github_pr_number for task {item.task_id}")
            
        logger.info(f"[TASK]{repo_prefix} Verifying PR #{github_pr_number}")
        pr_data = await github_svc.get_pull_request(full_name, github_pr_number)
        diff = await github_svc.get_pr_diff(full_name, github_pr_number)
        context = await repo_context_service.get_context(item.repo_id, full_name)
        
        logger.info(f"[TASK]{repo_prefix} Running multi-model verification for PR #{github_pr_number}")
        consensus = await gemini_svc.verify_pr_multimodel(diff, pr_data["title"], pr_data["body"], context)
        
        for r in consensus.results:
            logger.info(f"[TASK]{repo_prefix} Model {r.model_name} verdict: {'Approved' if r.approved else 'Rejected'} (Score: {r.score}/10)")
        
        logger.info(f"[TASK]{repo_prefix} Final consensus: {consensus.consensus_score}/2 approved. Safe to merge: {consensus.safe_to_merge}")
        
        if not pr_id:
            # Check if it exists in DB by github_pr_number
            prs = await db.get_prs_by_repo(item.repo_id)
            db_pr = next((p for p in prs if p.get("github_pr_number") == github_pr_number), None)
            if db_pr:
                pr_id = db_pr["id"]
            else:
                # Create it
                db_pr = await db.create_pr(item.repo_id, {
                    "github_pr_number": github_pr_number,
                    "title": pr_data["title"],
                    "status": "open"
                })
                pr_id = db_pr["id"]
                
        # Update DB
        if pr_id:
            await db.update_pr(pr_id, {
                "verification_status": "approved" if consensus.safe_to_merge else "changes_requested",
                "verification_results": [r.model_dump() for r in consensus.results],
                "consensus_score": consensus.consensus_score
            })
            
        # Post Report Comment
        report_table = "| Model | Verdict | Score | Key Findings |\n|-------|---------|-------|--------------|\n"
        for r in consensus.results:
            verdict = "✅ Approved" if r.approved else "❌ Rejected"
            report_table += f"| {r.model_name} | {verdict} | {r.score}/10 | {r.reasoning[:50]}... |\n"
            
        status_header = "## ✅ SAFE TO MERGE" if consensus.safe_to_merge else "## ⚠️ NEEDS WORK"
        status_msg = "> This PR has been independently verified by 2 AI models. Review and merge when ready." if consensus.safe_to_merge else "> Verification failed. ContriBot will attempt to revise the implementation."
        
        comment = f"""## 🔍 ContriBot — Verification Report

{report_table}

### 🎯 Consensus: {consensus.consensus_score}/2 Models Approved

---
{status_header}
{status_msg}
"""
        await github_svc.add_issue_comment(full_name, github_pr_number, comment)
        
        if not consensus.safe_to_merge:
            # Trigger revision loop
            await self.enqueue_task(item.repo_id, "revise_code", {"pr_id": pr_id, "github_pr_number": github_pr_number, "consensus": consensus.model_dump()}, TaskPriority.HIGH)

    async def _handle_revise_code(self, item: QueueItem):
        pr_id = item.input_data.get("pr_id")
        github_pr_number = item.input_data.get("github_pr_number")
        consensus_data = item.input_data.get("consensus")
        
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        
        # Get PR and diff
        pr_data = await github_svc.get_pull_request(full_name, github_pr_number)
        diff = await github_svc.get_pr_diff(full_name, github_pr_number)
        context = await repo_context_service.get_context(item.repo_id, full_name)
        
        # Gemini 3.1 Pro revises the code
        prompt = f"""
Your previous implementation for PR #{github_pr_number} failed verification.
Issues found by reviewers:
{json.dumps(consensus_data['results'])}

Original PR Diff:
{diff}

Repo Context:
{json.dumps(context)}

Please REVISE the implementation to address all issues.
Return ONLY valid JSON matching the write_code schema.
"""
        res = await gemini_svc.generate(prompt, gemini_svc.MODEL_PRO, system_prompt=gemini_svc.SYSTEM_PROMPT_ENGINEER, json_mode=True)
        revision = json.loads(res)
        
        branch_name = pr_data["head"]["ref"]
        
        # Apply revised changes to the SAME branch
        for f in revision.get("files_to_create", []):
            await github_svc.create_or_update_file(full_name, f["path"], f["content"], f"fix: revised {f['path']}", branch_name)
        for f in revision.get("files_to_modify", []):
            await github_svc.create_or_update_file(full_name, f["path"], f["modified_content"], f"fix: revised {f['path']}", branch_name)
            
        comment = "🔁 ContriBot has revised the implementation based on verification feedback. Re-running verification..."
        await github_svc.add_issue_comment(full_name, github_pr_number, comment)
        
        # Re-enqueue verification
        await self.enqueue_task(item.repo_id, "verify_pr", {"pr_id": pr_id, "github_pr_number": github_pr_number}, TaskPriority.HIGH)

    async def _handle_fix_ci(self, item: QueueItem):
        github_pr_number = item.input_data.get("github_pr_number")
        check_run_id = item.input_data.get("check_run_id")
        
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        
        # Get PR and diff
        pr_data = await github_svc.get_pull_request(full_name, github_pr_number)
        branch_name = pr_data["head"]["ref"]
        
        # Only fix CI for ContriBot's own PRs
        if not branch_name.startswith("contribot/"):
            logger.info(f"Skipping CI fix for PR #{github_pr_number} as it was not created by ContriBot.")
            return
            
        diff = await github_svc.get_pr_diff(full_name, github_pr_number)
        context = await repo_context_service.get_context(item.repo_id, full_name)
        
        # Get CI logs
        ci_logs = await github_svc.get_check_run_logs(full_name, check_run_id)
        
        # Gemini 3.1 Pro fixes the CI failure
        prompt = f"""
Your implementation for PR #{github_pr_number} failed CI checks.
CI Failure Logs:
{ci_logs}

Original PR Diff:
{diff}

Repo Context:
{json.dumps(context)}

Please FIX the implementation to resolve the CI failure.
Return ONLY valid JSON matching the write_code schema.
"""
        res = await gemini_svc.generate(prompt, gemini_svc.MODEL_PRO, system_prompt=gemini_svc.SYSTEM_PROMPT_ENGINEER, json_mode=True)
        plan = json.loads(res)
        
        # Apply changes
        for f in plan.get("files_to_create", []):
            await github_svc.create_or_update_file(full_name, f["path"], f["content"], f"fix: CI failure - create {f['path']}", branch_name)
        for f in plan.get("files_to_modify", []):
            await github_svc.create_or_update_file(full_name, f["path"], f["modified_content"], f"fix: CI failure - update {f['path']}", branch_name)
        for path in plan.get("files_to_delete", []):
            try:
                repo_obj = github_svc.client.get_repo(full_name)
                contents = repo_obj.get_contents(path, ref=branch_name)
                repo_obj.delete_file(path, f"fix: CI failure - delete {path}", contents.sha, branch=branch_name)
            except Exception:
                pass
            
        comment = "🔁 ContriBot has analyzed the CI failure and pushed a fix. Re-running checks..."
        await github_svc.add_issue_comment(full_name, github_pr_number, comment)
        
        # Re-enqueue verification if needed, or let the next CI run trigger it
        # We don't need to re-enqueue verify_pr here because the push will trigger a new CI run,
        # and if it passes, we might want to verify. But wait, PR verification doesn't wait for CI.
        # Let's just re-enqueue verify_pr.
        prs = await db.get_prs_by_repo(item.repo_id)
        db_pr = next((p for p in prs if p.get("github_pr_number") == github_pr_number), None)
        if db_pr:
            await self.enqueue_task(item.repo_id, "verify_pr", {"pr_id": db_pr["id"], "github_pr_number": github_pr_number}, TaskPriority.HIGH)

    async def _handle_pr_merged(self, item: QueueItem):
        github_pr_number = item.input_data.get("github_pr_number")
        
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        
        # Update PR status in DB
        prs = await db.get_prs_by_repo(item.repo_id)
        db_pr = next((p for p in prs if p.get("github_pr_number") == github_pr_number), None)
        if db_pr:
            await db.update_pr(db_pr["id"], {"status": "merged"})
            if db_pr.get("issue_id"):
                await db.update_issue(db_pr["issue_id"], {"status": "resolved"})
                
        # Trigger release check
        await self.enqueue_task(item.repo_id, "release", {}, TaskPriority.HIGH)

    async def _handle_release(self, item: QueueItem):
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        repo_prefix = f"[REPO: {full_name}]"
        
        logger.info(f"[TASK]{repo_prefix} Checking for new release...")
        # 1. Get latest release tag
        latest_release = await github_svc.get_latest_release(full_name)
        since_date = latest_release.get("published_at") if latest_release else None
        
        # 2. Get ALL commits since last release tag
        # Using the underlying PyGithub client
        gh_repo = github_svc.client.get_repo(full_name)
        
        def _get_commits():
            if since_date:
                from datetime import datetime
                # PyGithub expects a datetime object
                dt = datetime.fromisoformat(since_date.replace('Z', '+00:00'))
                return list(gh_repo.get_commits(since=dt))
            else:
                return list(gh_repo.get_commits())[:20] # Limit if no previous release
                
        commits = await github_svc._run_async(_get_commits)
        
        if not commits:
            logger.info(f"[TASK]{repo_prefix} No commits found for release.")
            return
            
        # 3. Analyze commit messages for version bump type
        commit_messages = [c.commit.message for c in commits]
        
        bump_type = "patch"
        for msg in commit_messages:
            msg_lower = msg.lower()
            if "breaking change" in msg_lower or "major" in msg_lower:
                bump_type = "major"
                break
            elif "feat" in msg_lower or "minor" in msg_lower:
                bump_type = "minor"
                
        # Determine new version
        current_version = repo.get("current_version", "v0.0.0").lstrip("v")
        parts = [int(x) for x in current_version.split(".")]
        if len(parts) != 3:
            parts = [0, 0, 0]
            
        if bump_type == "major":
            parts[0] += 1
            parts[1] = 0
            parts[2] = 0
        elif bump_type == "minor":
            parts[1] += 1
            parts[2] = 0
        else:
            parts[2] += 1
            
        new_version = f"v{parts[0]}.{parts[1]}.{parts[2]}"
        logger.info(f"[TASK]{repo_prefix} Release analysis: bump_type={bump_type}, new_version={new_version}")
        
        # 4. Create release
        release_notes = "## Changes\n" + "\n".join([f"- {msg.split(chr(10))[0]}" for msg in commit_messages])
        
        release_url = await github_svc.create_release(
            full_name=full_name,
            tag=new_version,
            name=f"Release {new_version}",
            body=release_notes
        )
        
        # 5. Update CHANGELOG.md
        try:
            changelog_content = await github_svc.get_file_content(full_name, "CHANGELOG.md")
        except Exception:
            changelog_content = "# Changelog\n\n"
            
        new_changelog = f"# Changelog\n\n## {new_version}\n{release_notes}\n\n" + changelog_content.replace("# Changelog\n\n", "")
        
        repo_data = await github_svc.get_repo(full_name)
        default_branch = repo_data.get("default_branch", "main")
        
        await github_svc.create_or_update_file(
            full_name=full_name,
            path="CHANGELOG.md",
            content=new_changelog,
            message=f"chore: update CHANGELOG for {new_version}",
            branch=default_branch
        )
        
        # Update DB
        await db.update_repo(item.repo_id, {"current_version": new_version})
        await db.create_release(item.repo_id, new_version, bump_type, release_notes, release_url, new_version)
        
        await self._log(item.repo_id, "release_created", f"Created release {new_version}", item.task_id, asyncio.get_event_loop().time())

    async def _handle_build_context(self, item: QueueItem):
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        start_time = asyncio.get_event_loop().time()
        
        await self._log(item.repo_id, "build_context", f"Building repository context for {full_name}. This may take a minute...", item.task_id, start_time)
        await repo_context_service.get_context(item.repo_id, full_name, force_rebuild=True)
        await self._log(item.repo_id, "build_context", f"Repository context rebuilt successfully for {full_name}.", item.task_id, start_time)

# Export singleton
orchestrator = AgentOrchestrator()
