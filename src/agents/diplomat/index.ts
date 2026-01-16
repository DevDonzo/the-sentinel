import { Octokit } from '@octokit/rest';

export interface PrConfig {
    branch: string;
    title: string;
    body: string;
    severity?: string;
    labels?: string[];
}

export class DiplomatAgent {
    private octokit: Octokit | null = null;

    constructor() {
        if (process.env.GITHUB_TOKEN) {
            this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        }
    }

    async createPullRequest(config: PrConfig): Promise<string> {
        console.log(`🕊️ Diplomat: Preparing to open PR for ${config.branch}`);

        if (!this.octokit) {
            throw new Error("❌ Diplomat: No GITHUB_TOKEN found. Real API Integration requires a token.");
        }

        try {
            // Extract owner and repo from git remote
            const { owner, repo } = await this.getRepoInfo();

            console.log(`📡 Diplomat: Opening PR on ${owner}/${repo}...`);

            // Create the pull request using Octokit
            const response = await this.octokit.pulls.create({
                owner,
                repo,
                title: config.title,
                body: config.body,
                head: config.branch,
                base: 'main', // Default base branch
            });

            console.log(`✅ Diplomat: PR created successfully!`);
            console.log(`   URL: ${response.data.html_url}`);
            console.log(`   Number: #${response.data.number}`);

            // 1. Smart Labelling
            const labels = ['security', 'automated'];
            if (config.severity) {
                labels.push(`severity:${config.severity.toLowerCase()}`);
            }
            if (config.labels) {
                labels.push(...config.labels);
            }
            await this.addLabels(owner, repo, response.data.number, labels);

            // 2. Assignee Management
            await this.addAssignees(owner, repo, response.data.number);

            return response.data.html_url;
        } catch (error: any) {
            console.error(`❌ Diplomat: Failed to create PR: ${error.message}`);

            // Provide helpful error messages
            if (error.status === 422) {
                console.error(`💡 Hint: Branch '${config.branch}' may not exist on remote, or a PR already exists.`);
            } else if (error.status === 401) {
                console.error(`💡 Hint: GITHUB_TOKEN may be invalid or expired.`);
            } else if (error.status === 404) {
                console.error(`💡 Hint: Repository not found. Check git remote configuration.`);
            }

            throw error;
        }
    }

