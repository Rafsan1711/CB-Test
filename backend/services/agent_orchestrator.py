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
            logger.info(f"Enqueued task {task_id} ({task_type}) for repo {repo_id} with priority {priority.name}")
            return task_id
        except Exception as e:
            logger.error(f"Failed to enqueue task: {e}")
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

    async def handle_pr_merged(self, repo_id: str, pr_number: int):
        """Called by webhook when a PR is merged."""
        await self.enqueue_task(repo_id, "process_pr_merge", {"github_pr_number": pr_number}, TaskPriority.HIGH)

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
        
        async with self.global_semaphore:
            async with repo_sem:
                start_time = asyncio.get_event_loop().time()
                await self._log(item.repo_id, item.task_type, f"Starting task execution", item.task_id, start_time)
                
                try:
                    # Mark as running
                    await db.update_agent_task(item.task_id, "running")
                    
                    await self._execute_with_retry(item)
                    
                    await self._log(item.repo_id, item.task_type, f"Task completed successfully", item.task_id, start_time)
                except Exception as e:
                    await self._log(item.repo_id, item.task_type, f"Task failed permanently: {e}", item.task_id, start_time, "error")
                finally:
                    self.queue.task_done()

    async def _execute_with_retry(self, item: QueueItem):
        max_retries = 3
        
        for attempt in range(max_retries + 1):
            try:
                await self._route_task(item)
                # If successful, update DB and break
                await db.update_agent_task(item.task_id, "completed")
                return
                
            except Exception as e:
                error_msg = str(e).lower()
                
                # Update retry count in DB
                await db.update_agent_task(item.task_id, "running", retry_count=attempt + 1)
                
                if attempt == max_retries:
                    # Final failure
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
                    logger.error(f"Permanent GitHub 404 error for task {item.task_id}. Aborting.")
                    db.client.table("agent_tasks").update({
                        "status": "failed",
                        "error_message": "GitHub 404 Not Found",
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    }).eq("id", item.task_id).execute()
                    raise e
                    
                elif "rate limit" in error_msg or "429" in error_msg:
                    if "gemini" in error_msg:
                        wait_time = 60
                        logger.warning(f"Gemini rate limit hit. Waiting {wait_time}s before retry {attempt+1}/{max_retries}")
                    else:
                        wait_time = 300
                        logger.warning(f"GitHub API rate limit hit. Waiting {wait_time}s before retry {attempt+1}/{max_retries}")
                else:
                    # Network or other error -> exponential backoff: 30s, 60s, 120s
                    wait_time = 30 * (2 ** attempt)
                    logger.warning(f"Error executing task {item.task_id}: {e}. Waiting {wait_time}s before retry {attempt+1}/{max_retries}")
                
                await asyncio.sleep(wait_time)

    async def _route_task(self, item: QueueItem):
        if item.task_type == "analyze_issue":
            await self._handle_analyze_issue(item)
        elif item.task_type == "write_code" or item.task_type == "fix_bug" or item.task_type == "implement_feature":
            await self._handle_implement_issue(item)
        elif item.task_type == "verify_pr":
            await self._handle_verify_pr(item)
        elif item.task_type == "process_pr_merge":
            await self._handle_pr_merged(item)
        elif item.task_type == "release":
            await self._handle_release(item)
        elif item.task_type == "build_context":
            await self._handle_build_context(item)
        else:
            raise ValueError(f"Unknown task type: {item.task_type}")

    # =========================================================================
    # Task Handlers
    # =========================================================================

    async def _handle_analyze_issue(self, item: QueueItem):
        issue_id = item.input_data.get("issue_id")
        github_issue_number = item.input_data.get("github_issue_number")
        
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        
        issue_data = await github_svc.get_issue(full_name, github_issue_number)
        
        # Build focused context based on issue
        focused_context = await repo_context_service.build_focused_context(full_name, issue_data)
        
        analysis = await gemini_svc.analyze_issue(
            issue_title=issue_data.get("title", ""),
            issue_body=issue_data.get("body", ""),
            repo_context=focused_context
        )
        
        # Update issue in DB
        issue_type = analysis.get("type", "feature").lower()
        requires_approval = analysis.get("requires_approval", False)
        
        if not issue_id:
            # Create if not exists
            db_issue = await db.create_issue(item.repo_id, {
                "github_issue_number": github_issue_number,
                "title": issue_data.get("title", ""),
                "body": issue_data.get("body", ""),
                "issue_type": issue_type,
                "ai_analysis": analysis,
                "labels": analysis.get("labels", [])
            })
            issue_id = db_issue["id"]
        else:
            await db.update_issue(issue_id, {
                "issue_type": issue_type,
                "ai_analysis": analysis,
                "labels": analysis.get("labels", [])
            })
            
        # Post Webhook Comment Intelligence
        if issue_type == "bug" or not requires_approval:
            comment = f"""## 🤖 ContriBot Analysis

**Type:** 🐛 Bug  
**Priority:** 🔴 High  
**Estimated Fix Time:** ~1-2 hours

### 🔍 Root Cause Analysis
{analysis.get('reasoning', 'Based on the codebase context, this appears to be a bug requiring immediate attention.')}

### 🛠️ Fix Plan
ContriBot will analyze the affected files and generate a patch.

---
ContriBot is now implementing the fix automatically..."""
            
            await github_svc.add_issue_comment(full_name, github_issue_number, comment)
            await db.update_issue(issue_id, {"status": "approved"})
            
            # Enqueue implementation
            await self.enqueue_task(item.repo_id, "fix_bug", {"issue_id": issue_id, "github_issue_number": github_issue_number}, TaskPriority.HIGH)
            
        else:
            # Feature request
            components = ", ".join([f"`{c}`" for c in analysis.get("affected_files", [])[:3]]) or "`general`"
            comment = f"""## 🤖 ContriBot Analysis

**Type:** ✨ Feature Request  
**Priority:** 🟡 Medium  
**Estimated Complexity:** Moderate (~4-6 hours)  
**Affected Components:** {components}

### 📋 Implementation Plan
{analysis.get('reasoning', 'ContriBot will implement the requested feature based on the repository patterns.')}

### ❓ Questions for Owner
- Are there any specific design constraints?
- Should this be hidden behind a feature flag?

---
Reply **`yes`** to have ContriBot implement this, or **`no`** to close the issue."""
            
            await github_svc.add_issue_comment(full_name, github_issue_number, comment)
            await db.update_issue(issue_id, {"status": "pending_approval"})

    async def _handle_implement_issue(self, item: QueueItem):
        issue_id = item.input_data.get("issue_id")
        github_issue_number = item.input_data.get("github_issue_number")
        
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        
        # Get issue details
        issue_data = await github_svc.get_issue(full_name, github_issue_number)
        
        # Build context
        context = await repo_context_service.get_context(item.repo_id, full_name)
        
        # Generate code
        plan = await gemini_svc.generate_code(
            issue_title=issue_data.get("title", ""),
            issue_body=issue_data.get("body", ""),
            repo_context=context
        )
        
        # Create branch
        branch_name = f"contribot/issue-{github_issue_number}-{issue_data.get('title', 'fix').lower().replace(' ', '-')[:20]}"
        await github_svc.create_branch(full_name, branch_name)
        
        # Apply changes
        files_changed = 0
        for file_change in plan.get("files", []):
            await github_svc.create_or_update_file(
                full_name=full_name,
                path=file_change["path"],
                content=file_change["content"],
                message=f"Update {file_change['path']}",
                branch=branch_name
            )
            files_changed += 1
            
        # Create PR
        pr_title = f"Fix #{github_issue_number}: {issue_data.get('title')}"
        pr_body = f"Automated fix for #{github_issue_number} generated by ContriBot."
        pr_number = await github_svc.create_pull_request(full_name, pr_title, pr_body, branch_name)
        
        # Save PR to DB
        db_pr = await db.create_pr(item.repo_id, {
            "issue_id": issue_id,
            "github_pr_number": pr_number,
            "title": pr_title,
            "branch_name": branch_name,
            "status": "open",
            "verification_status": "pending"
        })
        
        # Post Post-Implementation PR Comment
        files_list = "\n".join([f"- `{f['path']}` — Updated" for f in plan.get("files", [])])
        comment = f"""## 🤖 ContriBot Implementation Complete

**Branch:** `{branch_name}`  
**Files Changed:** {files_changed} modified/created  

### 📝 Changes Made
{files_list}

### 🧪 Testing Notes
Please review the changes. The code has been generated based on existing repository patterns.

### 🔍 Verification Running...
4 AI models are now reviewing this PR. Results will be posted shortly."""
        
        await github_svc.add_issue_comment(full_name, pr_number, comment) # PRs are issues in GitHub API for comments
        await db.update_issue(issue_id, {"status": "in_progress"})
        
        # Enqueue verification
        await self.enqueue_task(item.repo_id, "verify_pr", {"pr_id": db_pr["id"], "github_pr_number": pr_number}, TaskPriority.HIGH)

    async def _handle_verify_pr(self, item: QueueItem):
        pr_id = item.input_data.get("pr_id")
        github_pr_number = item.input_data.get("github_pr_number")
        
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        
        # Get PR diff
        diff = await github_svc.get_pr_diff(full_name, github_pr_number)
        
        # Build context
        context = await repo_context_service.get_context(item.repo_id, full_name)
        
        # Verify
        verification = await gemini_svc.verify_pr(diff, context)
        
        # Update DB
        score = verification.get("score", 0)
        status = "approved" if score >= 80 else "changes_requested"
        
        await db.update_pr(pr_id, {
            "verification_status": status,
            "verification_results": verification,
            "weighted_score": score
        })
        
        # Post review comment
        review_body = f"""## 🤖 ContriBot Verification Results

**Score:** {score}/100
**Status:** {'✅ Approved' if status == 'approved' else '❌ Changes Requested'}

### 🔍 Feedback
{verification.get('feedback', 'No specific feedback provided.')}

### ⚠️ Potential Issues
{verification.get('potential_issues', 'None detected.')}
"""
        event = "APPROVE" if status == "approved" else "REQUEST_CHANGES"
        await github_svc.add_pr_review(full_name, github_pr_number, review_body, event)

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
            logger.info(f"No commits found for release in {full_name}")
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
        
        await github_svc.create_or_update_file(
            full_name=full_name,
            path="CHANGELOG.md",
            content=new_changelog,
            message=f"chore: update CHANGELOG for {new_version}",
            branch="main"
        )
        
        # Update DB
        await db.update_repo(item.repo_id, {"current_version": new_version})
        await db.create_release(item.repo_id, new_version, bump_type, release_notes, release_url, new_version)
        
        await self._log(item.repo_id, "release_created", f"Created release {new_version}", item.task_id, asyncio.get_event_loop().time())

    async def _handle_build_context(self, item: QueueItem):
        repo = await db.get_repo_by_id(item.repo_id)
        full_name = repo["github_full_name"]
        await repo_context_service.get_context(item.repo_id, full_name, force_rebuild=True)
        await self._log(item.repo_id, "context_built", "Full repository context rebuilt successfully", item.task_id, asyncio.get_event_loop().time())

# Export singleton
orchestrator = AgentOrchestrator()
