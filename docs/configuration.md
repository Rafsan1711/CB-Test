# Configuration

ContriBot is highly configurable via environment variables and repository-level settings.

## Environment Variables
These variables must be set in your backend environment (e.g., HuggingFace Space Secrets or `.env` file).

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key. | Yes |
| `SUPABASE_URL` | Your Supabase project URL. | Yes |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key. | Yes |
| `GITHUB_TOKEN` | Personal Access Token for the ContriBot GitHub account. | Yes |
| `FIREBASE_SERVICE_ACCOUNT` | JSON string of your Firebase service account key. | Yes |
| `ENVIRONMENT` | `development` or `production`. | No (Default: `development`) |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend URLs. | No |

## Repo-Level Settings
These settings are configured via the ContriBot UI for each repository.
- **Auto-Approve Bugs**: Automatically implement issues labeled as bugs.
- **Strict Verification**: Require a consensus score of 2/2 (instead of 1/2) for PRs to be marked safe.
- **Branch Prefix**: Customize the branch prefix (default: `contribot/`).

## Webhook Configuration
When you enable a repository in ContriBot, it automatically creates a webhook in GitHub pointing to `https://<your-backend-url>/api/v1/webhook/github`.
The webhook listens for the following events:
- `issues`
- `issue_comment`
- `pull_request`
- `push`
- `release`

## GitHub Token Permissions Required
The `GITHUB_TOKEN` must have the following permissions:
- **Contents**: Read & Write (to commit code)
- **Issues**: Read & Write (to analyze and comment)
- **Pull Requests**: Read & Write (to create and review)
- **Workflows**: Read & Write (to trigger actions if necessary)
- **Webhooks**: Read & Write (to auto-configure webhooks)
