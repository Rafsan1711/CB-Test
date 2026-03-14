# Getting Started with ContriBot

Welcome to ContriBot! This guide will help you, as a repository owner or maintainer, get started with using ContriBot to automate your GitHub workflow. 

You **do not** need to install any servers, databases, or write any configuration files to use ContriBot. Just connect your repository and let the AI do the heavy lifting!

---

## Step 1: Sign In to the Dashboard

1. Open the ContriBot web application in your browser.
2. Click **Sign In** and authenticate securely using your Google account.
3. You will be redirected to your personal ContriBot Dashboard.

---

## Step 2: Connect Your Repository

To let ContriBot manage your repository, you need to add it to your dashboard.

1. On the Dashboard, click the **Add Repository** button.
2. Enter the full name of your GitHub repository (e.g., `octocat/Hello-World`).
3. Click **Activate**. 

> **Critical Requirement:** You must have **admin access** to the GitHub repository for ContriBot to automatically configure the necessary webhooks.

---

## Step 3: Configure AI Engine (Settings)

Before starting, ensure your AI engine is configured for the best results.

1. Go to your repository's **Settings** tab in ContriBot.
2. Ensure **DeepSeek-R1** is selected as your primary AI engine (it is the default for best reasoning).
3. Click **Test AI Connection** to verify that your `GEMINI_API_KEY` (for fallback) and `HF_TOKEN` (for DeepSeek) are correctly configured.

---

## Step 4: Verify Webhook Status

1. In your ContriBot Dashboard, check the **Repo Health** section.
2. Ensure **Webhook Status** is **Active**.
3. If it shows "Inactive", click **Deactivate** and then **Activate** again to force a webhook registration.

---

## Step 5: Create an Issue

ContriBot is entirely driven by GitHub issues.

1. Go to your repository on GitHub.
2. Open a new **Issue**.
3. Write a clear title and description of the bug or feature.
4. Submit the issue.

---

## Step 6: Let ContriBot Work

Once you open an issue, ContriBot springs into action:

1. **Analysis:** It reads the issue and plans the implementation.
2. **Interactive Approval:** If it's a major feature, ContriBot will comment on the issue asking for permission.
   - Reply with `yes` to approve.
   - Reply with `no` to cancel.
3. **Coding:** ContriBot analyzes your codebase, writes the necessary code, and creates a **Pull Request (PR)**.

---

## Step 7: Review and Merge

1. Go to the **Pull Requests** tab in your GitHub repository.
2. Review the PR created by ContriBot.
3. ContriBot's multi-model AI system will automatically review its own PR to ensure quality and security.
4. If everything looks good, click **Merge pull request**.

---

## Step 8: Automated CI/CD and Releases

- **CI/CD Fixes:** If a test fails on ContriBot's PR, ContriBot will automatically read the failure logs and push a new commit to fix the tests.
- **Automated Releases:** Once merged, ContriBot will automatically calculate the next semantic version, update `CHANGELOG.md`, and generate release notes.

**Congratulations!** You now have an autonomous AI software engineer working on your repository.
