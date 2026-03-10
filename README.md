<!-- banner -->
<div align="center">
  <img src="public/contribot-logo.png" alt="ContriBot Logo" width="150" />
  <h1>ContriBot</h1>
  <p><strong>A Gemini-powered autonomous GitHub repository manager.</strong></p>

  [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
  [![Built with Gemini](https://img.shields.io/badge/Built_with-Gemini-8A2BE2.svg)](https://deepmind.google/technologies/gemini/)
  [![Deployed on HuggingFace](https://img.shields.io/badge/Deployed_on-HuggingFace-FCD21D.svg)](https://huggingface.co/)
  [![Made with FastAPI](https://img.shields.io/badge/Made_with-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
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

## 🏗️ Architecture

```text
  [GitHub Webhooks] 
         │
         ▼
  ┌──────────────┐       ┌───────────────┐
  │ FastAPI App  │ ────▶ │ Supabase (DB) │
  └──────────────┘       └───────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ AgentOrchestrator│ ──▶ │ Gemini AI Models │
└──────────────────┘     └──────────────────┘
         │
         ▼
  [GitHub API (PyGithub)]
```

## 🚀 Quick Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ContriBot.git
   cd ContriBot/backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

4. **Run the backend locally:**
   ```bash
   uvicorn main:app --reload --port 7860
   ```

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you would like to change. 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
