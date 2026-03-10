# Getting Started with ContriBot

Welcome to ContriBot! Follow these steps to set up your autonomous AI contributor.

## Prerequisites Checklist
Before you begin, ensure you have:
- [ ] A GitHub account
- [ ] A Google Cloud account (for Gemini API)
- [ ] A Firebase account
- [ ] A Supabase account
- [ ] A HuggingFace account

## Step 1: Firebase Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Navigate to **Authentication** and enable **Email/Password** and **GitHub** sign-in methods.
3. Go to **Project Settings > Service Accounts** and generate a new private key. Save this JSON file; you will need it later.

## Step 2: Supabase Setup
1. Create a new project in [Supabase](https://supabase.com/).
2. Navigate to the **SQL Editor** and run the provided schema script (found in `backend/schema.sql`) to create the necessary tables (`users`, `repos`, `tasks`).
3. Go to **Project Settings > API** and copy your `Project URL` and `service_role` secret key.

## Step 3: HuggingFace Space Setup
1. Create a new Space on [HuggingFace](https://huggingface.co/spaces) using the Docker template.
2. Connect your GitHub repository containing the ContriBot backend code.
3. In the Space settings, add the following Secrets:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `FIREBASE_SERVICE_ACCOUNT` (Paste the entire JSON string)
   - `GITHUB_TOKEN` (See Step 4)

## Step 4: GitHub ContriBot Account Setup
We recommend creating a dedicated GitHub account for ContriBot (e.g., `your-project-bot`).
1. Log in to the bot account.
2. Go to **Settings > Developer settings > Personal access tokens > Tokens (classic)**.
3. Generate a new token with `repo` and `workflow` scopes.
4. Add this token as `GITHUB_TOKEN` in your HuggingFace Space secrets.

## Step 5: First Login
1. Open the ContriBot frontend URL.
2. Click **Sign In** and authenticate using your personal GitHub account or Email/Password.
3. You will be redirected to the ContriBot Dashboard.

## Step 6: Adding Your First Repository
1. On the Dashboard, click **Add Repository**.
2. Enter the full name of the repository you want ContriBot to manage (e.g., `your-username/your-repo`).
3. Ensure the ContriBot GitHub account has write access to this repository.

## Step 7: Activating ContriBot
1. Once the repository is added, click the **Settings** gear icon next to it.
2. Toggle **Enable Webhooks** to active. ContriBot will automatically configure the necessary webhooks in your GitHub repository.
3. You're all set! Create a new issue in your repository to see ContriBot in action.
