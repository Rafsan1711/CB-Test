import asyncio
import json
import logging
import google.generativeai as genai
from config import settings
from models.schemas import ConsensusSummary, VerificationResult

logger = logging.getLogger(__name__)

class GeminiService:
    # Model Constants
    MODEL_PRO = "gemini-3.1-pro-preview"
    MODEL_FLASH = "gemini-3-flash-preview"
    MODEL_FLASH_LITE = "gemini-3.1-flash-lite-preview"
    MODEL_STABLE_PRO = "gemini-2.5-pro"
    MODEL_STABLE_FLASH = "gemini-2.5-flash"

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)

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

    async def generate(self, prompt: str, model: str, system_prompt: str = None, json_mode: bool = False, temperature: float = 0.3) -> str:
        generation_config = genai.types.GenerationConfig(
            temperature=temperature,
            response_mime_type="application/json" if json_mode else "text/plain"
        )

        if json_mode:
            prompt += "\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like ```json."

        m = genai.GenerativeModel(model_name=model, system_instruction=system_prompt)

        for attempt in range(3):
            try:
                response = await m.generate_content_async(
                    prompt,
                    generation_config=generation_config
                )
                
                # Log token usage
                usage = response.usage_metadata
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
        system_prompt = """You are ContriBot, an expert autonomous software engineer. You write production-quality code. 
Always follow the existing code style, patterns, and architecture of the repository.
Return ONLY valid JSON matching the requested structure. No explanations outside JSON.
Expected JSON format:
{
  "files_to_create": [{"path": "string", "content": "string"}],
  "files_to_modify": [{"path": "string", "original": "string", "modified": "string"}],
  "commit_message": "string",
  "pr_title": "string",
  "pr_body": "string",
  "branch_name": "string"
}"""
        prompt = f"Repo Context:\n{json.dumps(repo_context)}\n\nIssue to resolve:\n{json.dumps(issue)}\n\nGenerate the code to resolve this issue."
        
        res = await self.generate(prompt, self.MODEL_PRO, system_prompt=system_prompt, json_mode=True)
        return json.loads(res)

    async def review_code(self, diff: str, pr_title: str, repo_context: dict) -> dict:
        system_prompt = """You are an expert code reviewer. Analyze the provided diff and PR title in the context of the repository.
Return ONLY valid JSON matching the requested structure.
Expected JSON format:
{
  "overall_quality": int (1-10),
  "issues": ["string"],
  "suggestions": ["string"],
  "security_concerns": ["string"],
  "approved": bool,
  "summary": "string"
}"""
        prompt = f"Repo Context:\n{json.dumps(repo_context)}\n\nPR Title: {pr_title}\n\nDiff:\n{diff}\n\nReview this code."
        
        res = await self.generate(prompt, self.MODEL_FLASH, system_prompt=system_prompt, json_mode=True)
        return json.loads(res)

    async def analyze_issue(self, issue_title: str, issue_body: str, repo_context: dict) -> dict:
        system_prompt = """You are an expert project manager and technical lead. Analyze the issue and categorize it.
Return ONLY valid JSON matching the requested structure.
Expected JSON format:
{
  "type": "bug" | "feature" | "enhancement" | "docs" | "other",
  "priority": "low" | "medium" | "high" | "critical",
  "estimated_complexity": "simple" | "moderate" | "complex",
  "labels": ["string"],
  "requires_approval": bool,
  "analysis_summary": "string"
}"""
        prompt = f"Repo Context:\n{json.dumps(repo_context)}\n\nIssue Title: {issue_title}\n\nIssue Body:\n{issue_body}\n\nAnalyze this issue."
        
        res = await self.generate(prompt, self.MODEL_FLASH, system_prompt=system_prompt, json_mode=True)
        return json.loads(res)

    async def verify_pr_multimodel(self, diff: str, pr_title: str, pr_body: str, repo_context: dict) -> ConsensusSummary:
        prompt = f"Review this PR.\nTitle: {pr_title}\nBody: {pr_body}\nDiff:\n{diff}\nRepo Context: {json.dumps(repo_context)}"
        system_prompt = """You are a strict code reviewer. Evaluate the PR for bugs, security issues, and best practices.
Return ONLY valid JSON matching the requested structure.
Expected JSON format:
{
  "approved": bool,
  "score": int (1-10),
  "reasoning": "string",
  "issues_found": ["string"],
  "suggestions": ["string"]
}"""
        
        models = [self.MODEL_PRO, self.MODEL_FLASH, self.MODEL_STABLE_PRO, self.MODEL_STABLE_FLASH]
        
        # Run all models in parallel
        tasks = [self.generate(prompt, m, system_prompt=system_prompt, json_mode=True) for m in models]
        results_json = await asyncio.gather(*tasks, return_exceptions=True)
        
        parsed_results = []
        for i, res in enumerate(results_json):
            if isinstance(res, Exception):
                parsed_results.append(VerificationResult(
                    model_name=models[i],
                    approved=False,
                    score=1,
                    reasoning=f"Model failed: {str(res)}",
                    issues_found=[]
                ))
            else:
                try:
                    data = json.loads(res)
                    parsed_results.append(VerificationResult(
                        model_name=models[i],
                        approved=data.get("approved", False),
                        score=data.get("score", 1),
                        reasoning=data.get("reasoning", "No reasoning provided."),
                        issues_found=data.get("issues_found", [])
                    ))
                except Exception as e:
                    parsed_results.append(VerificationResult(
                        model_name=models[i],
                        approved=False,
                        score=1,
                        reasoning=f"Failed to parse JSON: {str(e)}",
                        issues_found=[]
                    ))
        
        consensus_score = sum(1 for r in parsed_results if r.approved)
        safe_to_merge = consensus_score >= 3
        
        # Generate overall summary using the lightest model
        summary_prompt = f"Summarize these PR verification results from multiple AI models into a single concise paragraph:\n{json.dumps([r.model_dump() for r in parsed_results])}"
        summary = await self.generate(summary_prompt, self.MODEL_FLASH_LITE)
        
        return ConsensusSummary(
            results=parsed_results,
            consensus_score=consensus_score,
            safe_to_merge=safe_to_merge,
            summary=summary
        )

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
