import asyncio
import json
import logging
import httpx
import time
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
    MODEL_DEEPSEEK = "deepseek-ai/DeepSeek-R1-0528:together"

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

    async def generate(self, prompt: str, model: str = None, system_prompt: str = None, json_mode: bool = False, temperature: float = 0.3, client: genai.Client = None, preferred_model: str = None) -> str:
        """Generate content using DeepSeek-R1 as default (if HF_TOKEN exists) with fallback to Gemini."""
        target_client = client or self.client
        start_time = time.time()
        
        # Determine which model to try first
        use_deepseek_first = False
        if preferred_model == "deepseek":
            use_deepseek_first = True
        elif preferred_model == "gemini":
            use_deepseek_first = False
        elif settings.HF_TOKEN:
            use_deepseek_first = True
            
        if use_deepseek_first:
            try:
                logger.debug(f"[GEMINI] Attempting generation with DeepSeek (Prompt len: {len(prompt)})")
                res = await self._generate_with_deepseek(prompt, system_prompt, json_mode, temperature)
                duration = time.time() - start_time
                logger.info(f"[GEMINI] DeepSeek generation successful in {duration:.2f}s")
                return res
            except Exception as e:
                logger.error(f"[GEMINI] DeepSeek execution failed for prompt (len={len(prompt)}): {e}. Falling back to Gemini.")
        
        # Gemini Logic
        model = model or self.MODEL_FLASH
        logger.debug(f"[GEMINI] Attempting generation with Gemini model {model} (Prompt len: {len(prompt)})")
        
        config_args = {"temperature": temperature}
        if json_mode:
            config_args["response_mime_type"] = "application/json"
        if system_prompt:
            config_args["system_instruction"] = system_prompt
            
        config = types.GenerateContentConfig(**config_args)

        if json_mode:
            prompt += "\n\nIMPORTANT: Return ONLY valid JSON."

        for attempt in range(3):
            try:
                response = await target_client.aio.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config
                )
                
                text = response.text
                if json_mode:
                    text = self._clean_json_response(text)
                
                duration = time.time() - start_time
                logger.info(f"[GEMINI] Gemini generation ({model}) successful in {duration:.2f}s (Attempt {attempt + 1})")
                return text
            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    logger.error(f"[GEMINI] Gemini Quota Exceeded for model {model}. Prompt length: {len(prompt)}")
                    raise Exception("Gemini API Quota Exceeded.")
                
                logger.warning(f"[GEMINI] Gemini API error on attempt {attempt + 1} for model {model}: {error_msg}")
                if attempt == 2:
                    logger.error(f"[GEMINI] Gemini API failed after 3 attempts: {error_msg}")
                    raise Exception(f"Gemini API failed after 3 attempts: {error_msg}")
                await asyncio.sleep(2 ** attempt)

    async def _generate_with_deepseek(self, prompt: str, system_prompt: str = None, json_mode: bool = False, temperature: float = 0.3) -> str:
        """Fallback generator using DeepSeek-R1 on Hugging Face Inference API."""
        if not settings.HF_TOKEN:
            raise Exception("Hugging Face token (HF_TOKEN) not configured for fallback.")
            
        model_name = "deepseek-ai/DeepSeek-R1-0528:together"
        logger.info(f"Calling DeepSeek-R1 on Hugging Face Router ({model_name})...")
        
        url = "https://router.huggingface.co/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.HF_TOKEN}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4096
        }
        
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    logger.error(f"Hugging Face API error: {response.status_code} - {response.text}")
                    raise Exception(f"Hugging Face API error: {response.status_code}")
                
                data = response.json()
                if "choices" not in data or not data["choices"]:
                    raise Exception("Invalid response format from Hugging Face")
                
                text = data["choices"][0]["message"]["content"]
                
                if "<think>" in text and "</think>" in text:
                    import re
                    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()

                if json_mode:
                    text = self._clean_json_response(text)
                return text
            except Exception as e:
                logger.error(f"DeepSeek generation failed: {e}")
                raise e

    async def write_code_for_issue(self, repo_context: dict, issue: dict, preferred_model: str = None) -> dict:
        logger.info(f"[GEMINI] Generating code implementation plan for issue #{issue.get('github_issue_number') or 'unknown'}")
        prompt = f"""
Repo Context:
{json.dumps(repo_context)}

Issue Details:
{json.dumps(issue)}

Instruction: Generate a COMPLETE implementation. Consider all existing code patterns.
IMPORTANT: Only include 'Closes #<issue_number>' in the pr_body if the Issue Details explicitly mention an issue number.
IMPORTANT: You MUST write unit and integration tests for all new features and bug fixes.
IMPORTANT: Perform a security audit on your generated code and ensure no vulnerabilities are introduced.
IMPORTANT: Update README.md and any other relevant internal documentation to reflect your changes.
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
        res = await self.generate(prompt, self.MODEL_PRO, system_prompt=SYSTEM_PROMPT_ENGINEER, json_mode=True, preferred_model=preferred_model)
        try:
            return json.loads(res)
        except json.JSONDecodeError as e:
            logger.error(f"[GEMINI] Failed to parse implementation plan JSON: {e}")
            logger.debug(f"[GEMINI] Raw response: {res}")
            raise

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
        models = [self.MODEL_PRO, self.MODEL_FLASH]
        
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
        # Consensus: 2/2 models approved
        safe_to_merge = consensus_score >= 2
        
        # Generate overall summary using the lightest model
        summary_prompt = f"Summarize these PR verification results from multiple AI models into a single concise paragraph:\n{json.dumps([r.model_dump() for r in parsed_results])}"
        summary = await self.generate(summary_prompt, self.MODEL_FLASH_LITE, client=self.review_client)
        
        return ConsensusSummary(
            results=parsed_results,
            consensus_score=consensus_score,
            safe_to_merge=safe_to_merge,
            summary=summary
        )

    async def analyze_issue(self, issue_title: str, issue_body: str, repo_context: dict, preferred_model: str = None) -> dict:
        logger.info(f"[GEMINI] Analyzing issue: {issue_title}")
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
        res = await self.generate(prompt, self.MODEL_FLASH, system_prompt=SYSTEM_PROMPT_ANALYST, json_mode=True, preferred_model=preferred_model)
        try:
            return json.loads(res)
        except json.JSONDecodeError as e:
            logger.error(f"[GEMINI] Failed to parse issue analysis JSON: {e}")
            logger.debug(f"[GEMINI] Raw response: {res}")
            raise

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

    async def test_ai_connection(self) -> dict:
        """Test connections to both Gemini and DeepSeek."""
        results = {
            "gemini": {"status": "unknown", "error": None},
            "deepseek": {"status": "unknown", "error": None}
        }
        
        # Test Gemini
        try:
            await self.generate("Hello, are you there?", model=self.MODEL_FLASH_LITE, temperature=0.1)
            results["gemini"]["status"] = "ok"
        except Exception as e:
            results["gemini"]["status"] = "error"
            results["gemini"]["error"] = str(e)
            
        # Test DeepSeek
        if settings.HF_TOKEN:
            try:
                await self._generate_with_deepseek("Hello, are you there?", temperature=0.1)
                results["deepseek"]["status"] = "ok"
            except Exception as e:
                results["deepseek"]["status"] = "error"
                results["deepseek"]["error"] = str(e)
        else:
            results["deepseek"]["status"] = "not_configured"
            
        return results

gemini_svc = GeminiService()
