# The Sentinel

**Autonomous SRE & Security Orchestration Agent**

The Sentinel is a production-grade, self-healing security agent designed to live within your GitHub ecosystem. It autonomously identifies vulnerabilities using enterprise tools, generates verified patches, and submits professional Pull Requests—all without human intervention.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)
[![Security: Snyk](https://img.shields.io/badge/Security-Snyk-7001FF?style=for-the-badge&logo=snyk&logoColor=white)](https://snyk.io/)

---

## Key Features

- **Remote Patrol**: Supports patrolling any public or private GitHub repository. Simply provide the URL, and the Sentinel will clone, scan, and propose fixes.
- **Deep Scanning**: Integrated with Snyk for dependency and container analysis, with a robust fallback to npm audit.
- **Autonomous Diagnosis**: Intelligent prioritization of Critical and High-severity vulnerabilities.
- **Self-Healing**: Automatically creates fix branches and patches package.json with secure versions.
- **Verification Pipeline**: Every fix is validated via npm install and npm test before a PR is proposed.
- **Professional Pull Requests**: Generates semantic Pull Requests with security labels, vulnerability details, and auto-assigned reviewers.
- **Safeguarded Operations**: Operates under a strict "Rules of Engagement" constitution preventing unauthorized merges or access to secrets.

---

## Architecture

The Sentinel operates as a coordinate "Council of Agents," ensuring separation of concerns and high reliability.

### The Agent Council
1. **The Watchman (Scanner)**: Monitors the environment for threats. Implements retry logic and atomic reporting.
2. **The Engineer (Fixer)**: Analyzes threats and applies precision code patches on isolated feature branches.
3. **The Diplomat (Liaison)**: Manages the downstream communication and PR lifecycle on GitHub.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Snyk CLI installed (`npm install -g snyk`)
- GitHub CLI authenticated (`gh auth login`)

### Installation

```bash
git clone https://github.com/DevDonzo/the-sentinel.git
cd the-sentinel
npm install
```

### Configuration

Create a .env file with the following required variables:
`GITHUB_TOKEN`, `SNYK_TOKEN`, and `GITHUB_ASSIGNEE`.

---

## Usage

### Mode 1: Local Patrol (Default)
Scan and fix the current project directory:
```bash
npm run build && npm start
```

### Mode 2: Remote Patrol (Power User)
Scan and fix any external repository. The Sentinel will clone the repo into a workspace, perform the full security cycle, and submit PRs to that repo.
```bash
npm run build && npm start https://github.com/username/target-repo.git
```

---

## Project Structure

- `SENTINEL_CORE.md`: The security constitution (Rules of Engagement).
- `SPEC/`: Task specifications for the agent council.
- `workspaces/`: Temporary area for remote repo patrolling (gitignored).
- `scan-results/`: Centralized audit logs for all patrols.

---

## Rules of Engagement

The Sentinel is governed by SENTINEL_CORE.md. Modifications to this file change the agent's fundamental safety parameters. It is highly recommended to review this file before deploying in a production environment.

---

## License

Distributed under the ISC License. See LICENSE for more information.

---

*Built for high-velocity teams who prioritize security without compromising on speed.*
