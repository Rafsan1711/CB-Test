import asyncio
import logging
from typing import List, Dict, Any
from services.github_service import github_svc
from services.gemini_service import gemini_svc
from services.supabase_service import db

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    
    async def _get_basic_repo_context(self, full_name: str) -> dict:
        """Helper to get basic repo context for Gemini."""
        repo_data = await github_svc.get_repo(full_name)
        try:
            tree_data = await github_svc.get_repo_tree(full_name)
            # Get top 5 files just as a sample
            files = [t["path"] for t in tree_data.get("tree", []) if t["type"] == "blob"][:5]
        except Exception:
            files = []
            
        return {
            "full_name": repo_data.get("full_name"),
            "description": repo_data.get("description"),
            "language": repo_data.get("language"),
            "top_files": files
        }

    async def process_new_issue(self, repo_id: str, github_issue_number: int):
        try:
            repo = await db.get_repo_by_id(repo_id)
            if not repo:
                raise ValueError(f"Repo {repo_id} not found")
                
            full_name = repo["github_full_name"]
            issue_data = await github_svc.get_issue(full_name, github_issue_number)
            
            repo_context = await self._get_basic_repo_context(full_name)
            
            analysis = await gemini_svc.analyze_issue(
                issue_title=issue_data.get("title", ""),
                issue_body=issue_data.get("body", ""),
                repo_context=repo_context
            )
            
            # Find the issue in DB to update it
            issues = await db.get_issues_by_repo(repo_id)
            db_issue = next((i for i in issues if i.get("github_issue_number") == github_issue_number), None)
            
            if not db_issue:
                # If webhook didn't create it yet, create it now
                db_issue = await db.create_issue(repo_id, {
                    "github_issue_number": github_issue_number,
                    "title": issue_data.get("title", ""),
                    "body": issue_data.get("body", ""),
                    "issue_type": analysis.get("type"),
                    "ai_analysis": analysis,
                    "labels": analysis.get("labels", [])
                })
            else:
                await db.update_issue(db_issue["id"], {
                    "issue_type": analysis.get("type"),
                    "ai_analysis": analysis,
                    "labels": analysis.get("labels", [])
                })
                
            requires_approval = analysis.get("requires_approval", False)
            issue_type = analysis.get("type", "").lower()
            
            if requires_approval and issue_type == "feature":
                comment = "🤖 ContriBot has analyzed this feature request. Awaiting owner approval. Reply **yes** to implement or **no** to close."
                await github_svc.add_issue_comment(full_name, github_issue_number, comment)
                await db.update_issue(db_issue["id"], {"status": "pending_approval"})
                await db.log_activity(repo_id, "issue_analyzed", f"Analyzed issue #{github_issue_number} (Feature, awaiting approval)")
            else:
                await db.create_agent_task(repo_id, "write_code", {"issue_id": db_issue["id"]})
                await db.update_issue(db_issue["id"], {"status": "approved"})
                await db.log_activity(repo_id, "bug_auto_approved", f"Auto-approved issue #{github_issue_number} ({issue_type})")
                
                # Trigger queue processing
                asyncio.create_task(self.process_agent_queue(repo_id))
                
        except Exception as e:
            logger.error(f"Error in process_new_issue: {e}")
            await db.log_activity(repo_id, "error", f"Failed to process new issue #{github_issue_number}: {str(e)}", severity="error")

    async def handle_user_response(self, repo_id: str, issue_id: str, response: str):
        try:
            repo = await db.get_repo_by_id(repo_id)
            if not repo:
                raise ValueError(f"Repo {repo_id} not found")
                
            full_name = repo["github_full_name"]
            
            issues = await db.get_issues_by_repo(repo_id)
            issue = next((i for i in issues if i["id"] == issue_id), None)
            if not issue:
                raise ValueError(f"Issue {issue_id} not found")
                
            github_issue_number = issue.get("github_issue_number")
            response = response.strip().lower()
            
            if response == "yes":
                await db.update_issue(issue_id, {"user_response": "yes", "status": "approved"})
                await db.create_agent_task(repo_id, "write_code", {"issue_id": issue_id})
                
                comment = "✅ Approved! ContriBot is now implementing this feature..."
                await github_svc.add_issue_comment(full_name, github_issue_number, comment)
                await db.log_activity(repo_id, "feature_approved", f"Owner approved feature #{github_issue_number}")
                
                # Trigger queue processing
                asyncio.create_task(self.process_agent_queue(repo_id))
                
            elif response == "no":
                await db.update_issue(issue_id, {"user_response": "no", "status": "rejected"})
                
                comment = "❌ Feature request declined by owner. Closing this issue."
                await github_svc.close_issue(full_name, github_issue_number, comment)
                await db.log_activity(repo_id, "feature_rejected", f"Owner rejected feature #{github_issue_number}")
                
        except Exception as e:
            logger.error(f"Error in handle_user_response: {e}")
            await db.log_activity(repo_id, "error", f"Failed to handle user response for issue {issue_id}: {str(e)}", severity="error")

    async def process_agent_queue(self, repo_id: str):
        try:
            tasks = await db.get_pending_tasks(repo_id)
            # Filter only queued tasks and sort by created_at (FIFO)
            queued_tasks = [t for t in tasks if t.get("status") == "queued"]
            queued_tasks.sort(key=lambda x: x.get("created_at", ""))
            
            for task in queued_tasks:
                task_type = task.get("task_type")
                
                if task_type == "write_code":
                    await self.execute_write_code_task(task)
                elif task_type == "verify_pr":
                    await self.execute_verify_pr_task(task)
                elif task_type == "release":
                    # For release, we need to gather merged PRs. 
                    # This is a simplified extraction.
                    input_data = task.get("input_data", {})
                    merged_pr_numbers = input_data.get("merged_pr_numbers", [])
                    await self.execute_release_task(task, merged_pr_numbers)
                else:
                    await db.update_agent_task(task["id"], "failed", error_message=f"Unknown task type: {task_type}")
                    
        except Exception as e:
            logger.error(f"Error in process_agent_queue: {e}")
            await db.log_activity(repo_id, "error", f"Queue processing failed: {str(e)}", severity="error")

    async def execute_write_code_task(self, task: dict):
        repo_id = task["repo_id"]
        try:
            await db.update_agent_task(task["id"], "running")
            
            repo = await db.get_repo_by_id(repo_id)
            full_name = repo["github_full_name"]
            
            issue_id = task.get("input_data", {}).get("issue_id")
            issues = await db.get_issues_by_repo(repo_id)
            issue = next((i for i in issues if i["id"] == issue_id), None)
            
            if not issue:
                raise ValueError(f"Issue {issue_id} not found for task {task['id']}")
                
            github_issue_number = issue.get("github_issue_number")
            
            # Build comprehensive repo context
            repo_data = await github_svc.get_repo(full_name)
            tree_data = await github_svc.get_repo_tree(full_name)
            
            # In a real app, we'd use embeddings/search to find relevant files.
            # Here we just pass the tree and let Gemini decide, or fetch a few files.
            # For simplicity, we'll just pass the tree.
            repo_context = {
                "full_name": full_name,
                "description": repo_data.get("description"),
                "main_language": repo_data.get("language"),
                "file_tree": tree_data.get("tree", []),
                "relevant_files": {} # Placeholder for actual file contents
            }
            
            issue_payload = {
                "title": issue.get("title"),
                "body": issue.get("body"),
                "type": issue.get("issue_type")
            }
            
            # Generate code
            code_plan = await gemini_svc.write_code_for_issue(repo_context, issue_payload)
            
            # Create branch
            branch_name = code_plan.get("branch_name", f"contribot/issue-{github_issue_number}")
            await github_svc.create_branch(full_name, branch_name)
            
            # Apply changes
            for f in code_plan.get("files_to_create", []):
                await github_svc.create_or_update_file(
                    full_name, f["path"], f["content"], f"Create {f['path']}", branch_name
                )
                
            for f in code_plan.get("files_to_modify", []):
                await github_svc.create_or_update_file(
                    full_name, f["path"], f["modified"], f"Update {f['path']}", branch_name
                )
                
            # Create PR
            pr_number = await github_svc.create_pull_request(
                full_name, 
                title=code_plan.get("pr_title", f"Fix issue #{github_issue_number}"),
                body=code_plan.get("pr_body", f"Resolves #{github_issue_number}"),
                head=branch_name
            )
            
            # Save PR to DB
            pr_record = await db.create_pr(repo_id, {
                "issue_id": issue_id,
                "github_pr_number": pr_number,
                "title": code_plan.get("pr_title"),
                "branch_name": branch_name,
                "status": "open",
                "verification_status": "pending"
            })
            
            await db.update_issue(issue_id, {"status": "in_progress"})
            
            # Queue verification task
            await db.create_agent_task(repo_id, "verify_pr", {"pr_id": pr_record["id"]})
            
            await db.log_activity(repo_id, "code_written", f"Generated code for issue #{github_issue_number}")
            await db.log_activity(repo_id, "pr_opened", f"Opened PR #{pr_number} for issue #{github_issue_number}")
            
            await db.update_agent_task(task["id"], "completed", output_data={"pr_number": pr_number})
            
        except Exception as e:
            logger.error(f"Error in execute_write_code_task: {e}")
            await db.update_agent_task(task["id"], "failed", error_message=str(e))
            await db.log_activity(repo_id, "error", f"Code writing task failed: {str(e)}", severity="error")

    async def execute_verify_pr_task(self, task: dict):
        repo_id = task["repo_id"]
        try:
            await db.update_agent_task(task["id"], "running")
            
            repo = await db.get_repo_by_id(repo_id)
            full_name = repo["github_full_name"]
            
            pr_id = task.get("input_data", {}).get("pr_id")
            prs = await db.get_prs_by_repo(repo_id)
            pr = next((p for p in prs if p["id"] == pr_id), None)
            
            if not pr:
                raise ValueError(f"PR {pr_id} not found")
                
            github_pr_number = pr.get("github_pr_number")
            
            diff = await github_svc.get_pr_diff(full_name, github_pr_number)
            repo_context = await self._get_basic_repo_context(full_name)
            
            github_pr = await github_svc.get_pull_request(full_name, github_pr_number)
            
            consensus = await gemini_svc.verify_pr_multimodel(
                diff=diff,
                pr_title=github_pr.get("title", ""),
                pr_body=github_pr.get("body", ""),
                repo_context=repo_context
            )
            
            # Save results
            await db.update_pr(pr_id, {
                "verification_results": consensus.model_dump(),
                "consensus_score": consensus.consensus_score,
                "verification_status": "passed" if consensus.safe_to_merge else "failed"
            })
            
            if consensus.safe_to_merge:
                review_body = f"✅ **ContriBot Verification Passed** (Consensus: {consensus.consensus_score}/4)\n\nThis PR has been reviewed by 4 independent AI models and is safe to merge. @owner please review and merge when ready.\n\n**Summary:**\n{consensus.summary}"
                await github_svc.add_pr_review(full_name, github_pr_number, review_body, event="APPROVE")
                await db.log_activity(repo_id, "pr_verified", f"PR #{github_pr_number} passed verification")
            else:
                issues_list = "\n".join([f"- {i}" for r in consensus.results for i in r.issues_found])
                review_body = f"❌ **ContriBot Verification Failed** (Consensus: {consensus.consensus_score}/4)\n\nThis PR requires changes before merging.\n\n**Issues Found:**\n{issues_list}\n\n**Summary:**\n{consensus.summary}"
                await github_svc.add_pr_review(full_name, github_pr_number, review_body, event="REQUEST_CHANGES")
                await db.log_activity(repo_id, "pr_needs_work", f"PR #{github_pr_number} failed verification", severity="warning")
                
            await db.update_agent_task(task["id"], "completed", output_data=consensus.model_dump())
            
        except Exception as e:
            logger.error(f"Error in execute_verify_pr_task: {e}")
            await db.update_agent_task(task["id"], "failed", error_message=str(e))
            await db.log_activity(repo_id, "error", f"PR verification task failed: {str(e)}", severity="error")

    async def execute_release_task(self, task: dict, merged_pr_numbers: list[int]):
        repo_id = task["repo_id"]
        try:
            await db.update_agent_task(task["id"], "running")
            
            repo = await db.get_repo_by_id(repo_id)
            full_name = repo["github_full_name"]
            current_version = repo.get("current_version", "v0.0.0")
            
            pr_titles = []
            commit_messages = []
            
            changes = []
            
            for pr_num in merged_pr_numbers:
                pr_data = await github_svc.get_pull_request(full_name, pr_num)
                pr_titles.append(pr_data.get("title", ""))
                # In a real scenario, we'd fetch commits for the PR.
                # For now, we'll just use the PR body as a proxy for commit messages.
                commit_messages.append(pr_data.get("body", ""))
                
                changes.append({
                    "type": "pull_request",
                    "title": pr_data.get("title", ""),
                    "pr_number": pr_num
                })
                
            bump_info = await gemini_svc.determine_version_bump(pr_titles, commit_messages, current_version)
            new_version = bump_info.get("new_version")
            bump_type = bump_info.get("bump_type")
            
            release_notes = await gemini_svc.generate_release_notes(new_version, changes, full_name)
            
            release_url = await github_svc.create_release(
                full_name, 
                tag=new_version, 
                name=f"Release {new_version}", 
                body=release_notes
            )
            
            await db.update_repo(repo_id, {"current_version": new_version})
            
            await db.create_release(repo_id, new_version, bump_type, release_notes, release_url, new_version)
            
            await db.log_activity(repo_id, "release_published", f"Published release {new_version}")
            
            await db.update_agent_task(task["id"], "completed", output_data={"version": new_version, "url": release_url})
            
        except Exception as e:
            logger.error(f"Error in execute_release_task: {e}")
            await db.update_agent_task(task["id"], "failed", error_message=str(e))
            await db.log_activity(repo_id, "error", f"Release task failed: {str(e)}", severity="error")

    async def handle_pr_merged(self, repo_id: str, pr_number: int):
        try:
            prs = await db.get_prs_by_repo(repo_id)
            pr = next((p for p in prs if p.get("github_pr_number") == pr_number), None)
            
            if pr:
                await db.update_pr(pr["id"], {"status": "merged"})
                
                # If this PR was linked to an issue, mark the issue as resolved
                issue_id = pr.get("issue_id")
                if issue_id:
                    await db.update_issue(issue_id, {"status": "resolved"})
            
            # In a real app, we might check if enough PRs are merged to warrant a release,
            # or if this PR was a specific trigger. For now, we'll just queue a release task
            # with this single PR as the trigger.
            await db.create_agent_task(repo_id, "release", {"merged_pr_numbers": [pr_number]})
            
            # Trigger queue processing
            asyncio.create_task(self.process_agent_queue(repo_id))
            
        except Exception as e:
            logger.error(f"Error in handle_pr_merged: {e}")
            await db.log_activity(repo_id, "error", f"Failed to handle merged PR #{pr_number}: {str(e)}", severity="error")

orchestrator = AgentOrchestrator()
