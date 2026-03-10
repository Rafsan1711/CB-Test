# Contributing to ContriBot

First off, thank you for considering contributing to ContriBot! It's people like you that make ContriBot such a great tool.

## Code of Conduct
By participating in this project, you are expected to uphold our Code of Conduct. Please treat all contributors with respect and professionalism.

## How to Report Bugs
If you find a bug, please open an issue on GitHub. Include:
- A clear and descriptive title.
- Steps to reproduce the bug.
- Expected behavior vs actual behavior.
- Screenshots or logs if applicable.
- Your environment details (OS, Node version, Python version).

## How to Suggest Features
We welcome feature requests! Open an issue and use the "Feature Request" label. Describe:
- The problem you are trying to solve.
- Your proposed solution.
- Any alternatives you have considered.

## Development Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Firebase project
- Supabase project
- Google Gemini API Key

### 1. Clone the repository
```bash
git clone https://github.com/your-username/contribot.git
cd contribot
```

### 2. Frontend Setup
```bash
npm install
# Copy .env.example to .env.local and fill in your Firebase/Supabase details
cp .env.example .env.local
npm run dev
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Copy .env.example to .env and fill in your API keys
cp .env.example .env
uvicorn main:app --reload --port 8000
```

## Code Style Guide
- **Python**: We follow PEP 8. Use `flake8` for linting and `black` for formatting.
- **TypeScript/React**: We use ESLint and Prettier. Run `npm run lint` before committing.

## Pull Request Guidelines
1. Fork the repository and create your branch from `main`.
2. Name your branch descriptively: `feat/add-new-model`, `fix/login-bug`, `docs/update-readme`.
3. If you've added code that should be tested, add tests.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that PR!

## Commit Message Format
We follow [Conventional Commits](https://www.conventionalcommits.org/). This is crucial because ContriBot uses these commit messages to automatically generate release notes and determine semantic version bumps.

Format: `<type>(<scope>): <description>`

**Types:**
- `feat`: A new feature (triggers a MINOR bump)
- `fix`: A bug fix (triggers a PATCH bump)
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

**Example:**
`feat(auth): add GitHub OAuth login`
`fix(api): resolve null pointer exception in webhook handler`

If your commit introduces a breaking change, append a `!` after the type/scope:
`feat(api)!: change response format for issues endpoint` (triggers a MAJOR bump)
