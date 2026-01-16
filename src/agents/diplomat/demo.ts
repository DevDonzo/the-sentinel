import * as dotenv from 'dotenv';
import { DiplomatAgent } from './index';

dotenv.config();

async function demo() {
    console.log("🕊️ THE DIPLOMAT - GitHub PR Agent Demo");
    console.log("=".repeat(60));

    const diplomat = new DiplomatAgent();

    // Demo 1: Generate PR title from branch name
    console.log("\n--- Demo 1: PR Title Generation ---");
    const branch1 = "sentinel/fix-lodash";
    const title1 = diplomat.generatePrTitle(branch1);
    console.log(`Branch: ${branch1}`);
    console.log(`Title: ${title1}`);

    const branch2 = "sentinel/fix-sql-injection";
    const title2 = diplomat.generatePrTitle(branch2);
    console.log(`\nBranch: ${branch2}`);
    console.log(`Title: ${title2}`);

    // Demo 2: Generate PR body
    console.log("\n--- Demo 2: PR Body Generation ---");
    const body1 = diplomat.generatePrBody(
        "SNYK-JS-LODASH-590103",
        "Critical",
        "Prototype Pollution vulnerability in lodash"
    );
    console.log(body1);

    // Demo 3: Detect sentinel branches
    console.log("\n--- Demo 3: Detect Sentinel Branches ---");
    const branches = await diplomat.detectSentinelBranches();
    if (branches.length > 0) {
        console.log(`Found ${branches.length} sentinel branch(es):`);
        branches.forEach(b => console.log(`  - ${b}`));
    } else {
        console.log("No sentinel branches found.");
        console.log("\n💡 To test this feature:");
        console.log("   git checkout -b sentinel/fix-example");
        console.log("   # Make some changes");
        console.log("   git commit -m 'Fix vulnerability'");
        console.log("   npm run dev");
    }

    // Demo 4: Create a mock PR (without pushing)
    console.log("\n--- Demo 4: Mock PR Creation ---");
    try {
        const prUrl = await diplomat.createPullRequest({
            branch: "sentinel/fix-lodash",
            title: "[SECURITY] Fix for Lodash Vulnerability",
            body: diplomat.generatePrBody(
                "SNYK-JS-LODASH-590103",
                "Critical",
                "Prototype Pollution vulnerability"
            )
        });
        console.log(`\nPR URL: ${prUrl}`);
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Demo Complete!");
    console.log("\n💡 To create real PRs:");
    console.log("   1. Set GITHUB_TOKEN in .env");
    console.log("   2. Ensure git remote is configured");
    console.log("   3. Create a sentinel/* branch with commits");
    console.log("   4. Run: diplomat.processAllSentinelBranches()");
}

demo().catch(console.error);
