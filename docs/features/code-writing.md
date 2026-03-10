# Code Writing Pipeline

ContriBot doesn't just suggest code snippets; it writes complete, production-ready code and submits it as a Pull Request.

## Repository Context Gathering
Before writing a single line of code, ContriBot gathers context:
1. It fetches the repository's file tree.
2. It reads relevant files based on the issue description.
3. It analyzes the existing code style, architecture patterns, and dependencies.

## File Modification Pipeline
ContriBot uses a structured JSON output to define its actions:
- **Files to Create**: New files with complete content.
- **Files to Modify**: Existing files with targeted replacements or complete rewrites, ensuring no existing functionality is broken.

## Branch Naming Convention
To keep your repository organized, ContriBot uses a strict branch naming convention:
`contribot/issue-[ISSUE_NUMBER]-[SLUG]`
Example: `contribot/issue-42-fix-login-button`

## Commit Message Format
ContriBot follows Conventional Commits to ensure a clean and readable history.
Format: `type(scope): description`
Example: `fix(auth): resolve null pointer exception in login flow`

The commit message also automatically references the issue it resolves (e.g., `Resolves #42`).
