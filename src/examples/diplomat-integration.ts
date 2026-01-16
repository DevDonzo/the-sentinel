/**
 * Example integration of The Diplomat into the main Sentinel orchestrator
 * This shows how to use the Diplomat after The Engineer creates fix branches
 */

import * as dotenv from 'dotenv';
import { DiplomatAgent } from '../agents/diplomat';
// import { EngineerAgent } from '../agents/engineer'; // Uncomment when Engineer is ready

dotenv.config();

async function orchestrateDiplomatWorkflow() {
    console.log("🤖 THE SENTINEL - Diplomat Integration Example");
    console.log("=".repeat(60));

    // Step 1: The Engineer creates fix branches (simulated)
    console.log("\n--- STEP 1: Engineer Creates Fix Branches ---");
    console.log("✅ [Simulated] Engineer created: sentinel/fix-lodash");
    console.log("✅ [Simulated] Engineer created: sentinel/fix-sql-injection");

    // In reality, the Engineer agent would do:
    // const engineer = new EngineerAgent();
    // await engineer.processVulnerabilities();

    // Step 2: The Diplomat processes all sentinel branches
    console.log("\n--- STEP 2: Diplomat Processes Branches ---");
    const diplomat = new DiplomatAgent();

    try {
        // Option A: Process all sentinel branches automatically
        const prUrls = await diplomat.processAllSentinelBranches();

        if (prUrls.length > 0) {
            console.log(`\n✅ Successfully created ${prUrls.length} PR(s):`);
            prUrls.forEach((url: string, i: number) => console.log(`   ${i + 1}. ${url}`));
        } else {
            console.log("\n📭 No PRs created (no sentinel branches found)");
        }

        // Option B: Process specific branch with custom details
        console.log("\n--- Alternative: Custom PR Creation ---");
        const customTitle = diplomat.generatePrTitle(
            'sentinel/fix-lodash',
            'Lodash Prototype Pollution (CVE-2019-10744)'
        );

        const customBody = diplomat.generatePrBody(
            'SNYK-JS-LODASH-590103',
            'Critical',
            'Versions of lodash before 4.17.12 are vulnerable to Prototype Pollution'
        );

        console.log(`Title: ${customTitle}`);
        console.log(`\nBody Preview:\n${customBody.substring(0, 200)}...`);

    } catch (error: any) {
        console.error(`\n❌ Diplomat workflow failed: ${error.message}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Orchestration Complete!");
}

// Run if executed directly
if (require.main === module) {
    orchestrateDiplomatWorkflow().catch(console.error);
}

export { orchestrateDiplomatWorkflow };
