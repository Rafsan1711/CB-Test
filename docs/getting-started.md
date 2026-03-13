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

> **Note:** ContriBot will automatically configure a webhook in your repository to listen for new issues and PRs. You must have **admin access** to the GitHub repository for this to work.

---

## Step 3: Verify or Manually Add the Webhook (If Needed)

Usually, ContriBot sets up the webhook automatically when you click Activate. However, if it fails or you prefer to do it manually, follow these steps:

1. Go to your repository on GitHub and click on the **Settings** tab.
2. On the left sidebar, click on **Webhooks**.
3. Click the **Add webhook** button (you may be prompted to enter your GitHub password).
4. Fill in the webhook details:
   - **Payload URL:** Enter your ContriBot webhook URL (e.g., `https://<your-contribot-domain>/api/v1/webhook/github/<repo_id>`). You can find this in your ContriBot dashboard.
   - **Content type:** Select `application/json`.
   - **Secret:** Enter the Webhook Secret shown in your ContriBot dashboard.
5. Under **Which events would you like to trigger this webhook?**, select **Let me select individual events**.
6. Check the following boxes:
   - **Check runs**
   - **Issue comments**
   - **Issues**
   - **Pull requests**
7. Ensure the **Active** checkbox is ticked.
8. Click **Add webhook**.

---

## Step 4: Create an Issue

ContriBot is entirely driven by GitHub issues. You don't need to learn any new UI to assign tasks.

1. Go to your repository on GitHub.
2. Open a new **Issue**.
3. Write a clear title and description of the bug you want fixed or the feature you want added.
4. Submit the issue.

---

## Step 5: Let ContriBot Work

Once you open an issue, ContriBot springs into action automatically:

1. **Analysis:** It reads the issue, categorizes it (Bug, Feature, Docs), and plans the implementation.
2. **Interactive Approval:** If it's a major feature, ContriBot will comment on the issue asking for your permission to proceed. 
   - Simply reply with `yes` to approve the work.
   - Reply with `no` to cancel it.
3. **Coding:** ContriBot analyzes your codebase, writes the necessary code, and creates a **Pull Request (PR)**.

---

## Step 6: Review and Merge

1. Go to the **Pull Requests** tab in your GitHub repository.
2. You will see a new PR created by ContriBot containing the fix or feature.
3. ContriBot's multi-model AI system will automatically review its own PR to ensure there are no security vulnerabilities or bugs.
4. If everything looks good to you, click **Merge pull request**.

---

## Step 7: Automated CI/CD Fixes (Bonus)

If your repository has GitHub Actions (CI/CD) enabled, ContriBot monitors your test results. 
If a test fails on ContriBot's PR, **you don't need to do anything**. ContriBot will automatically read the failure logs, figure out what went wrong, and push a new commit to fix the tests!

---

## Step 8: Automated Releases

Once the PR is merged into your main branch, ContriBot will automatically:
- Calculate the next semantic version (e.g., bumping `v1.2.0` to `v1.2.1` for a bug fix).
- Update your `CHANGELOG.md`.
- Generate beautiful release notes on your GitHub Releases page.

**Congratulations!** You now have an autonomous AI software engineer working on your repository.
