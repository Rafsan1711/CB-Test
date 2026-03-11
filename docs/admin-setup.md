# ContriBot Infrastructure Setup (Admin Guide)

This guide is for administrators who need to deploy and configure the ContriBot infrastructure.

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
2. Navigate to the **SQL Editor** and run the provided schema script (found in `database/schema.sql`) to create the necessary tables (`users`, `repos`, `tasks`).
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
