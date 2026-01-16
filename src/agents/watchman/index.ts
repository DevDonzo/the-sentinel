#!/usr/bin/env node
/**
 * The Watchman - Security Scanner Agent
 * 
 * This is the entry point for The Watchman agent.
 * It scans the codebase for security vulnerabilities and outputs
 * a standardized JSON format to scan-results/scan-results.json
 */

import { SnykScanner } from './snyk';

async function main() {
    console.log('🛡️  THE WATCHMAN - Security Scanner Agent');
    console.log('==========================================\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const options: any = {};

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--max-retries':
                options.maxRetries = parseInt(args[++i], 10);
                break;
            case '--timeout':
                options.timeoutMs = parseInt(args[++i], 10) * 1000; // Convert to ms
                break;
            case '--retry-delay':
                options.retryDelayMs = parseInt(args[++i], 10);
                break;
            case '--token':
                options.token = args[++i];
                break;
            case '--help':
                printHelp();
                process.exit(0);
            default:
                if (args[i].startsWith('--')) {
                    console.error(`Unknown option: ${args[i]}`);
                    printHelp();
                    process.exit(1);
                }
        }
    }

    try {
        // Create scanner with options
        const scanner = new SnykScanner(options);

        // Run the scan
        const results = await scanner.test();

        // Print summary
        scanner.printSummary(results);

        // Exit with appropriate code
        const hasHighPriority = scanner.filterHighPriority(results).length > 0;
        if (hasHighPriority) {
            console.log('\n⚠️  High priority vulnerabilities found!');
            process.exit(1);
        } else {
            console.log('\n✅ No high priority vulnerabilities found.');
            process.exit(0);
        }
    } catch (error: any) {
        console.error('\n❌ Scan failed:', error.message);
        process.exit(2);
    }
}

function printHelp() {
    console.log(`
Usage: npx ts-node src/agents/watchman/index.ts [options]

Options:
  --max-retries <n>     Maximum number of retry attempts (default: 3)
  --timeout <seconds>   Scan timeout in seconds (default: 300)
  --retry-delay <ms>    Initial retry delay in milliseconds (default: 2000)
  --token <token>       Snyk API token (can also use SNYK_TOKEN env var)
  --help                Show this help message

Examples:
  # Run with defaults
  npx ts-node src/agents/watchman/index.ts

  # Run with custom timeout
  npx ts-node src/agents/watchman/index.ts --timeout 600

  # Run with more retries
  npx ts-node src/agents/watchman/index.ts --max-retries 5

Exit Codes:
  0 - Success, no high priority vulnerabilities
  1 - Success, but high priority vulnerabilities found
  2 - Scan failed
`);
}

// Run if called directly
if (require.main === module) {
    main();
}

export { main };
