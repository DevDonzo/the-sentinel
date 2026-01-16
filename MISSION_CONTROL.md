# 🚀 MISSION CONTROL: Agent Task Queue

> **Instructions for Agents**:
> 1. Find your Role below (Watchman, Engineer, or Diplomat).
> 2. Pick the first **[ ] Pending** task.
> 3. Mark it as **[x] In Progress** while working.
> 4. Mark it as **[x] Done** when finished and commit your code.
> 5. Move to the next task.

---

## 🛡️ Role: The Watchman (Scanner)
**Folder**: `src/agents/watchman/`
**Goal**: Robust vulnerability detection.

- [x] **001: Initial Snyk Integration**
    - Implement basic `snyk test --json` wrapper.
    - Parse outputs and save to `scan-results.json`.
- [ ] **002: Reliability Layer**
    - Add retry logic for the `exec` command (Snyk API sometimes times out).
    - Handle cases where `snyk` is not in the system PATH gracefully.
- [ ] **003: Multi-Scanner Support**
    - Add support for `npm audit --json` as a fallback if Snyk fails.
    - Normalize `npm audit` output to match the `ScanResults` interface.
- [ ] **004: Dashboarding**
    - Generate a simple HTML report alongside the JSON for human review.

---

## 🔧 Role: The Engineer (Fixer)
**Folder**: `src/agents/engineer/`
**Goal**: Autonomous remediation (Safe & Correct).

- [x] **001: Simulation Engine**
    - Read `scan-results.json` and prioritize issues.
    - "Simulate" git operations via logs.
- [ ] **002: Real Git Operations**
    - create `src/agents/engineer/git.ts`.
    - Implement `checkoutBranch(name)`, `commit(message)`, `push()`.
    - Replace console mocks in `applyFix()` with real calls.
- [ ] **003: Package Patcher**
    - Implement logic to actually read `package.json`, find the dependency, and update the version string.
    - Run `npm install` to update `package-lock.json`.
- [ ] **004: Verification Loop**
    - Before committing, run `npm test`.
    - If tests fail, rollback changes and log the failure.

---

## 🕊️ Role: The Diplomat (PR Automation)
**Folder**: `src/agents/diplomat/`
**Goal**: Effective communication.

- [x] **001: PR Framework**
    - Logic to detect branches and format PR bodies.
    - Mock mode for missing tokens.
- [ ] **002: Real API Integration**
    - Verify `GITHUB_TOKEN` permissions.
    - Ensure `createPullRequest` actually hits the GitHub API.
- [ ] **003: Smart Labelling**
    - Add logic to label PRs based on severity (e.g., `severity:critical`, `vuln:snyk`).
- [ ] **004: Assignee Management**
    - Automatically assign the PR to the repo owner or a specific user defined in `.env`.

---

## 🧠 Role: The Architect (Orchestrator)
**Folder**: `src/index.ts`
**Goal**: Component wiring.

- [x] **001: Integration**
    - Wire Watchman -> Engineer -> Diplomat in the main loop.
- [ ] **002: Parallelism**
    - Allow The Sentinel to fix multiple vulnerabilities in one run (currently stops after the first critical one).
- [ ] **003: Config Loading**
    - Move hardcoded thresholds (e.g., "Critical" only) to a config file.
