# The Council of Agents: Multi-Agent Architecture

To accelerate development and operation, "The Sentinel" can be divided into distinct, specialized agents working in parallel. This decoupling allows multiple AI instances to work on different parts of the system simultaneously without stepping on each other's toes.

## 🏗️ Architectural Pattern: The "Handoff" Model

Instead of one monolithic process, we treat the system as a pipeline of independent agents communicating via **Standardized Artifacts** (Files & Git Branches).

![Architecture Flow](https://mermaid.ink/img/pako:eNp1k01v2zAMhv8KoXN2gO3YcdoAA4rCduiuGzD0UqwgS41tqZElQ3GcxvjfR8lO0q7bLpZEihT58SOl9EprqZFW-VfllIbXWiuN91o_aA2vtdIPWutHrfWz1lA_aK2ftdbPWuvfWusXrfWb1vola_3HWn9orf9Y63_W-t9f1hq0fiut37XWp7_W-ovW-vLXWn_RWn_7a60_aa0_aa0_aa0_aa0_aa0_aa1_a63_aq1_a62ftdYftNZ38_n823w-f5vP59_m8_nv8_n893w-_z2fz__M5_M_-Xz-Zz6f_5XP53_l8_lf-Xz-Vz6f_zWfz__aPDs7+z6fz6f5fH46n88_zufzP_P5_Kv5fP4zn8__m8_nX_P5_Pfx8fHHzc3NH_P5_M_x8fGv-Xz-9_j4-NfNzc2f8_n87_Hx8d_Nzc3v8_n87_Hx8d_Nzc3f8_n8z_Hx8c_Nzc3f8_n89_Hx8d_Nzc3f-_v7P25vb_-ez-d_7u_v_7i9vf17Pp__ub-

### 1. 🛡️ The Watchman (Scanner Agent)
**Role**: Surveillance & Detection
**Responsibility**: Scans the codebase, normalizes data, and flags issues.
- **Inputs**: Source Code, Snyk/CodeQL CLI.
- **Outputs**: `scan-results/scan-results.json` (The Source of Truth).
- **Work Mode**: Read-Only.
- **Trigger**: Schedule (Cron) or Commit (Push).
- **Parallel Task for User**: "Build support for a new scanner (e.g., Semgrep) and output to the standard JSON format."

### 2. 🔧 The Engineer (Fixer Agent)
**Role**: Diagnosis & Patching
**Responsibility**: Reads the scan results and implements code fixes.
- **Inputs**: `scan-results.json`, Source Code.
- **Outputs**: A Verified Git Branch (`sentinel/fix-<id>`).
- **Work Mode**: Local Write (Feature Branches only).
- **Critical Logic**:
    1. Read JSON.
    2. Pick highest priority issue.
    3. Generate fix (LLM/Script).
    4. Run `npm test`.
    5. Commit change.
- **Parallel Task for User**: "Implement the logic to fix SQL Injections identified in the JSON report."

### 3. 🕊️ The Diplomat (PR Agent)
**Role**: Communication & Delivery
**Responsibility**: Pushes branches and manages Pull Requests.
- **Inputs**: A Verified Git Branch.
- **Outputs**: GitHub Pull Request URL.
- **Work Mode**: Network/API calls.
- **Critical Logic**:
    1. Detect new `sentinel/*` branches.
    2. Push to origin.
    3. Generate semantic PR title/body.
    4. Label appropriately.
- **Parallel Task for User**: "Create the Octokit module to auto-assign reviewers to created PRs."

---

## 🤝 How to Execute Simultaniously

To run this project with multiple agents (e.g., multiple AI windows or developers):

### Step 1: Define Interfaces First
We have already done this!
- **Interface A**: `scan-results.json` connects Scanner → Engineer.
- **Interface B**: Git Branches connect Engineer → Diplomat.

### Step 2: Assign Roles
You can now open 3 separate sessions and give them these specific instructions:

#### Session A (The Watchman)
> "Your goal is to improve the **Scanning Engine**. Ignor *fixing* or *PRs*. Focus solely on `src/scanners/`. Please add support for `npm audit` parsing and ensure `scan-results.json` is always perfectly formatted."

#### Session B (The Engineer)
> "Your goal is to build the **Patching Engine**. Assume `scan-results.json` already exists with vulnerabilities. Write the logic in `src/fixer/` to read that file, generate a code fix, and execute `npm test`. Output a git branch."

#### Session C (The Diplomat)
> "Your goal is to build the **PR Automation**. Assume a branch `sentinel/fix-123` exists. Write the logic in `src/pr/` to detect this branch, push it to GitHub, and open a formatted Pull Request using Octokit."

---

## 📂 Modular Directory Structure

We will refactor the generic `src/` to support this separation:

```text
src/
├── core/           # Shared Types & Rules (The Constitution)
├── agents/
│   ├── watchman/   # Scanner Logic (outputs JSON)
│   ├── engineer/   # Fixer Logic (inputs JSON -> outputs Branch)
│   └── diplomat/   # PR Logic (inputs Branch -> outputs PR)
└── index.ts        # Orchestrator (runs them in sequence if needed)
```

## 🚀 Immediate Action Plan for Parallelization

1. **Refactor**: Move `src/scanners` to `src/agents/watchman`.
2. **Scaffold**: Create `src/agents/engineer` and `src/agents/diplomat` folders.
3. **Spec**: Write `SPEC/000-architecture-refactor.md` to formalize this change.
