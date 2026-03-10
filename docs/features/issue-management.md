# Issue Management

ContriBot acts as your first line of defense for incoming GitHub issues. It automatically analyzes, categorizes, and prepares solutions for issues opened in your repositories.

## How ContriBot Analyzes Issues
When a new issue is opened, GitHub sends a webhook payload to the ContriBot backend. The AI Analysis Engine (powered by Gemini) reads the issue title, body, and the current context of the repository.

## Issue Types and Classification
ContriBot categorizes issues into the following types:
- **Bug**: A flaw or error in the existing code.
- **Feature**: A request for new functionality.
- **Enhancement**: An improvement to an existing feature.
- **Docs**: Documentation updates.
- **Other**: General questions or discussions.

It also assigns an estimated complexity (`simple`, `moderate`, `complex`) and priority (`low`, `medium`, `high`, `critical`).

## The Approval Workflow
By default, ContriBot operates with a "Human in the Loop" approval workflow for complex issues.
1. ContriBot analyzes the issue and posts a comment with its proposed plan.
2. A repository maintainer must reply with "Approved" or click the "Approve" button in the ContriBot UI.
3. Once approved, ContriBot begins writing the code.

## Auto-implementing Bugs vs Features
You can configure ContriBot to automatically implement certain types of issues without waiting for approval.
- **Bugs**: Often safe to auto-implement, especially if they are marked as `simple`.
- **Features**: Usually require architectural decisions, so approval is recommended.

## Issue Labels and Priority System
ContriBot automatically applies relevant labels to the GitHub issue based on its analysis (e.g., `bug`, `high-priority`, `needs-approval`). This helps maintainers quickly triage incoming requests.
