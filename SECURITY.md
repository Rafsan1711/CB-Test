# Security Policy

## Supported Versions

Currently, only the latest version of ContriBot is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Security is a top priority for ContriBot. If you discover a security vulnerability, please DO NOT open a public issue.

Instead, please send an email to **security@contribot.dev** (or the maintainer's email). We will acknowledge receipt of your vulnerability report within 48 hours and strive to send you regular updates about our progress.

If you have not received a reply to your email within 48 hours, please follow up to ensure we received your message.

## Security Best Practices for Users

When self-hosting or using ContriBot, please adhere to the following best practices to keep your data and repositories secure:

### 1. Protecting API Keys
- **Never commit your `.env` files.** Ensure `.env` and `.env.local` are in your `.gitignore`.
- **Gemini API Key**: Restrict your Google Cloud API key to only the Gemini API and set billing limits to prevent unexpected charges if the key is compromised.
- **Supabase Service Key**: The `SUPABASE_SERVICE_KEY` has full administrative access to your database. Never expose this key to the frontend or public repositories.

### 2. GitHub Tokens
- ContriBot requires a GitHub Personal Access Token (PAT) to function.
- **Use Fine-grained PATs**: Whenever possible, use fine-grained personal access tokens instead of classic tokens. Grant access *only* to the specific repositories ContriBot needs to manage.
- **Minimum Required Scopes**: If using classic tokens, grant only `repo` and `workflow` scopes. Do not grant `admin:org` or `delete_repo` permissions.

### 3. Firebase Configuration
- Ensure your Firebase Security Rules are properly configured to prevent unauthorized access to your Firestore database or Storage buckets (if used).
- Restrict authorized domains in Firebase Authentication settings to only your production and development URLs.

### 4. Webhook Secrets
- Always configure a webhook secret when connecting ContriBot to a GitHub repository. The backend uses this secret to verify that incoming webhook payloads genuinely originated from GitHub.
