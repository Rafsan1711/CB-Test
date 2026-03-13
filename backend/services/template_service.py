import logging
import re
from services.github_service import github_svc
from services.supabase_service import supabase_svc

logger = logging.getLogger(__name__)

class TemplateService:
    async def install_templates_on_repo(self, full_name: str) -> dict:
        """Installs standard ContriBot issue and PR templates on a managed repository."""
        
        bug_report = """name: Bug Report
description: File a bug report
labels: ["bug"]
body:
  - type: textarea
    id: description
    attributes:
      label: Describe the bug
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected vs Actual behavior
    validations:
      required: true
"""
        feature_request = """name: Feature Request
description: Suggest an idea for this project
labels: ["enhancement"]
body:
  - type: textarea
    id: feature_description
    attributes:
      label: Feature description
      description: "💡 After submitting, ContriBot will analyze this request. Reply **yes** to have ContriBot implement this, or **no** to close."
    validations:
      required: true
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      options:
        - High
        - Medium
        - Low
    validations:
      required: true
"""
        contribot_task = """name: ContriBot Task
description: Direct task for ContriBot
labels: ["contribot-task"]
body:
  - type: dropdown
    id: task_type
    attributes:
      label: Task Type
      options:
        - implement_feature
        - fix_bug
        - refactor
        - add_tests
        - update_docs
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Description
    validations:
      required: true
  - type: textarea
    id: acceptance_criteria
    attributes:
      label: Acceptance Criteria
    validations:
      required: true
"""
        pr_template_content = """## Summary
<!-- What does this PR do? -->

## Related Issue
<!-- If this PR resolves an issue, uncomment the line below and add the issue number -->
<!-- Closes # -->

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Enhancement
- [ ] Docs

## Testing
- [ ] Tested locally
- [ ] All CI checks pass

---
_This PR will be automatically reviewed by ContriBot's 2-model verification system._
"""
        
        ci_workflow = """name: ContriBot CI
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Detect and Run CI
        run: |
          if [ -f package.json ]; then
            npm install && npm test
          elif [ -f requirements.txt ]; then
            pip install -r requirements.txt && pytest
          else
            echo "No supported build file found"
          fi
"""

        code_quality_workflow = """name: Code Quality
on:
  pull_request:
    branches: [ main, master ]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for secrets
        run: |
          # Simple secret check placeholder
          grep -rE "AI_KEY|SECRET|PASSWORD" . --exclude-dir=.git || true
"""

        auto_label_workflow = """name: Auto Label
on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - name: Label based on content
        run: echo "Labeling logic here"
"""

        stale_workflow = """name: Stale Issues
on:
  schedule:
    - cron: '0 0 * * *'
jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          stale-issue-message: 'This issue is stale because it has been open 60 days with no activity.'
          days-before-stale: 60
          days-before-close: 14
"""

        try:
            repo_info = await github_svc.get_repo(full_name)
            branch = repo_info.get("default_branch", "main")
            
            files_to_process = [
                (".github/ISSUE_TEMPLATE/bug_report.yml", bug_report, "chore: add bug report template"),
                (".github/ISSUE_TEMPLATE/feature_request.yml", feature_request, "chore: add feature request template"),
                (".github/ISSUE_TEMPLATE/contribot_task.yml", contribot_task, "chore: add contribot task template"),
                (".github/workflows/ci.yml", ci_workflow, "chore: add CI workflow"),
                (".github/workflows/code-quality.yml", code_quality_workflow, "chore: add code quality workflow"),
                (".github/workflows/auto-label.yml", auto_label_workflow, "chore: add auto label workflow"),
                (".github/workflows/stale.yml", stale_workflow, "chore: add stale workflow"),
            ]
            
            results = []
            for path, content, msg in files_to_process:
                try:
                    exists = await github_svc.file_exists(full_name, path, branch)
                    if exists:
                        logger.info(f"Skipping {path} on {full_name} as it already exists.")
                        results.append({"path": path, "status": "skipped", "reason": "already exists"})
                        continue
                        
                    await github_svc.create_or_update_file(full_name, path, content, msg, branch)
                    results.append({"path": path, "status": "success"})
                except Exception as e:
                    logger.error(f"Failed to process {path} on {full_name}: {e}")
                    results.append({"path": path, "status": "failed", "error": str(e)})
            
            # Special handling for PR template: append if exists
            pr_path = ".github/pull_request_template.md"
            try:
                exists = await github_svc.file_exists(full_name, pr_path, branch)
                if exists:
                    current_content = await github_svc.get_file_content(full_name, pr_path)
                    if "ContriBot's 2-model verification system" not in current_content:
                        new_content = current_content + "\n\n---\n_This PR will be automatically reviewed by ContriBot's 2-model verification system._\n"
                        await github_svc.create_or_update_file(full_name, pr_path, new_content, "chore: append ContriBot verification to PR template", branch)
                        results.append({"path": pr_path, "status": "appended"})
                    else:
                        results.append({"path": pr_path, "status": "skipped", "reason": "already has verification line"})
                else:
                    await github_svc.create_or_update_file(full_name, pr_path, pr_template_content, "chore: add PR template", branch)
                    results.append({"path": pr_path, "status": "success"})
            except Exception as e:
                logger.error(f"Failed to process PR template on {full_name}: {e}")
                results.append({"path": pr_path, "status": "failed", "error": str(e)})
                    
            return {"status": "completed", "results": results}
        except Exception as e:
            logger.error(f"Failed to install templates on {full_name}: {e}")
            return {"status": "failed", "error": str(e)}

    async def detect_and_adapt_templates(self, full_name: str, tech_stack: dict) -> dict:
        """Adapts the PR template based on the detected tech stack of the repository."""
        try:
            repo_info = await github_svc.get_repo(full_name)
            branch = repo_info.get("default_branch", "main")
            
            pr_template = """## 📋 Summary\n<!-- What does this PR do? -->\n\n## 🤖 ContriBot Verification\n<!-- If this PR was auto-generated or verified by ContriBot, paste the consensus summary here -->\n\n## 📝 Checklist\n- [ ] Code follows existing patterns\n"""
            
            language = tech_stack.get("language", "").lower()
            framework = tech_stack.get("framework", "").lower()
            
            if "python" in language:
                pr_template += "- [ ] Python version compatibility checked\n- [ ] Dependency changes noted in requirements.txt/pyproject.toml\n"
            if "react" in framework or "node" in language or "javascript" in language or "typescript" in language:
                pr_template += "- [ ] `npm audit` passes\n"
            if tech_stack.get("testing_library"):
                pr_template += "- [ ] Test coverage maintained or increased\n"
            if "sql" in language or "prisma" in framework or "django" in framework or "alembic" in tech_stack.get("build_tool", "").lower():
                pr_template += "- [ ] Database migrations included and tested\n"
            
            await github_svc.create_or_update_file(full_name, ".github/pull_request_template.md", pr_template, "chore: adapt PR template to tech stack", branch)
            return {"status": "success", "adapted": True}
        except Exception as e:
            logger.error(f"Failed to adapt PR template on {full_name}: {e}")
            return {"status": "failed", "error": str(e)}

    async def handle_contribot_task_issue(self, repo_id: str, issue_number: int, issue_body: str) -> dict:
        """Parses a ContriBot Task issue and creates an agent task."""
        try:
            # Parse the issue body (GitHub forms output markdown headers)
            task_type_match = re.search(r'### Task Type\s*\n\s*(.+)', issue_body)
            desc_match = re.search(r'### Description\s*\n\s*(.+?)(?=###|$)', issue_body, re.DOTALL)
            criteria_match = re.search(r'### Acceptance Criteria\s*\n\s*(.+?)(?=###|$)', issue_body, re.DOTALL)
            
            task_type = task_type_match.group(1).strip() if task_type_match else "unknown"
            description = desc_match.group(1).strip() if desc_match else ""
            acceptance_criteria = criteria_match.group(1).strip() if criteria_match else ""
            
            # Create agent task in Supabase
            task_data = {
                "repo_id": repo_id,
                "issue_number": issue_number,
                "task_type": "issue_resolution", # General type for orchestrator to pick up
                "status": "pending",
                "logs": [f"Received ContriBot task: {task_type}"]
            }
            
            task = await supabase_svc.create_agent_task(task_data)
            
            # Get full name from repo_id
            repo = await supabase_svc.get_repository(repo_id)
            full_name = repo["full_name"]
            
            # Comment on issue to acknowledge receipt
            comment = "✅ ContriBot has received this task and will begin shortly.\n\n"
            comment += f"**Task Type:** {task_type}\n"
            comment += f"**Task ID:** `{task['id']}`"
            
            await github_svc.add_issue_comment(full_name, issue_number, comment)
            
            return {"status": "success", "task_id": task["id"]}
        except Exception as e:
            logger.error(f"Failed to handle contribot task issue: {e}")
            return {"status": "failed", "error": str(e)}

template_svc = TemplateService()
