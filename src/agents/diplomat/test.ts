#!/usr/bin/env node

/**
 * Comprehensive test suite for The Diplomat agent
 * Tests all functionality without requiring actual GitHub credentials
 */

import { DiplomatAgent } from './index';

console.log("🧪 THE DIPLOMAT - Comprehensive Test Suite");
console.log("=".repeat(70));

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => boolean | Promise<boolean>) {
    return async () => {
        try {
            const result = await fn();
            if (result) {
                console.log(`✅ PASS: ${name}`);
                passCount++;
            } else {
                console.log(`❌ FAIL: ${name}`);
                failCount++;
            }
        } catch (error: any) {
            console.log(`❌ ERROR: ${name} - ${error.message}`);
            failCount++;
        }
    };
}

async function runTests() {
    const diplomat = new DiplomatAgent();

    console.log("\n--- Test Suite 1: PR Title Generation ---");

    await test("Generate title from simple branch", () => {
        const title = diplomat.generatePrTitle("sentinel/fix-lodash");
        return title === "[SECURITY] Fix for Lodash";
    })();

    await test("Generate title from multi-word branch", () => {
        const title = diplomat.generatePrTitle("sentinel/fix-sql-injection");
        return title === "[SECURITY] Fix for Sql Injection";
    })();

    await test("Generate title with custom vulnerability name", () => {
        const title = diplomat.generatePrTitle(
            "sentinel/fix-lodash",
            "Lodash Prototype Pollution (CVE-2019-10744)"
        );
        return title === "[SECURITY] Fix for Lodash Prototype Pollution (CVE-2019-10744)";
    })();

    console.log("\n--- Test Suite 2: PR Body Generation ---");

    await test("Generate basic PR body", () => {
        const body = diplomat.generatePrBody();
        return body.includes("Automated Security Fix") &&
            body.includes("The Sentinel");
    })();

    await test("Generate PR body with vulnerability ID", () => {
        const body = diplomat.generatePrBody("SNYK-JS-LODASH-590103");
        return body.includes("SNYK-JS-LODASH-590103") &&
            body.includes("Vulnerability Details");
    })();

    await test("Generate PR body with full details", () => {
        const body = diplomat.generatePrBody(
            "SNYK-JS-LODASH-590103",
            "Critical",
            "Prototype Pollution vulnerability"
        );
        return body.includes("SNYK-JS-LODASH-590103") &&
            body.includes("Critical") &&
            body.includes("Prototype Pollution vulnerability");
    })();

    await test("PR body includes review checklist", () => {
        const body = diplomat.generatePrBody();
        return body.includes("Review Checklist") &&
            body.includes("[ ]");
    })();

    console.log("\n--- Test Suite 3: Branch Detection ---");

    await test("Detect sentinel branches (may be empty)", async () => {
        const branches = await diplomat.detectSentinelBranches();
        return Array.isArray(branches);
    })();

    console.log("\n--- Test Suite 4: Real API Validation (No Token) ---");

    await test("createPullRequest throws without GITHUB_TOKEN", async () => {
        try {
            await diplomat.createPullRequest({
                branch: "sentinel/fix-test",
                title: "[SECURITY] Fix for Test Vulnerability",
                body: "Test PR body"
            });
            return false; // Should have failed
        } catch (error: any) {
            return error.message.includes("No GITHUB_TOKEN found");
        }
    })();

    console.log("\n--- Test Suite 5: Integration Tests ---");

    await test("Process all sentinel branches (handles errors gracefully)", async () => {
        const prUrls = await diplomat.processAllSentinelBranches();
        return Array.isArray(prUrls);
    })();

    await test("Generate complete PR config", () => {
        const branch = "sentinel/fix-lodash";
        const title = diplomat.generatePrTitle(branch);
        const body = diplomat.generatePrBody(
            "SNYK-JS-LODASH-590103",
            "Critical",
            "Prototype Pollution"
        );

        return title.startsWith("[SECURITY]") &&
            body.includes("Automated Security Fix") &&
            branch.startsWith("sentinel/");
    })();

    console.log("\n" + "=".repeat(70));
    console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed`);

    if (failCount === 0) {
        console.log("\n🎉 All tests passed! The Diplomat is ready for deployment.");
        return 0;
    } else {
        console.log("\n⚠️  Some tests failed. Please review the implementation.");
        return 1;
    }
}

// Run tests
runTests()
    .then(exitCode => {
        process.exit(exitCode);
    })
    .catch(error => {
        console.error("\n❌ Test suite crashed:", error);
        process.exit(1);
    });
