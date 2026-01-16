import * as dotenv from 'dotenv';
import { loadRules } from './core/rules';
import { loadSpecs } from './core/spec';
import { SnykScanner } from './agents/watchman/snyk';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config();

/**
 * Shared orchestration logic to run Engineer and Diplomat agents
 */
async function orchestrateFix(scanResult: any, targetPath: string = process.cwd()) {
    const snyk = new SnykScanner();
    const highPriority = snyk.filterHighPriority(scanResult);

    if (highPriority.length > 0) {
        console.log(`\n[ALERT] Identified ${highPriority.length} high-priority vulnerabilities.`);

        // --- THE ENGINEER ---
        console.log("\n[PROCESS] AGENT: THE ENGINEER | Diagnosing & Patching...");
        const { EngineerAgent } = await import('./agents/engineer');
        const engineer = new EngineerAgent();

        const resultsPath = path.resolve(process.cwd(), 'scan-results/scan-results.json');
        const diagnoses = await engineer.diagnose(resultsPath);

        if (diagnoses.length > 0) {
            const topIssue = diagnoses[0];
            const fixSuccess = await engineer.applyFix(topIssue);

            if (fixSuccess) {
                // --- THE DIPLOMAT ---
                console.log("\n[PROCESS] AGENT: THE DIPLOMAT | Opening Pull Request...");
                const { DiplomatAgent } = await import('./agents/diplomat');
                const diplomat = new DiplomatAgent();

                const pkgName = topIssue.description.match(/in ([a-z0-9-]+)@/)?.[1] || 'unknown';
                const branchName = `sentinel/fix-${pkgName}`;

                const prUrl = await diplomat.createPullRequest({
                    branch: branchName,
                    title: `[SECURITY] Fix for ${topIssue.vulnerabilityId}`,
                    body: `## [SECURITY] Automated Security Fix\n\n${topIssue.description}\n\n**Remediation**: ${topIssue.suggestedFix}\n\n---\n*Verified by The Sentinel Patching Engine* [SUCCESS]`
                });

                if (prUrl) {
                    console.log(`\n[SUCCESS] AUTOMATION COMPLETE. PR Lifecycle initiated: ${prUrl}`);
                }
            }
        }
    } else {
        console.log("\n[SUCCESS] Clean Audit: No high-priority vulnerabilities identified.");
    }
}

async function prepareWorkspace(repoUrl: string): Promise<string> {
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'target-repo';
    const workspacePath = path.resolve(process.cwd(), 'workspaces', repoName);

    if (fs.existsSync(workspacePath)) {
        console.log(`[INFO] Workspace for ${repoName} already exists. Pulling latest changes...`);
        execSync(`git -C ${workspacePath} pull`, { stdio: 'inherit' });
    } else {
        console.log(`[INFO] Cloning ${repoUrl} into workspaces/${repoName}...`);
        fs.mkdirSync(path.dirname(workspacePath), { recursive: true });
        execSync(`git clone ${repoUrl} ${workspacePath}`, { stdio: 'inherit' });
    }

    return workspacePath;
}

async function main() {
    const originalCwd = process.cwd();
    let targetRepoUrl = process.argv[2];

    try {
        console.log("\n[SYSTEM] THE SENTINEL | Autonomous Security Orchestrator");
        console.log("=".repeat(60));

        // 1. Core Logic (Loaders should stay in the project root)
        const rules = loadRules();
        const specs = loadSpecs();

        if (specs.length === 0) {
            console.warn("[WARNING] No active specifications found in /SPEC. Patrol aborted.");
            return;
        }

        // Handle target repository
        if (targetRepoUrl) {
            console.log(`\n[TARGET] ${targetRepoUrl}`);
            const workspace = await prepareWorkspace(targetRepoUrl);
            process.chdir(workspace);
            console.log(`[INFO] Working Directory shifted to: ${process.cwd()}`);
        } else {
            console.log(`\n[TARGET] Local Repository (Default)`);
        }

        // 2. Scan Execution
        console.log("\n[PROCESS] AGENT: THE WATCHMAN | Running Security Scan...");
        const snyk = new SnykScanner();

        try {
            const scanResult = await snyk.test();
            snyk.printSummary(scanResult);

            // 3. Orchestration
            await orchestrateFix(scanResult);
            console.log("\n[FINISH] Patrol Session Completed Successfully.");

        } catch (e: any) {
            console.error("\n[ERROR] Scanner Execution Failed:", e.message);

            if (!targetRepoUrl) {
                console.log("\n[INFO] Active Fallback: Running in DEMO MODE with internal datasets...\n");

                const { generateMockScanResult } = await import('./utils/mock-data');
                const scanResult = generateMockScanResult();

                const outputDir = path.resolve(originalCwd, 'scan-results');
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                fs.writeFileSync(
                    path.join(outputDir, 'scan-results.json'),
                    JSON.stringify(scanResult, null, 2)
                );

                snyk.printSummary(scanResult);
                await orchestrateFix(scanResult);

                console.log("\n[FINISH] Session Completed (Demonstration Mode).");
            }
        }

    } catch (error) {
        console.error("[ERROR] Critical System Error:", error);
        process.exit(1);
    } finally {
        // Return to original directory
        process.chdir(originalCwd);
    }
}

main();
