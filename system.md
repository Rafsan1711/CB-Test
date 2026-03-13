# ContriBot System Mechanism

This document outlines the core operational workflow and logic for **ContriBot**, an autonomous AI software engineer.

## 1. Repository Initialization & Data Collection
When ContriBot is enabled on a repository, it performs an initial deep scan:
- **File Collection**: Reads all files within the repository to understand the codebase context (handles empty repositories gracefully).
- **Structure Analysis**: Generates a complete **ASCII Tree** of the project's file structure to maintain architectural awareness.
- **Context Building**: Indexes the tech stack, languages, and existing patterns.

## 2. Issue Lifecycle Management
ContriBot monitors GitHub Issues to drive its development tasks:
- **Detection**: Identifies new or open issues.
- **Engagement**: Posts a **predefined comment** on the issue to notify the user that it has started working on a solution.
- **Implementation**:
    - Analyzes the problem based on the repo context.
    - Writes the necessary code changes.
    - **Automated Test Generation**: Writes unit and integration tests for all new features.
    - **GitHub Actions Integration**: Configures or utilizes actions for CI/CD testing.
- **Pull Request Creation**:
    - Pushes changes to a new branch.
    - Opens a Pull Request (PR) with a clear description and issue reference.

## 3. Advanced Autonomous Features
- **Seamless GitHub App Integration (Zero Setup)**: Operates entirely via GitHub Webhooks. No configuration files or `.yml` setups are required in the user's repository. It listens to events (issues, PRs, comments) directly from GitHub.
- **Self-Healing CI/CD**: ContriBot monitors the repository's existing CI/CD pipelines (e.g., GitHub Actions). If a test fails on its PR, it fetches the error logs via GitHub API, identifies the root cause, and automatically pushes a fix without human intervention.
- **Security Auditing**: Scans code and dependencies for vulnerabilities during the implementation phase.
- **Semantic Release Management**: Automatically calculates version bumps (Major/Minor/Patch) and generates "Keep-a-Changelog" formatted release notes upon PR merge.
- **Technical Debt Refactoring**: Periodically scans the repo to identify complex code and suggests/implements refactors to improve maintainability.
- **Documentation Auto-Sync**: Automatically updates `README.md` and internal documentation whenever significant code changes occur.

## 4. Pull Request Review & Consensus
Every PR generated (or existing PRs in the repo) undergoes a rigorous multi-model review:
- **Multi-AI Analysis**: Uses a suite of AI models (Gemini 3.1 Pro, 3 Flash, etc.) to analyze changes for bugs, security, and style.
- **Formatted Feedback**: Posts a beautifully designed comment on the PR containing:
    - Detailed analysis results.
    - A "Safe to Merge" score/status.
    - Reference to the **Issue Number** (e.g., `Closes #123`) **ONLY if the PR was triggered by a specific issue**, to facilitate manual closing.

## 5. Continuous Operation & Monitoring
- **Auto-Trigger**: As soon as a **New Issue** is created, ContriBot automatically wakes up and begins the cycle.
- **PR Monitoring**: Continuously checks *all* PRs in the repo and provides analytical comments.
- **Real-time Dashboard**: Users can monitor ContriBot's "Thought Process", task queue, and health status via the web dashboard.

## 6. System Constraints
- **No External API Requests**: The feature to send external API requests is **Cancelled**. ContriBot operates strictly within the repository and GitHub environment.
- **Privacy First**: Code analysis is performed securely, and no proprietary data is stored externally beyond task state.

## 7. Tech Stack Summary
- **Primary Engine**: Gemini 3.1 Pro (for complex logic and code writing).
- **Verification Suite**: Multi-model consensus (Gemini 3.1 Pro, 3 Flash).
- **Backend**: Python (FastAPI) + Supabase (State Management).
- **Frontend**: React + Tailwind CSS (Dashboard & Monitoring).
