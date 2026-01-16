# 🕊️ The Diplomat - GitHub PR Agent

## Overview

The Diplomat is a specialized agent within The Sentinel system responsible for managing GitHub Pull Requests. It automates the process of pushing security fix branches and creating well-formatted PRs with appropriate labels and documentation.

## Role & Responsibilities

**Role**: Communication & Delivery  
**Responsibility**: Pushes branches and manages Pull Requests

### Inputs
- Verified Git Branches (created by The Engineer)
- Branch naming pattern: `sentinel/*`

### Outputs
- GitHub Pull Request URLs
- Automated PR labels: `security`, `automated`

### Work Mode
- Network/API calls via Octokit
- No direct code modifications

## Critical Logic

1. **Detect** new `sentinel/*` branches
2. **Push** branches to origin
3. **Generate** semantic PR title/body
4. **Create** PR using GitHub API
5. **Label** appropriately

## Features

### 1. PR Title Generation
Automatically formats PR titles as:
```
[SECURITY] Fix for <Vulnerability Name>
```

Example:
- Branch: `sentinel/fix-lodash` → Title: `[SECURITY] Fix for Lodash`
- Branch: `sentinel/fix-sql-injection` → Title: `[SECURITY] Fix for Sql Injection`

### 2. PR Body Generation
Creates comprehensive PR descriptions with:
- 🛡️ Security context
- Vulnerability details (ID, severity, description)
- Changes summary
- Review checklist

### 3. Branch Detection
Scans for local `sentinel/*` branches ready for PR creation.

### 4. Automated Labeling
Adds labels to PRs:
- `security` - Indicates security-related changes
- `automated` - Marks as bot-generated

### 5. Error Handling
Provides helpful diagnostics for common issues:
- Missing or invalid GitHub token
- Branch already has PR
- Repository not found
- Permission errors

## Configuration

### Environment Variables

Required for real PR creation:
```bash
GITHUB_TOKEN=your_github_personal_access_token
```

Optional (fallback if git remote parsing fails):
```bash
GITHUB_OWNER=your_github_username_or_org
GITHUB_REPO=the-sentinel
```

### GitHub Token Setup

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Required scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (if you want to trigger workflows)
4. Copy token to `.env` file

## Usage

### Basic Usage

```typescript
import { DiplomatAgent } from './agents/diplomat';

const diplomat = new DiplomatAgent();

// Create a single PR
await diplomat.createPullRequest({
    branch: 'sentinel/fix-lodash',
    title: '[SECURITY] Fix for Lodash Vulnerability',
    body: 'Automated security patch...'
});
```

### Full Workflow

```typescript
// Process all sentinel branches automatically
const prUrls = await diplomat.processAllSentinelBranches();
console.log(`Created ${prUrls.length} PRs`);
```

### Custom PR with Vulnerability Details

```typescript
const title = diplomat.generatePrTitle(
    'sentinel/fix-lodash',
    'Lodash Prototype Pollution'
);

const body = diplomat.generatePrBody(
    'SNYK-JS-LODASH-590103',
    'Critical',
    'Prototype Pollution vulnerability in lodash versions < 4.17.12'
);

await diplomat.createPullRequest({
    branch: 'sentinel/fix-lodash',
    title,
    body
});
```

## Mock Mode

When `GITHUB_TOKEN` is not set, the Diplomat runs in **MOCK MODE**:
- Logs what it would do
- Returns mock PR URLs
- Useful for testing and development
- No actual API calls made

## API Reference

### `DiplomatAgent`

#### Constructor
```typescript
constructor()
```
Initializes Octokit with `GITHUB_TOKEN` if available.

#### Methods

##### `createPullRequest(config: PrConfig): Promise<string>`
Creates a GitHub Pull Request.

**Parameters:**
- `config.branch` - Branch name to create PR from
- `config.title` - PR title
- `config.body` - PR description

**Returns:** PR URL

##### `detectSentinelBranches(): Promise<string[]>`
Detects all local `sentinel/*` branches.

**Returns:** Array of branch names

##### `pushBranch(branch: string): Promise<boolean>`
Pushes a branch to remote origin.

**Returns:** `true` if successful

##### `generatePrTitle(branch: string, vulnerabilityName?: string): string`
Generates formatted PR title.

**Returns:** `[SECURITY] Fix for <Vulnerability Name>`

##### `generatePrBody(vulnerabilityId?: string, severity?: string, description?: string): string`
Generates comprehensive PR body.

**Returns:** Formatted markdown PR description

##### `processAllSentinelBranches(): Promise<string[]>`
Full workflow: detect, push, and create PRs for all sentinel branches.

**Returns:** Array of PR URLs

## Integration with Other Agents

### The Engineer → The Diplomat

The Engineer creates fix branches:
```bash
git checkout -b sentinel/fix-lodash
# Apply fixes
git commit -m "Fix lodash vulnerability"
```

The Diplomat detects and creates PRs:
```typescript
const diplomat = new DiplomatAgent();
await diplomat.processAllSentinelBranches();
```

## Testing

Run the demo script:
```bash
npm run dev -- src/agents/diplomat/demo.ts
```

Or with ts-node:
```bash
npx ts-node src/agents/diplomat/demo.ts
```

## Troubleshooting

### "No GITHUB_TOKEN found"
- Add `GITHUB_TOKEN` to `.env` file
- Ensure `.env` is loaded with `dotenv.config()`

### "Branch may not exist on remote"
- Push the branch manually first: `git push -u origin sentinel/fix-xyz`
- Or let the Diplomat push it: `diplomat.pushBranch(branch)`

### "Repository not found"
- Check git remote: `git remote -v`
- Set `GITHUB_OWNER` and `GITHUB_REPO` in `.env`

### "PR already exists"
- GitHub prevents duplicate PRs for the same branch
- Close existing PR or use a different branch

## Future Enhancements

- [ ] Auto-assign reviewers
- [ ] Configurable base branch (not just `main`)
- [ ] Support for draft PRs
- [ ] Integration with CI/CD status checks
- [ ] Automatic PR merging for low-risk fixes
- [ ] Slack/Discord notifications

## License

Part of The Sentinel project.
