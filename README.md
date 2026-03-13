<!-- banner -->
<div align="center">
  <img src="public/contribot-logo.png" alt="ContriBot Logo" width="150" />
  <h1>ContriBot</h1>
  <p><strong>A Gemini-powered autonomous GitHub repository manager.</strong></p>

  [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
  [![Built with Gemini](https://img.shields.io/badge/Built_with-Gemini-8A2BE2.svg)](https://deepmind.google/technologies/gemini/)
  [![Made with FastAPI](https://img.shields.io/badge/Made_with-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
  [![Made with React](https://img.shields.io/badge/Made_with-React-61DAFB.svg)](https://reactjs.org/)
</div>

---

## 📖 Overview

**ContriBot** acts as an autonomous software engineer and project manager for your GitHub repositories. By leveraging Google's Gemini AI models, ContriBot can automatically analyze issues, write code, submit pull requests, review code, and manage semantic releases—all without manual intervention.

## ✨ Features

- **🧠 Intelligent Issue Analysis**: Automatically categorizes incoming issues (bug, feature, docs) and assesses complexity.
- **💻 Autonomous Code Generation**: Writes production-ready code to resolve bugs and implement approved features.
- **🛡️ Multi-Model PR Verification**: Uses a consensus of 4 different Gemini models to rigorously review PRs for bugs, security vulnerabilities, and best practices.
- **🚀 Automated Releases**: Determines semantic version bumps (Major/Minor/Patch) and generates beautiful, Keep-a-Changelog formatted release notes.
- **💬 Interactive Approvals**: Asks repository owners for permission before implementing major features via GitHub comments (`yes`/`no`).
- **🛠️ Self-Healing CI/CD**: Automatically reads CI/CD failure logs and pushes fixes to resolve broken builds.

---

## 🚀 Getting Started: 100% Complete Setup Guide

Follow these steps carefully to set up ContriBot. It requires a few external services (Firebase, Supabase, GitHub) to function correctly.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.10+)
- A [GitHub](https://github.com/) account
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Step 1: Database Setup (Supabase)
ContriBot uses Supabase as its PostgreSQL database.
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Go to **SQL Editor** in your Supabase dashboard.
3. Copy the contents of `database/schema.sql` from this repository and run it in the SQL Editor.
4. Go to **Project Settings > API**.
5. Copy the **Project URL** and the **`service_role` secret key** (Do NOT use the `anon` public key for the backend).

### Step 2: Authentication Setup (Firebase)
ContriBot uses Firebase for user authentication.
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Go to **Authentication > Sign-in method** and enable **Google**.
3. Go to **Project Settings > General** and add a **Web App**. Copy the `firebaseConfig` object.
4. Go to **Project Settings > Service accounts** and click **Generate new private key**. Download the JSON file.

### Step 3: GitHub Setup (Personal Access Token)
ContriBot needs permission to read your repos, write code, and configure webhooks.
1. Go to your GitHub [Personal Access Tokens (Classic)](https://github.com/settings/tokens).
2. Click **Generate new token (classic)**.
3. Give it a name (e.g., "ContriBot") and select the following scopes:
   - `repo` (Full control of private repositories)
   - `admin:repo_hook` (Full control of repository hooks)
   - `workflow` (Update GitHub Action workflows)
4. Click **Generate token** and copy the token (`ghp_...`).

### Step 4: Backend Configuration
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Edit the `.env` file with your keys:
   - `GEMINI_API_KEY`: Your Gemini API Key.
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_SERVICE_KEY`: Your Supabase `service_role` key.
   - `GITHUB_TOKEN`: Your GitHub PAT (`ghp_...`).
   - `FIREBASE_SERVICE_ACCOUNT`: The minified JSON content of the Firebase service account file you downloaded.
   - `WEBHOOK_BASE_URL`: The public URL where your backend is hosted (e.g., your ngrok URL or deployed URL). **Crucial for webhooks!**

4. Start the backend server:
   ```bash
   uvicorn main:app --reload --port 7860
   ```

### Step 5: Frontend Configuration
1. Open a new terminal and navigate to the root folder:
   ```bash
   npm install
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```
3. Edit `.env.local` and add your Firebase config (from Step 2) and Backend URL:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_BACKEND_URL=http://localhost:7860
   ```
4. Start the frontend server:
   ```bash
   npm run dev
   ```

### Step 6: Activating ContriBot on a Repository
1. Open the frontend app in your browser (usually `http://localhost:5173`).
2. Log in using your Google account.
3. Click **Add Repository** and enter your repository name in the format `owner/repo` (e.g., `octocat/Hello-World`).
4. Click **Activate**. ContriBot will automatically register a webhook in your GitHub repository.

---

## ❓ Troubleshooting: "Why is it not working after I open an issue?"

If you open an issue on GitHub and ContriBot doesn't respond, check the following:

1. **Is the Webhook URL accessible?**
   GitHub needs to send a POST request to your backend. If your `WEBHOOK_BASE_URL` is `http://localhost:7860`, GitHub cannot reach it. You must use a tool like [ngrok](https://ngrok.com/) (`ngrok http 7860`) and set `WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok-free.app` in your backend `.env`.
   
2. **Did the Webhook register successfully?**
   Go to your GitHub Repository -> **Settings** -> **Webhooks**. You should see a webhook pointing to your `WEBHOOK_BASE_URL/api/v1/webhook/github/{repo_id}`. If it has a red warning icon, click it to see the error delivery logs.

3. **Are background tasks running?**
   Check your backend terminal logs. You should see `INFO: Received event: issues action: opened`. If you don't see this, the webhook isn't reaching your server.

4. **Is the GitHub Token valid?**
   Ensure your `GITHUB_TOKEN` hasn't expired and has the `repo` and `admin:repo_hook` permissions.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you would like to change. 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
