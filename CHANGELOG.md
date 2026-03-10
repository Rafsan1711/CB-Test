# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-10

### Added
- **Autonomous Issue Resolution**: ContriBot can now analyze GitHub issues, plan solutions, and write code automatically.
- **Multi-Model PR Verification**: Introduced a 4-model consensus system (Gemini 3.1 Pro, 3.0 Flash, 2.5 Pro, 2.5 Flash) to review and score Pull Requests before merging.
- **Semantic Versioning & Releases**: Automated version bumping (Major, Minor, Patch) based on commit history and automated GitHub Release generation with changelogs.
- **Dashboard & UI**: A complete React/Vite frontend with dark mode, real-time task tracking, and repository management.
- **Webhook Integration**: Real-time listening to GitHub events (issues, PRs, pushes).
- **Authentication**: Secure login using Firebase Auth (Email/Password and GitHub OAuth).
- **Database**: Supabase integration for storing users, repositories, tasks, and activity logs.
- **Comprehensive Documentation**: Added full documentation suite including setup guides, API reference, and feature explanations.
