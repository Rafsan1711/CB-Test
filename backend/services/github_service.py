import asyncio
import hmac
import hashlib
import httpx
import logging
from typing import Optional, List, Dict, Any
from github import Github, GithubException
from fastapi import HTTPException
from config import settings

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self):
        # Initialize PyGithub with the ContriBot token
        self.client = Github(settings.GITHUB_TOKEN)
        logger.info("[GITHUB] Initialized GitHubService")

    async def _run_async(self, func, *args, **kwargs):
        """Helper to run blocking PyGithub calls in a thread pool."""
        loop = asyncio.get_running_loop()
        try:
            return await loop.run_in_executor(None, lambda: func(*args, **kwargs))
        except GithubException as e:
            if isinstance(e.data, dict):
                detail = e.data.get("message") or str(e)
            else:
                detail = str(e.data) if e.data else str(e)
            
            # Log rate limit specifically
            if e.status == 403 and "rate limit" in detail.lower():
                logger.warning(f"[GITHUB] Rate limit exceeded: {detail}")
            elif e.status != 404: # Don't log 404s as errors if they are expected
                logger.error(f"[GITHUB] API Error ({e.status}): {detail}")
                
            raise HTTPException(status_code=e.status, detail=detail)
        except Exception as e:
            logger.error(f"[GITHUB] Unexpected error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # --- Repository Operations ---

    async def get_repo(self, full_name: str) -> dict:
        logger.debug(f"[GITHUB][REPO: {full_name}] Fetching repo data")
        repo = await self._run_async(self.client.get_repo, full_name)
        return repo.raw_data

    async def get_repo_tree(self, full_name: str) -> dict:
        logger.debug(f"[GITHUB][REPO: {full_name}] Fetching recursive tree")
        def _get_tree():
            repo = self.client.get_repo(full_name)
            branch = repo.get_branch(repo.default_branch)
            tree = repo.get_git_tree(branch.commit.sha, recursive=True)
            return {"tree": [{"path": t.path, "type": t.type, "sha": t.sha} for t in tree.tree]}
        return await self._run_async(_get_tree)

    async def get_file_content(self, full_name: str, path: str) -> str:
        logger.debug(f"[GITHUB][REPO: {full_name}] Fetching file content: {path}")
        def _get_content():
            repo = self.client.get_repo(full_name)
            contents = repo.get_contents(path)
            # Handle case where path is a directory
            if isinstance(contents, list):
                raise Exception(f"Path {path} is a directory, not a file.")
            return contents.decoded_content.decode("utf-8")
        return await self._run_async(_get_content)

    async def file_exists(self, full_name: str, path: str, branch: str = None) -> bool:
        logger.debug(f"[GITHUB][REPO: {full_name}] Checking if file exists: {path} (branch: {branch})")
        def _check_exists():
            repo = self.client.get_repo(full_name)
            try:
                repo.get_contents(path, ref=branch) if branch else repo.get_contents(path)
                return True
            except GithubException as e:
                if e.status == 404:
                    return False
                raise e
        return await self._run_async(_check_exists)

    async def create_or_update_file(self, full_name: str, path: str, content: str, message: str, branch: str) -> dict:
        logger.info(f"[GITHUB][REPO: {full_name}] Committing file {path} to branch {branch}")
        def _commit_file():
            repo = self.client.get_repo(full_name)
            try:
                contents = repo.get_contents(path, ref=branch)
                logger.debug(f"[GITHUB][REPO: {full_name}] Updating existing file {path}")
                res = repo.update_file(contents.path, message, content, contents.sha, branch=branch)
                return res["commit"].raw_data
            except GithubException as e:
                if e.status == 404:
                    logger.debug(f"[GITHUB][REPO: {full_name}] Creating new file {path}")
                    res = repo.create_file(path, message, content, branch=branch)
                    return res["commit"].raw_data
                raise e
        return await self._run_async(_commit_file)

    async def create_branch(self, full_name: str, branch_name: str, from_branch: Optional[str] = None) -> dict:
        logger.info(f"[GITHUB][REPO: {full_name}] Creating branch {branch_name} from {from_branch or 'default'}")
        def _create_branch():
            repo = self.client.get_repo(full_name)
            base = from_branch or repo.default_branch
            source_branch = repo.get_branch(base)
            try:
                ref = repo.create_git_ref(ref=f"refs/heads/{branch_name}", sha=source_branch.commit.sha)
                logger.info(f"[GITHUB][REPO: {full_name}] Branch {branch_name} created")
                return {"ref": ref.ref, "url": ref.url}
            except GithubException as e:
                if e.status == 422 and "Reference already exists" in str(e.data):
                    logger.info(f"[GITHUB][REPO: {full_name}] Branch {branch_name} already exists")
                    ref = repo.get_git_ref(f"heads/{branch_name}")
                    return {"ref": ref.ref, "url": ref.url}
                raise e
        return await self._run_async(_create_branch)

    async def delete_branch(self, full_name: str, branch_name: str) -> dict:
        def _delete_branch():
            repo = self.client.get_repo(full_name)
            ref = repo.get_git_ref(f"heads/{branch_name}")
            ref.delete()
            return {"status": "deleted", "branch": branch_name}
        return await self._run_async(_delete_branch)

    # --- Issue Operations ---

    async def create_issue(self, full_name: str, title: str, body: str, labels: list[str] = []) -> int:
        logger.info(f"[GITHUB][REPO: {full_name}] Creating issue: {title}")
        def _create_issue():
            repo = self.client.get_repo(full_name)
            issue = repo.create_issue(title=title, body=body, labels=labels)
            logger.info(f"[GITHUB][REPO: {full_name}] Issue #{issue.number} created")
            return issue.number
        return await self._run_async(_create_issue)

    async def close_issue(self, full_name: str, issue_number: int, comment: str = None) -> dict:
        logger.info(f"[GITHUB][REPO: {full_name}] Closing issue #{issue_number}")
        def _close_issue():
            repo = self.client.get_repo(full_name)
            issue = repo.get_issue(number=issue_number)
            if comment:
                logger.debug(f"[GITHUB][REPO: {full_name}] Adding closing comment to #{issue_number}")
                issue.create_comment(comment)
            issue.edit(state="closed")
            return issue.raw_data
        return await self._run_async(_close_issue)

    async def get_issue(self, full_name: str, issue_number: int) -> dict:
        logger.debug(f"[GITHUB][REPO: {full_name}] Fetching issue #{issue_number}")
        def _get_issue():
            repo = self.client.get_repo(full_name)
            issue = repo.get_issue(number=issue_number)
            return issue.raw_data
        return await self._run_async(_get_issue)

    async def add_issue_comment(self, full_name: str, issue_number: int, body: str) -> dict:
        logger.info(f"[GITHUB][REPO: {full_name}] Adding comment to issue #{issue_number}")
        def _add_comment():
            repo = self.client.get_repo(full_name)
            issue = repo.get_issue(number=issue_number)
            comment = issue.create_comment(body)
            return comment.raw_data
        return await self._run_async(_add_comment)

    async def get_issue_comments(self, full_name: str, issue_number: int) -> list[dict]:
        logger.debug(f"[GITHUB][REPO: {full_name}] Fetching comments for issue #{issue_number}")
        def _get_comments():
            repo = self.client.get_repo(full_name)
            issue = repo.get_issue(number=issue_number)
            return [c.raw_data for c in issue.get_comments()]
        return await self._run_async(_get_comments)

    async def list_open_issues(self, full_name: str) -> list[dict]:
        logger.debug(f"[GITHUB][REPO: {full_name}] Listing open issues")
        def _list_issues():
            repo = self.client.get_repo(full_name)
            return [i.raw_data for i in repo.get_issues(state="open")]
        return await self._run_async(_list_issues)

    # --- Pull Request Operations ---

    async def create_pull_request(self, full_name: str, title: str, body: str, head: str, base: Optional[str] = None) -> int:
        logger.info(f"[GITHUB][REPO: {full_name}] Creating Pull Request: {title} (head: {head})")
        def _create_pr():
            repo = self.client.get_repo(full_name)
            target_base = base or repo.default_branch
            try:
                pr = repo.create_pull(title=title, body=body, head=head, base=target_base)
                logger.info(f"[GITHUB][REPO: {full_name}] PR #{pr.number} created")
                return pr.number
            except GithubException as e:
                if e.status == 422 and "A pull request already exists" in str(e.data):
                    # Find the existing PR
                    logger.info(f"[GITHUB][REPO: {full_name}] PR already exists for {head}, finding it...")
                    prs = repo.get_pulls(state="open", head=f"{repo.owner.login}:{head}", base=target_base)
                    for pr in prs:
                        logger.info(f"[GITHUB][REPO: {full_name}] Found existing PR #{pr.number}")
                        return pr.number
                raise e
        return await self._run_async(_create_pr)

    async def get_pull_request(self, full_name: str, pr_number: int) -> dict:
        logger.debug(f"[GITHUB][REPO: {full_name}] Fetching PR #{pr_number}")
        def _get_pr():
            repo = self.client.get_repo(full_name)
            pr = repo.get_pull(pr_number)
            return pr.raw_data
        return await self._run_async(_get_pr)

    async def add_pr_review(self, full_name: str, pr_number: int, body: str, event: str = "COMMENT") -> dict:
        logger.info(f"[GITHUB][REPO: {full_name}] Adding PR review to #{pr_number} (event: {event})")
        def _add_review():
            repo = self.client.get_repo(full_name)
            pr = repo.get_pull(pr_number)
            review = pr.create_review(body=body, event=event)
            return review.raw_data
        return await self._run_async(_add_review)

    async def list_pr_files(self, full_name: str, pr_number: int) -> list[dict]:
        logger.debug(f"[GITHUB][REPO: {full_name}] Listing files for PR #{pr_number}")
        def _list_files():
            repo = self.client.get_repo(full_name)
            pr = repo.get_pull(pr_number)
            return [{"filename": f.filename, "status": f.status, "patch": f.patch, "additions": f.additions, "deletions": f.deletions} for f in pr.get_files()]
        return await self._run_async(_list_files)

    async def get_pr_diff(self, full_name: str, pr_number: int) -> str:
        logger.debug(f"[GITHUB][REPO: {full_name}] Fetching diff for PR #{pr_number}")
        # Using httpx to get the raw diff string directly from GitHub API
        url = f"https://api.github.com/repos/{full_name}/pulls/{pr_number}"
        headers = {
            "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3.diff"
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.error(f"[GITHUB][REPO: {full_name}] Failed to fetch PR diff for #{pr_number}: {resp.status_code}")
                raise HTTPException(status_code=resp.status_code, detail="Failed to fetch PR diff")
            return resp.text

    async def get_check_run_logs(self, full_name: str, check_run_id: int) -> str:
        logger.debug(f"[GITHUB][REPO: {full_name}] Fetching check run logs for {check_run_id}")
        url = f"https://api.github.com/repos/{full_name}/check-runs/{check_run_id}"
        headers = {
            "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.error(f"[GITHUB][REPO: {full_name}] Failed to fetch check run details for {check_run_id}: {resp.status_code}")
                return "Failed to fetch check run details."
            data = resp.json()
            output = data.get("output", {})
            title = output.get("title", "No Title")
            summary = output.get("summary", "No Summary")
            text = output.get("text", "No Text")
            return f"Title: {title}\nSummary: {summary}\nText: {text}"

    # --- Webhook Operations ---

    async def register_webhook(self, full_name: str, webhook_url: str, secret: str) -> int:
        logger.info(f"[GITHUB][REPO: {full_name}] Registering webhook to {webhook_url}")
        def _register_hook():
            repo = self.client.get_repo(full_name)
            config = {
                "url": webhook_url,
                "content_type": "json",
                "secret": secret
            }
            events = ["issues", "pull_request", "issue_comment", "push", "release", "check_run"]
            hook = repo.create_hook("web", config, events, active=True)
            logger.info(f"[GITHUB][REPO: {full_name}] Webhook registered with ID {hook.id}")
            return hook.id
        return await self._run_async(_register_hook)

    async def delete_webhook(self, full_name: str, hook_id: int) -> dict:
        logger.info(f"[GITHUB][REPO: {full_name}] Deleting webhook {hook_id}")
        def _delete_hook():
            repo = self.client.get_repo(full_name)
            hook = repo.get_hook(hook_id)
            hook.delete()
            return {"status": "deleted", "hook_id": hook_id}
        return await self._run_async(_delete_hook)

    def verify_webhook_signature(self, payload: bytes, signature: str, secret: str) -> bool:
        if not signature or not secret:
            logger.warning("[GITHUB] Missing signature or secret for webhook verification")
            return False
        expected_signature = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        result = hmac.compare_digest(expected_signature, signature)
        if not result:
            logger.warning("[GITHUB] Webhook signature mismatch")
        return result

    # --- Release Operations ---

    async def create_release(self, full_name: str, tag: str, name: str, body: str, draft: bool = False) -> str:
        logger.info(f"[GITHUB][REPO: {full_name}] Creating release {tag}: {name}")
        def _create_release():
            repo = self.client.get_repo(full_name)
            release = repo.create_git_release(tag=tag, name=name, message=body, draft=draft)
            logger.info(f"[GITHUB][REPO: {full_name}] Release created: {release.html_url}")
            return release.html_url
        return await self._run_async(_create_release)

    async def get_latest_release(self, full_name: str) -> dict | None:
        logger.debug(f"[GITHUB][REPO: {full_name}] Fetching latest release")
        def _get_latest():
            repo = self.client.get_repo(full_name)
            try:
                release = repo.get_latest_release()
                return release.raw_data
            except GithubException as e:
                if e.status == 404:
                    logger.debug(f"[GITHUB][REPO: {full_name}] No latest release found (404)")
                    return None
                raise e
        return await self._run_async(_get_latest)

    async def get_all_tags(self, full_name: str) -> list[str]:
        logger.debug(f"[GITHUB][REPO: {full_name}] Listing all tags")
        def _get_tags():
            repo = self.client.get_repo(full_name)
            return [tag.name for tag in repo.get_tags()]
        return await self._run_async(_get_tags)

github_svc = GitHubService()
