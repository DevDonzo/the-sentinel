import * as dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
import { loadRules } from './core/rules';
import { loadSpecs } from './core/spec';
import { SnykScanner } from './agents/watchman/snyk';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

/**
 * Shared orchestration logic to run Engineer and Diplomat agents
 */
async function orchestrateFix(scanResult: any) {
    // Filter for high-priority issues (Watchman logic re-used here for decision making)
    const snyk = new SnykScanner();
    const highPriority = snyk.filterHighPriority(scanResult);

    if (highPriority.length > 0) {
        console.log(`\n🚨 Found ${highPriority.length} high-priority vulnerabilities requiring attention.`);

        // --- MILESTONE 3: THE ENGINEER ---
        console.log("\n--- STEP 4: [THE ENGINEER] DIAGNOSIS & PATCHING ---");
        const { EngineerAgent } = await import('./agents/engineer');
        const engineer = new EngineerAgent();

        // We'll pass the path to the saved JSON
        const resultsPath = path.resolve(process.cwd(), 'scan-results/scan-results.json');

        const diagnoses = await engineer.diagnose(resultsPath);

        if (diagnoses.length > 0) {
            // For this demo, we pick the first critical issue
            const topIssue = diagnoses[0];
            const fixSuccess = await engineer.applyFix(topIssue);

            if (fixSuccess) {
                // --- MILESTONE 4: THE DIPLOMAT ---
                console.log("\n--- STEP 5: [THE DIPLOMAT] PR AUTOMATION ---");
                const { DiplomatAgent } = await import('./agents/diplomat');
                const diplomat = new DiplomatAgent();

                // Extract package name from logic for branch name consistency
                const pkgName = topIssue.description.match(/in ([a-z0-9-]+)@/)?.[1] || 'unknown';
                const branchName = `sentinel/fix-${pkgName}`;

                const prUrl = await diplomat.createPullRequest({
                    branch: branchName,
                    title: `[SECURITY] Fix for ${topIssue.vulnerabilityId}`,
                    body: `## Security Vulnerability Fix\n\n${topIssue.description}\n\n**Suggested Fix**: ${topIssue.suggestedFix}\n\n*Automated by The Sentinel* 🛡️`
                });

                if (prUrl) {
                    console.log(`\n🎉 CYCLE COMPLETE. PR is live: ${prUrl}`);
                }
            }
        }

    } else {
        console.log("\n✅ No high-priority vulnerabilities found. Repository is secure!");
    }
}

async function main() {
    try {
        console.log("🤖 THE SENTINEL - Autonomous Security Agent");
        console.log("=".repeat(60));

        // Step 1: Load Rules of Engagement
        console.log("\n--- STEP 1: LOADING RULES OF ENGAGEMENT ---");
        const rules = loadRules();
        console.log(`✅ Loaded ${rules.directives.length} directives from SENTINEL_CORE.md`);

        // Step 2: Load Specifications
        console.log("\n--- STEP 2: LOADING SPECIFICATIONS ---");
        const specs = loadSpecs();
        if (specs.length === 0) {
            console.warn("⚠️  No specifications found. Nothing to do.");
            return;
        }
        specs.forEach(s => console.log(`📋 ${s.filename}: ${s.id}`));

        // Step 3: Execute SPEC 001
        console.log("\n--- STEP 3: EXECUTING SPEC 001 - BASELINE SCAN ---");
        const snyk = new SnykScanner();

        try {
            const scanResult = await snyk.test();
            snyk.printSummary(scanResult);

            // Real scan successful - proceed to orchestration
            await orchestrateFix(scanResult);

            console.log("\n✅ The Sentinel has completed its patrol.");

        } catch (e: any) {
            console.error("\n❌ Scan failed:", e.message);
            console.log("\n💡 Snyk CLI not available. Running in DEMO MODE with mock data...\n");

            // Use mock data
            const { generateMockScanResult } = await import('./utils/mock-data');
            const scanResult = generateMockScanResult();

            // Save mock results
            const outputDir = path.resolve(process.cwd(), 'scan-results');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            fs.writeFileSync(
                path.join(outputDir, 'scan-results.json'),
                JSON.stringify(scanResult, null, 2)
            );

            snyk.printSummary(scanResult);

            // Run orchestration on mock data
            await orchestrateFix(scanResult);

            console.log("\n✅ The Sentinel has completed its patrol (Demo Mode).");
        }

    } catch (error) {
        console.error("❌ Fatal Error:", error);
        process.exit(1);
    }
}

main();