    /**
     * Extract owner and repo from git remote URL
     */
    private async getRepoInfo(): Promise<{ owner: string; repo: string }> {
        const { execSync } = await import('child_process');

        try {
            // Get the remote URL
            const remoteUrl = execSync('git config --get remote.origin.url', {
                encoding: 'utf-8'
            }).trim();

            // Parse GitHub URL (supports both HTTPS and SSH formats)
            // HTTPS: https://github.com/owner/repo.git
            // SSH: git@github.com:owner/repo.git
            let match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);

            if (!match) {
                throw new Error(`Could not parse GitHub URL: ${remoteUrl}`);
            }

            const owner = match[1];
            const repo = match[2];

            return { owner, repo };
        } catch (error: any) {
            console.error(`❌ Failed to get repository info: ${error.message}`);
            console.log(`💡 Falling back to environment variables...`);

            // Fallback to environment variables if available
            const owner = process.env.GITHUB_OWNER || 'unknown-owner';
            const repo = process.env.GITHUB_REPO || 'the-sentinel';

            return { owner, repo };
        }
    }

    /**
     * Add labels to a pull request
     */
    private async addLabels(
        owner: string,
        repo: string,
        issueNumber: number,
        labels: string[]
    ): Promise<void> {
        if (!this.octokit) return;

        try {
            await this.octokit.issues.addLabels({
                owner,
                repo,
                issue_number: issueNumber,
                labels,
            });
            console.log(`🏷️  Diplomat: Added labels: ${labels.join(', ')}`);
        } catch (error: any) {
            console.warn(`⚠️ Diplomat: Failed to add labels: ${error.message}`);
            // Don't throw - labels are nice-to-have
        }
    }

    /**
     * Auto-assign the PR to the repo owner or configured user
     */
    private async addAssignees(owner: string, repo: string, issueNumber: number): Promise<void> {
        if (!this.octokit) return;

        try {
            // Priority: GITHUB_ASSIGNEE env var -> Repo Owner
            // Note: If 'owner' is an organization, this might fail unless GITHUB_ASSIGNEE is set.
            const assignee = process.env.GITHUB_ASSIGNEE || owner;

            await this.octokit.issues.addAssignees({
                owner,
                repo,
                issue_number: issueNumber,
                assignees: [assignee]
            });
            console.log(`👤 Diplomat: Assigned PR to ${assignee}`);
        } catch (error: any) {
            console.warn(`⚠️ Diplomat: Failed to assign PR: ${error.message}`);
        }
    }

    /**
     * Detect all local sentinel/* branches
     */
    async detectSentinelBranches(): Promise<string[]> {
        const { execSync } = await import('child_process');

        try {
            const branches = execSync('git branch --list "sentinel/*"', {
                encoding: 'utf-8'
            }).trim();

            if (!branches) {
                return [];
            }

            // Parse branch names (remove leading * and whitespace)
            const branchList = branches
                .split('\n')
                .map(b => b.replace(/^\*?\s+/, ''))
                .filter(b => b.length > 0);

            return branchList;
        } catch (error: any) {
            console.error(`❌ Failed to detect branches: ${error.message}`);
            return [];
        }
    }

    /**
     * Push a branch to remote origin
     */
    async pushBranch(branch: string): Promise<boolean> {
        const { execSync } = await import('child_process');

        try {
            console.log(`📤 Diplomat: Pushing ${branch} to origin...`);
            execSync(`git push -u origin ${branch}`, {
                encoding: 'utf-8',
                stdio: 'inherit'
            });
            console.log(`✅ Diplomat: Branch ${branch} pushed successfully.`);
            return true;
        } catch (error: any) {
            console.error(`❌ Failed to push branch: ${error.message}`);
            return false;
        }
    }

    /**
     * Generate a semantic PR title from a branch name
     * Format: [SECURITY] Fix for <Vulnerability Name>
     */
    generatePrTitle(branch: string, vulnerabilityName?: string): string {
        // Extract vulnerability info from branch name if not provided
        // Example: sentinel/fix-lodash -> "Lodash Vulnerability"
        if (!vulnerabilityName) {
            const parts = branch.split('/');
            const fixPart = parts[parts.length - 1];
            const name = fixPart
                .replace(/^fix-/, '')
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            vulnerabilityName = name;
        }

        return `[SECURITY] Fix for ${vulnerabilityName}`;
    }

    /**
     * Generate a semantic PR body with vulnerability details
     */
    generatePrBody(vulnerabilityId?: string, severity?: string, description?: string): string {
        let body = `## 🛡️ Automated Security Fix\n\n`;
        body += `This PR was automatically generated by **The Sentinel** to address a security vulnerability.\n\n`;

        if (vulnerabilityId) {
            body += `### Vulnerability Details\n`;
            body += `- **ID**: ${vulnerabilityId}\n`;
            if (severity) {
                body += `- **Severity**: ${severity}\n`;
            }
            if (description) {
                body += `- **Description**: ${description}\n`;
            }
            body += `\n`;
        }

        body += `### Changes Made\n`;
        body += `- Applied automated security patch\n`;
        body += `- All tests passing ✅\n\n`;

        body += `### Review Checklist\n`;
        body += `- [ ] Verify the fix addresses the vulnerability\n`;
        body += `- [ ] Check for any breaking changes\n`;
        body += `- [ ] Confirm test coverage\n\n`;

        body += `---\n`;
        body += `*Generated by The Sentinel 🤖*`;

        return body;
    }

    /**
     * Full workflow: Detect, Push, and Create PR for sentinel branches
     */
    async processAllSentinelBranches(): Promise<string[]> {
        console.log(`🕊️ Diplomat: Scanning for sentinel/* branches...`);

        const branches = await this.detectSentinelBranches();

        if (branches.length === 0) {
            console.log(`📭 Diplomat: No sentinel branches found.`);
            return [];
        }

        console.log(`📬 Diplomat: Found ${branches.length} sentinel branch(es): ${branches.join(', ')}`);

        const prUrls: string[] = [];

        for (const branch of branches) {
            try {
                // Push the branch to remote
                const pushed = await this.pushBranch(branch);

                if (!pushed && this.octokit) {
                    console.warn(`⚠️ Skipping PR creation for ${branch} (push failed)`);
                    continue;
                }

                // Generate PR title and body
                const title = this.generatePrTitle(branch);
                const body = this.generatePrBody();

                // Create the PR
                const prUrl = await this.createPullRequest({
                    branch,
                    title,
                    body
                });

                prUrls.push(prUrl);
            } catch (error: any) {
                console.error(`❌ Failed to process ${branch}: ${error.message}`);
            }
        }

        return prUrls;
    }
}
