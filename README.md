# The Sentinel 🛡️

**Autonomous SRE & Security Orchestration Agent**

An intelligent, self-healing security agent that lives in your GitHub repository, identifies vulnerabilities using enterprise-grade tools, writes verified fixes, and autonomously submits Pull Requests.

## 🎯 Mission

Build a fully autonomous agent that:
- 🔍 **Scans** your codebase for security vulnerabilities
- 🧠 **Diagnoses** issues using AI-powered analysis
- 🔧 **Patches** code automatically
- ✅ **Verifies** fixes with tests and re-scans
- 📝 **Proposes** changes via professional Pull Requests

## 🏗️ Architecture

### The "Brain" (Operating Logic)
- **Spec-Driven Development (SDD)**: Reads `SPEC/` directory before executing tasks
- **Safety Layer**: `SENTINEL_CORE.md` enforces rules (never merge to main without approval)
- **Primary Loop**: Scan → Diagnose → Patch → Test → Propose (PR)

### The "Body" (Tech Stack)
- **Language**: TypeScript / Node.js
- **Security Scanners**:
  - Snyk (dependency & container scanning)
  - CodeQL (deep logic scanning - planned)
- **GitHub Integration**: `@octokit/rest`
- **CI/CD**: GitHub Actions (planned)

## 📂 Project Structure

```
the-sentinel/
├── SENTINEL_CORE.md       # Rules of Engagement (immutable)
├── AI_ONBOARDING.md       # Complete guide for AI agents
├── MULTI_AGENT_ARCHITECTURE.md  # Architecture design
├── SPEC/                  # Task specifications
│   ├── 001-baseline.md    # Initial security baseline
│   └── 002-auto-fix.md    # Auto-fixing specification
├── src/
│   ├── index.ts           # Main orchestrator
│   ├── core/              # Rules & spec loading
│   │   ├── rules.ts       # Rules of Engagement loader
│   │   └── spec.ts        # Spec-Driven Development loader
│   ├── agents/
│   │   ├── watchman/      # 🛡️ Scanner Agent (Snyk + npm audit)
│   │   ├── engineer/      # 🔧 Fixer Agent (diagnosis & patching)
│   │   └── diplomat/      # 🕊️ PR Agent (GitHub automation)
│   └── utils/             # Helpers & mock data
├── scan-results/          # Scan output (gitignored)
└── dist/                  # Compiled output
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Snyk CLI: `npm install -g snyk`

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd the-sentinel

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your tokens:
# - GITHUB_TOKEN
# - SNYK_TOKEN

# Authenticate with Snyk
snyk auth

# Build the project
npm run build

# Run The Sentinel
npm start
```

## 📊 Current Status

### ✅ Milestone 1: Foundation & Safety Layer (Complete)
- TypeScript/Node.js environment
- Rules of Engagement system
- Spec-Driven Development framework
- Basic scanner integration

### ✅ Milestone 2: "The Watchman" (Complete)
- Full Snyk integration with JSON parsing
- npm audit fallback scanner
- HTML report generation
- Vulnerability filtering (Critical/High priority)
- Automated scan result storage

### ✅ Milestone 3: "The Engineer" (Complete)
- Diagnosis engine that reads scan results
- Automated code patching (package.json updates)
- Git branch management (`sentinel/fix-*` branches)
- Fix verification with `npm test`
- Auto-revert on test failure

### ✅ Milestone 4: "The Diplomat" (Complete)
- GitHub PR automation via Octokit
- Auto-labeling (`security`, `severity:*`)
- Auto-assignment of reviewers
- Branch detection and pushing
- Semantic PR title/body generation

### 🔮 Upcoming Milestones
- **Milestone 5**: CI/CD Integration (GitHub Actions triggers)
- **Milestone 6**: SRE Monitoring (Optional - health checks & auto-recovery)

## 🎮 Usage

### Run The Full Pipeline

```bash
npm start
```

The Sentinel will:
1. Load Rules of Engagement from `SENTINEL_CORE.md`
2. Read active specifications from `SPEC/`
3. **Watchman**: Execute security scans (Snyk → npm audit fallback)
4. Filter high-priority vulnerabilities (Critical/High)
5. **Engineer**: Create fix branch, patch `package.json`, run `npm install`, verify with `npm test`
6. **Diplomat**: Push branch to GitHub and create a Pull Request with labels

### Development Mode

```bash
npm run dev
```

## 📋 Specifications

Specifications live in the `SPEC/` directory and define what The Sentinel should do.

**Current Specs:**
- `001-baseline.md`: Run baseline Snyk scan and identify high-priority issues

## 🔒 Safety Features

The Sentinel follows strict rules defined in `SENTINEL_CORE.md`:

1. **Never merge to main** without human approval
2. **Never touch sensitive files** (.env, secrets, keys)
3. **Always verify fixes** with tests and re-scans before proposing
4. **Always work on feature branches** (`sentinel/fix-*`)

## 🤖 For AI Agents

If you're an AI working on this project, **read `AI_ONBOARDING.md` first**. It contains:
- Complete project context
- Detailed milestone roadmap
- Workflow instructions
- Critical safety rules

## 📝 License

ISC

## 🙏 Acknowledgments

Built with:
- GitHub Student Developer Pack
- Google AI Pro
- Snyk Security Platform
