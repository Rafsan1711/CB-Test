# Semantic Versioning & Releases

ContriBot automates the tedious process of versioning and releasing your software.

## How Version Bumping Works
When a Pull Request is merged into the default branch, ContriBot analyzes the PR titles and commit messages since the last release. It uses this information to determine the next semantic version.

## When Patch vs Minor vs Major is Used
- **Major (1.0.0 -> 2.0.0)**: Breaking changes. Triggered by commits with `BREAKING CHANGE` or `!` (e.g., `feat!: change API response`).
- **Minor (1.0.0 -> 1.1.0)**: New features that are backwards-compatible. Triggered by `feat` commits.
- **Patch (1.0.0 -> 1.0.1)**: Backwards-compatible bug fixes. Triggered by `fix`, `perf`, or `refactor` commits.

## Automatic Release Notes Generation
ContriBot generates beautifully formatted Markdown release notes. It groups changes into logical categories:
- 🚀 Features
- 🐛 Bug Fixes
- 🛠 Maintenance

## CHANGELOG.md Management
If a `CHANGELOG.md` file exists in your repository, ContriBot will automatically prepend the new release notes to it and commit the change.

## GitHub Releases Integration
Finally, ContriBot creates a formal GitHub Release, tagging the repository with the new version number and attaching the generated release notes.
