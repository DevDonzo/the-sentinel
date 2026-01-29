#!/usr/bin/env node
/**
 * The Watchman - Security Scanner Agent
 * 
 * This is the entry point for The Watchman agent.
 * It orchestrates the scanning process, handling fallbacks (Snyk -> npm audit)
 * and generating reports (JSON + HTML).
 */

import * as fs from 'fs';
import * as path from 'path';
import { SnykScanner, ScanResult } from './snyk';
import { NpmAuditScanner } from './npm-audit';
import { HtmlReportGenerator } from './html-report';
import { logger } from '../../utils/logger';

async function main() {
    logger.header('🛡️  THE WATCHMAN - Security Scanner Agent');

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
                    logger.error(`Unknown option: ${args[i]}`);
                    printHelp();
                    process.exit(1);
                }
        }
    }

    let results: ScanResult | null = null;
    let scannerUsed = 'snyk';

    // 1. Try Snyk Scanner
    try {
        const snykScanner = new SnykScanner(options);
        results = await snykScanner.test();
        // SnykScanner saves JSON internally
    } catch (snykError: any) {
        logger.warn(`Snyk scan failed: ${snykError.message}`);
        logger.info('Switching to fallback scanner: npm audit');

        // 2. Fallback to npm audit
        try {
            const auditScanner = new NpmAuditScanner();
            results = await auditScanner.scan();
            scannerUsed = 'npm-audit';

            // Save JSON explicitly for npm audit (as it's just a simple class rn)
            saveResults(results);

        } catch (auditError: any) {
            logger.error('All scanners failed!');
            logger.error(`Snyk: ${snykError.message}`);
            logger.error(`npm audit: ${auditError.message}`);
            process.exit(2);
        }
    }

    if (!results) {
        // Should not happen due to process.exit(2) above
        process.exit(2);
        return;
    }

    // 3. Generate Dashboard
    try {
        const htmlGenerator = new HtmlReportGenerator();
        htmlGenerator.generate(results);
    } catch (reportError: any) {
        logger.warn(`Failed to generate HTML report: ${reportError.message}`);
        // Non-fatal, continue to exit code check
    }

    logger.success(`Scan completed successfully using [${scannerUsed}]`);

    // Exit with appropriate code
    const criticalCount = results.summary.critical + results.summary.high;
    if (criticalCount > 0) {
        logger.warn(`High priority vulnerabilities found: ${criticalCount}`);
        process.exit(1);
    } else {
        logger.success('No high priority vulnerabilities found.');
        process.exit(0);
    }
}

function saveResults(result: ScanResult): void {
    const outputDir = path.resolve(process.cwd(), 'scan-results');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `scan-${new Date().toISOString().replace(/:/g, '-')}.json`;
    const filepath = path.join(outputDir, filename);
    const latestPath = path.join(outputDir, 'scan-results.json');

    const jsonContent = JSON.stringify(result, null, 2);

    fs.writeFileSync(filepath, jsonContent);
    fs.writeFileSync(latestPath, jsonContent);

    logger.info(`Scan results saved to: ${filepath}`);
    logger.info(`Latest results: ${latestPath}`);
}

function printHelp() {
    logger.info(`
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
