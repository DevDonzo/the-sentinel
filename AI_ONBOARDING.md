# The Sentinel: Project Constitution & AI Onboarding Guide

> **Target Audience**: AI Agents (Claude, Gemini, GPT) & Human Developers.
> **Mission**: Build a "Self-Healing" autonomous agent that secures codebases by scanning, patching, and submitting PRs.

---

## 1. Core Identity & Philosophy
**The Sentinel** is a TypeScript-based autonomous SRE agent. It does not just "report" issues; it **fixes** them.

### The "Brain" (Operating Logic)
- **Spec-Driven Development (SDD)**: The agent **MUST** read the `SPEC/` directory before executing any task. No work is done without a spec.
- **Project Constitution**: The file `SENTINEL_CORE.md` contains the "Rules of Engagement". This file is Read-Only for the agent and determines safety limits (e.g., "Never merge to main without approval").
- **Primary Loop**: `Scan` → `Diagnose` → `Patch` → `Test` → `Propose (PR)`.

---

## 2. Technical Architecture

### Stack
- **Runtime**: Node.js / TypeScript.
- **Security Tools**:
    - **Snyk** (Dependency & Container scanning).
    - **CodeQL** (Logic scanning).
- **Integration**:
    - `@octokit/rest` (GitHub interactions).
    - `child_process` (Running system shell commands).

### Directory Structure
```
the-sentinel/
├── SENTINEL_CORE.md    # The Immutable Rules of Engagement.
├── SPEC/               # Task definitions (SDD). Agent reads these to know what to do.
├── src/
│   ├── index.ts        # Entry point. Initializes system and loads rules/specs.
│   ├── core/           # Logic for loading Rules and Specs.
│   ├── scanners/       # Wrappers for external tools (Snyk, CodeQL).
│   ├── fixer/          # (Planned) AI module to generating code patches.
│   ├── pr/             # (Planned) GitHub API handling for PRS.
│   └── utils/          # Helpers.
└── dist/               # Compiled JS output.
```

---

## 3. Workflow for AI Agents
If you are an AI picking up this project, follow this exact sequence:

1.  **Read the Rules**: Start by reading `SENTINEL_CORE.md`. This tells you what you are *forbidden* from doing.
2.  **Read the Specs**: Look in `SPEC/`. The current active specs define your immediate goals.
3.  **Execute the Loop**:
    *   **Scan**: Run the configured scanner (e.g., `snyk test --json`).
    *   **Parse**: Extract "High" or "Critical" vulnerabilities.
    *   **Branch**: Create a git branch `sentinel/fix-<id>`.
    *   **Fix**: Apply code changes.
    *   **Verify**: Run `npm test` AND re-run the scanner.
    *   **PR**: Open a PR with a detailed summary.

---

## 4. Comprehensive Project Roadmap

### ✅ Milestone 1: Foundation & Safety layer (Completed)
**Goal**: Initialize the "Brain" and "Body" of the agent.
- [x] **Project Init**: TypeScript/Node.js environment with `src/` to `dist/` pipeline.
- [x] **Safety Layer**: Create `SENTINEL_CORE.md` (Rules of Engagement) and `src/core/rules.ts` to enforce them.
- [x] **SDD Framework**: Create `SPEC/` directory and `src/core/spec.ts` for Spec-Driven Development.
- [x] **Scanner Integration**: Basic `snyk` CLI wrapper structure.

### ✅ Milestone 2: "The Watchman" (Completed)
**Goal**: Build the eyes of the agent. It must scan without intervention.
- [x] **Snyk Integration**: Implement `src/scanners/snyk.ts` to run `snyk test --json`.
- [x] **Parsing Logic**: Create a utility to parse JSON output and filter for "Critical" or "High" severity issues.
- [x] **Reporting**: Output findings to a standardized `scan-results.json` artifact.
- [x] **Demo Mode**: Fallback to mock data when Snyk CLI is unavailable for testing.
- [ ] **CodeQL Setup**: (Optional/Future) Initialize CodeQL scanning for deep logic flaws (SQLi, XSS).

### 🚧 Milestone 3: "The Engineer" (Current Focus - Auto-Patching)
**Goal**: The agent effectively diagnoses and patches the code.
- [ ] **Diagnosis Engine**: Create an LLM interface (Claude/Gemini) that reads `scan-results.json` and project context to propose specific fixes.
- [ ] **Git Operations**:
    - automated branch creation: `sentinel/fix-<vuln-id>`.
    - `checkout` mechanics.
- [ ] **The Fixer Module**: A module that applies the LLM-generated code patches to the file system.
- [ ] **Verification**:
    - Run `npm test` to ensure no regressions.
    - Re-run `snyk test` to confirm the vulnerability is gone.

### 🔮 Milestone 4: "The Diplomat" (PR Automation)
**Goal**: Communicate the fix professionally to humans.
- [ ] **GitHub Integration**: Use `@octokit/rest` to interface with the repo.
- [ ] **PR Generation**: Construct a Pull Request with:
    - Title: `[SECURITY] Fix for <Vulnerability Name>`.
    - Body: Vulnerability explanation, fix description, and verification results.
    - Labels: `security`, `automated-fix`.

### 🔮 Milestone 5: "The Sentinel" (Full Autonomy)
**Goal**: The agent protects the repo continuously.
- [ ] **CI/CD Triggers**: Create `.github/workflows/sentinel.yml`.
    - Trigger on: `push`, `schedule` (cron).
    - Permissions: `write` access for PRs.
- [ ] **Environment Handling**: Securely passing API keys in GitHub Secrets.

### 🔮 Milestone 6: SRE Monitoring (Optional / Future)
**Goal**: Active server health checks.
- [ ] **Health Checks**: Integration with Termius or SSH to ping live servers.
- [ ] **Auto-Recovery**: Script to restart services (e.g., `systemctl restart app`) if they are down.

---

## 5. Critical Instructions for the AI
- **Always** use `Octokit` for GitHub interactions.
- **Never** modify `SENTINEL_CORE.md`.
- **Always** verify a fix with a test before moving to the PR stage.
- If the Snyk CLI is missing, the code should fail gracefully or ask the user to install it.
