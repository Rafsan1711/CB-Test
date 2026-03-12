import asyncio
import json
import logging
import httpx
from google import genai
from google.genai import types
from config import settings
from models.schemas import ConsensusSummary, VerificationResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_ENGINEER = """
You are ContriBot, a world-class autonomous software engineer with 20+ years of expertise.
You operate on GitHub repositories and write production-quality, battle-tested code.

Your operating principles:
1. ALWAYS match the existing codebase's exact style, patterns, and architecture
2. NEVER break existing functionality — always consider downstream effects  
3. Write complete, working code — never leave TODOs or placeholders
4. Follow the detected tech stack and naming conventions EXACTLY
5. Consider security implications of every change
6. Write meaningful commit messages following Conventional Commits spec
7. Your code must pass linting and tests without modification

Context you receive: Full repo context including ASCII tree, key files, tech stack, code patterns.
Output: ONLY valid JSON matching the exact requested schema. No markdown, no explanations outside JSON.
"""

SYSTEM_PROMPT_REVIEWER = """
You are ContriBot's code review specialist. You perform thorough, constructive code reviews.
Analyze: correctness, security, performance, maintainability, test coverage, API design.
Be specific — always reference file paths and line numbers when possible.
Output: ONLY valid JSON.
"""

SYSTEM_PROMPT_ANALYST = """
You are ContriBot's issue analyst. You classify, prioritize, and plan implementation for GitHub issues.
You understand software development complexity deeply.
Output: ONLY valid JSON.
"""

