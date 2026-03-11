import asyncio
import json
import logging
import datetime
from datetime import timezone, timedelta
from typing import List, Dict, Any, Optional

from services.github_service import github_svc
from services.gemini_service import gemini_svc
from services.supabase_service import db

logger = logging.getLogger(__name__)

class RepoContextService:
    def __init__(self):
        self.max_depth = 4

    async def get_context(self, repo_id: str, full_name: str, force_rebuild: bool = False) -> Dict[str, Any]:
        """Gets context, rebuilding if stale or forced."""
        repo = await db.get_repo_by_id(repo_id)
        # Use settings as fallback if specific columns are missing
        settings = repo.get("settings") or {}
        last_built = repo.get("last_context_built_at") or settings.get("last_context_built_at")
        
        needs_rebuild = force_rebuild
        if not needs_rebuild and last_built:
            last_built_dt = datetime.datetime.fromisoformat(last_built.replace('Z', '+00:00'))
            if datetime.datetime.now(timezone.utc) - last_built_dt > timedelta(hours=24):
                needs_rebuild = True
        elif not last_built:
            needs_rebuild = True
                
        if needs_rebuild:
            logger.info(f"Building fresh context for {full_name}")
            context = await self.build_full_context(full_name)
            
            # Save summary to DB
            summary = {
                "file_count": context.get("total_files", 0),
                "main_language": context.get("metadata", {}).get("language", "Unknown"),
                "tech_stack": list(context.get("tech_stack", {}).values()),
                "summary": context.get("context_summary", "")
            }
            
            now_iso = datetime.datetime.now(timezone.utc).isoformat()
            
            # Update settings as well to be safe
            new_settings = {
                **repo.get("settings", {}),
                "last_context_built_at": now_iso,
                "context_summary": summary
            }
            
            # Try to update specific columns, fall back to settings if they don't exist
            update_payload = {"settings": new_settings}
            
            # Check if we can update specific columns by trying a small update first or just catch the error
            try:
                # Attempt to update all columns
                await db.client.table("repos").update({
                    "last_context_built_at": now_iso,
                    "context_summary": summary,
                    "settings": new_settings
                }).eq("id", repo_id).execute()
            except Exception as e:
                error_msg = str(e)
                if "column" in error_msg and ("context_summary" in error_msg or "last_context_built_at" in error_msg):
                    logger.warning(f"Database schema mismatch: {error_msg}. Using settings fallback.")
                    await db.client.table("repos").update({
                        "settings": new_settings
                    }).eq("id", repo_id).execute()
                else:
                    # Some other error, re-raise
                    raise e
            
            return context
        else:
            logger.info(f"Context for {full_name} is still fresh")
            # In a real app, we'd store the full context in a bucket.
            # For now, we rebuild it since we don't store the massive full context in DB.
            # But we skip the "needs_rebuild" logic if we just want the summary.
            return await self.build_full_context(full_name)

    async def build_full_context(self, full_name: str, focus_paths: List[str] = None) -> Dict[str, Any]:
        logger.info(f"Building full context for {full_name}")
        
        # 1. Repo Metadata & Recent Activity (parallel)
        repo_task = github_svc.get_repo(full_name)
        tree_task = github_svc.get_repo_tree(full_name)
        issues_task = github_svc.list_open_issues(full_name)
        
        # We need commits, but github_svc doesn't have get_commits. We'll add a helper or use PyGithub directly if needed.
        # Let's use the client from github_svc
        def _get_commits():
            repo = github_svc.client.get_repo(full_name)
            commits = repo.get_commits()[:10]
            return [{"sha": c.sha, "message": c.commit.message, "author": c.commit.author.name if c.commit.author else "Unknown"} for c in commits]
            
        def _get_pulls():
            repo = github_svc.client.get_repo(full_name)
            return repo.get_pulls(state='open').totalCount

        commits_task = github_svc._run_async(_get_commits)
        pulls_task = github_svc._run_async(_get_pulls)

        repo_data, tree_data, open_issues, recent_commits, open_prs = await asyncio.gather(
            repo_task, tree_task, issues_task, commits_task, pulls_task, return_exceptions=True
        )

        if isinstance(repo_data, Exception):
            raise repo_data

        metadata = {
            "name": repo_data.get("name"),
            "full_name": repo_data.get("full_name"),
            "description": repo_data.get("description"),
            "default_branch": repo_data.get("default_branch"),
            "language": repo_data.get("language"),
            "topics": repo_data.get("topics", []),
            "stars": repo_data.get("stargazers_count"),
            "size": repo_data.get("size"),
            "created_at": repo_data.get("created_at"),
            "updated_at": repo_data.get("updated_at")
        }

        # 2. ASCII Folder Tree
        tree_items = tree_data.get("tree", []) if not isinstance(tree_data, Exception) else []
        ascii_tree, file_counts = self._generate_ascii_tree(tree_items, self.max_depth)

        # 3. Key Files Content
        key_files = {}
        paths_to_read = set(focus_paths or [])
        
        # Always read these if they exist
        always_read_patterns = [
            "README.md", "package.json", "requirements.txt", "Cargo.toml", 
            "go.mod", "pom.xml", ".env.example", "tsconfig.json", "vite.config.ts",
            "next.config.js", "webpack.config.js", "docker-compose.yml", "Dockerfile"
        ]
        
        for item in tree_items:
            if item["type"] == "blob":
                path = item["path"]
                filename = path.split("/")[-1]
                if filename in always_read_patterns or path in paths_to_read:
                    paths_to_read.add(path)

        paths_to_read = list(paths_to_read)
        
        async def fetch_file(path):
            try:
                content = await github_svc.get_file_content(full_name, path)
                return path, content
            except Exception as e:
                return path, f"// Error reading file: {str(e)}"

        file_results = await asyncio.gather(*[fetch_file(p) for p in paths_to_read])
        for path, content in file_results:
            key_files[path] = content

        # 4 & 5 & 7. Tech Stack, Code Patterns, Dependencies
        # We can use Gemini to analyze the key files and tree to extract this structured info
        analysis_prompt = f"""
Analyze the following repository context and extract the tech stack, code patterns, and dependencies.
Return ONLY valid JSON.

Metadata: {json.dumps(metadata)}
Files: {json.dumps({k: v[:1000] + '...' if len(v) > 1000 else v for k, v in key_files.items()})}

Expected JSON schema:
{{
    "tech_stack": {{
        "language": "string",
        "framework": "string",
        "testing_library": "string",
        "build_tool": "string",
        "package_manager": "string",
        "ci_cd_system": "string"
    }},
    "code_patterns": {{
        "indentation_style": "string",
        "naming_convention": "string",
        "import_style": "string",
        "comment_style": "string"
    }},
    "dependencies": ["string"],
    "context_summary": "string (2 paragraphs)"
}}
"""
        try:
            analysis_res = await gemini_svc.generate(analysis_prompt, gemini_svc.MODEL_FLASH, json_mode=True)
            analysis_data = json.loads(analysis_res)
        except Exception as e:
            logger.error(f"Failed to analyze repo context: {e}")
            analysis_data = {
                "tech_stack": {},
                "code_patterns": {},
                "dependencies": [],
                "context_summary": "Failed to generate summary."
            }

        return {
            "metadata": metadata,
            "ascii_tree": ascii_tree,
            "key_files": key_files,
            "tech_stack": analysis_data.get("tech_stack", {}),
            "code_patterns": analysis_data.get("code_patterns", {}),
            "recent_commits": recent_commits if not isinstance(recent_commits, Exception) else [],
            "dependencies": analysis_data.get("dependencies", []),
            "context_summary": analysis_data.get("context_summary", ""),
            "total_files": len([i for i in tree_items if i["type"] == "blob"]),
            "context_built_at": datetime.datetime.utcnow().isoformat() + "Z"
        }

    def _generate_ascii_tree(self, tree_items: List[Dict], max_depth: int) -> tuple[str, Dict[str, int]]:
        # Build nested dict
        root = {}
        file_counts = {}
        
        for item in tree_items:
            parts = item["path"].split("/")
            if len(parts) > max_depth and item["type"] == "blob":
                # Aggregate deep files into their max_depth parent
                parent_path = "/".join(parts[:max_depth])
                file_counts[parent_path] = file_counts.get(parent_path, 0) + 1
                continue
                
            current = root
            for i, part in enumerate(parts):
                if i == len(parts) - 1:
                    if item["type"] == "blob":
                        current[part] = None
                    else:
                        if part not in current:
                            current[part] = {}
                else:
                    if part not in current:
                        current[part] = {}
                    current = current[part]

        def _render(node, prefix=""):
            lines = []
            keys = list(node.keys())
            for i, key in enumerate(keys):
                is_last = (i == len(keys) - 1)
                connector = "└── " if is_last else "├── "
                
                if node[key] is None:
                    lines.append(f"{prefix}{connector}{key}")
                else:
                    folder_path = key # Simplified, actual path tracking needed for accurate counts
                    count_str = f" ({file_counts.get(folder_path, 0)} hidden files)" if file_counts.get(folder_path, 0) > 0 else ""
                    lines.append(f"{prefix}{connector}{key}/{count_str}")
                    extension = "    " if is_last else "│   "
                    lines.extend(_render(node[key], prefix + extension))
            return lines

        ascii_str = ".\n" + "\n".join(_render(root))
        return ascii_str, file_counts

    async def get_relevant_files_for_issue(self, full_name: str, issue_title: str, issue_body: str) -> List[str]:
        tree_data = await github_svc.get_repo_tree(full_name)
        tree_items = tree_data.get("tree", [])
        ascii_tree, _ = self._generate_ascii_tree(tree_items, max_depth=5)
        
        prompt = f"""
You are an expert software architect. Given the following issue and the repository's file tree, determine which files need to be read to understand and fix the issue.
Return ONLY a JSON array of file paths (strings). Maximum 20 files.

Issue Title: {issue_title}
Issue Body: {issue_body}

Repository Tree:
{ascii_tree}
"""
        try:
            res = await gemini_svc.generate(prompt, gemini_svc.MODEL_FLASH_LITE, json_mode=True)
            paths = json.loads(res)
            if isinstance(paths, dict) and "files" in paths:
                paths = paths["files"]
            if not isinstance(paths, list):
                paths = []
            return [p for p in paths if isinstance(p, str)][:20]
        except Exception as e:
            logger.error(f"Failed to get relevant files: {e}")
            return []

    async def build_focused_context(self, full_name: str, issue: dict) -> Dict[str, Any]:
        title = issue.get("title", "")
        body = issue.get("body", "")
        focus_paths = await self.get_relevant_files_for_issue(full_name, title, body)
        return await self.build_full_context(full_name, focus_paths)

repo_context_service = RepoContextService()