class GeminiService:
    # Model Constants
    MODEL_PRO = "gemini-3.1-pro-preview"
    MODEL_FLASH = "gemini-3-flash-preview"
    MODEL_FLASH_LITE = "gemini-3.1-flash-lite-preview"
    MODEL_STABLE_PRO = "gemini-2.5-pro"
    MODEL_STABLE_FLASH = "gemini-2.5-flash"

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        # Separate client for reviews if a different key is provided
        review_key = settings.GEMINI_API_KEY_REVIEW or settings.GEMINI_API_KEY
        self.review_client = genai.Client(api_key=review_key)

    def _clean_json_response(self, text: str) -> str:
        """Removes markdown code blocks if the model returns them despite instructions."""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    async def generate(self, prompt: str, model: str, system_prompt: str = None, json_mode: bool = False, temperature: float = 0.3, client: genai.Client = None) -> str:
        target_client = client or self.client
        config_args = {
            "temperature": temperature,
        }
        if json_mode:
            config_args["response_mime_type"] = "application/json"
        if system_prompt:
            config_args["system_instruction"] = system_prompt
            
        config = types.GenerateContentConfig(**config_args)

        if json_mode:
            prompt += "\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like ```json."

        for attempt in range(3):
            try:
                response = await target_client.aio.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config
                )
                
                # Log token usage
                usage = response.usage_metadata
                if usage:
                    logger.info(f"Token usage for {model}: prompt={usage.prompt_token_count}, candidates={usage.candidates_token_count}, total={usage.total_token_count}")
                
                text = response.text
                if json_mode:
                    text = self._clean_json_response(text)
                return text
            except Exception as e:
                logger.warning(f"Gemini API error on attempt {attempt + 1} for model {model}: {e}")
                if attempt == 2:
                    raise e
                await asyncio.sleep(2 ** attempt)

    async def write_code_for_issue(self, repo_context: dict, issue: dict) -> dict:
        prompt = f"""
Repo Context:
{json.dumps(repo_context)}

Issue Details:
{json.dumps(issue)}

Instruction: Generate a COMPLETE implementation. Consider all existing code patterns.
Return ONLY valid JSON matching this schema:
{{
  "implementation_plan": ["step 1", "step 2"],
  "files_to_create": [{{"path": "...", "content": "...", "reason": "..."}}],
  "files_to_modify": [{{"path": "...", "original_snippet": "...", "modified_content": "...", "changes_description": "..."}}],
  "files_to_delete": [],
  "new_dependencies": [{{"name": "...", "version": "...", "reason": "..."}}],
  "migration_required": false,
  "migration_sql": null,
  "commit_message": "feat(scope): description",
  "pr_title": "...",
  "pr_body": "## Summary\\n...\\n## Changes\\n...\\n## Testing\\n...",
  "branch_name": "contribot/issue-{{number}}-{{slug}}",
  "estimated_risk": "low|medium|high",
  "testing_notes": "..."
}}
"""
        res = await self.generate(prompt, self.MODEL_PRO, system_prompt=SYSTEM_PROMPT_ENGINEER, json_mode=True)
        return json.loads(res)

    async def verify_pr_multimodel(self, diff: str, pr_title: str, pr_body: str, repo_context: dict) -> ConsensusSummary:
        prompt = f"""
Review this PR.
Title: {pr_title}
Body: {pr_body}
Diff:
{diff}

Repo Context: {json.dumps(repo_context)}

Return ONLY valid JSON matching this schema:
{{
  "approved": bool,
  "score": int (1-10),
  "reasoning": "string",
  "issues_found": ["string"],
  "suggestions": ["string"]
}}
"""
        models = [self.MODEL_PRO, self.MODEL_FLASH, self.MODEL_STABLE_PRO, self.MODEL_STABLE_FLASH]
        
        # Run all models in parallel using the review client
        tasks = [self.generate(prompt, m, system_prompt=SYSTEM_PROMPT_REVIEWER, json_mode=True, client=self.review_client) for m in models]
        results_json = await asyncio.gather(*tasks, return_exceptions=True)
        
        parsed_results = []
        weighted_score = 0
        
        for i, res in enumerate(results_json):
            model_name = models[i]
            weight = 2 if model_name == self.MODEL_PRO else 1
            
            if isinstance(res, Exception):
                parsed_results.append(VerificationResult(
                    model_name=model_name,
                    approved=False,
                    score=1,
                    reasoning=f"Model unavailable: {str(res)}",
                    issues_found=[]
                ))
            else:
                try:
                    data = json.loads(res)
                    approved = data.get("approved", False)
                    if approved:
                        weighted_score += weight
                        
                    parsed_results.append(VerificationResult(
                        model_name=model_name,
                        approved=approved,
                        score=data.get("score", 1),
                        reasoning=data.get("reasoning", "No reasoning provided."),
                        issues_found=data.get("issues_found", [])
                    ))
                except Exception as e:
                    parsed_results.append(VerificationResult(
                        model_name=model_name,
                        approved=False,
                        score=1,
                        reasoning=f"Failed to parse JSON: {str(e)}",
                        issues_found=[]
                    ))
        
        consensus_score = sum(1 for r in parsed_results if r.approved)
        # Consensus: 3/4 models approved OR weighted score >= 3
        # Spec says: consensus_score = count of models that approved (out of 4), safe_to_merge = consensus_score >= 3
        safe_to_merge = consensus_score >= 3
        
        # Generate overall summary using the lightest model
        summary_prompt = f"Summarize these PR verification results from multiple AI models into a single concise paragraph:\n{json.dumps([r.model_dump() for r in parsed_results])}"
        summary = await self.generate(summary_prompt, self.MODEL_FLASH_LITE, client=self.review_client)
        
        return ConsensusSummary(
            results=parsed_results,
            consensus_score=consensus_score,
            safe_to_merge=safe_to_merge,
            summary=summary
        )

    async def analyze_issue(self, issue_title: str, issue_body: str, repo_context: dict) -> dict:
        prompt = f"""
Repo Context:
{json.dumps(repo_context)}

Issue Title: {issue_title}
Issue Body:
{issue_body}

Analyze this issue. Return ONLY valid JSON matching this schema:
{{
  "type": "bug|feature|enhancement|docs|refactor|security|performance|other",
  "priority": "critical|high|medium|low",
  "estimated_complexity": "trivial|simple|moderate|complex|epic",
  "estimated_time_hours": 2,
  "labels": ["..."],
  "requires_approval": true,
  "affected_components": ["auth", "api"],
  "implementation_hints": ["..."],
  "similar_issues_pattern": "...",
  "breaking_change_risk": false,
  "analysis_summary": "...",
  "questions_for_owner": ["..."]
}}
"""
        res = await self.generate(prompt, self.MODEL_FLASH, system_prompt=SYSTEM_PROMPT_ANALYST, json_mode=True)
        return json.loads(res)

    async def determine_version_bump(self, pr_titles: list[str], commit_messages: list[str], current_version: str) -> dict:
        system_prompt = """You are an expert release manager. Determine the next semantic version based on the changes.
Return ONLY valid JSON matching the requested structure.
Expected JSON format:
{
  "bump_type": "major" | "minor" | "patch",
  "new_version": "string",
  "reasoning": "string",
  "changelog_entry": "string"
}"""
        prompt = f"Current Version: {current_version}\n\nPR Titles:\n{json.dumps(pr_titles)}\n\nCommit Messages:\n{json.dumps(commit_messages)}\n\nDetermine the semantic version bump."
        
        res = await self.generate(prompt, self.MODEL_FLASH, system_prompt=system_prompt, json_mode=True)
        return json.loads(res)

    async def generate_release_notes(self, version: str, changes: list[dict], repo_name: str) -> str:
        system_prompt = "You are an expert technical writer. Generate beautifully formatted markdown release notes."
        prompt = f"Repository: {repo_name}\nVersion: {version}\n\nChanges:\n{json.dumps(changes)}\n\nWrite the release notes in Markdown format. Group by features, bug fixes, etc."
        
        res = await self.generate(prompt, self.MODEL_FLASH, system_prompt=system_prompt)
        return res

gemini_svc = GeminiService()
