import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface Vulnerability {
    id: string;
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    packageName: string;
    version: string;
    fixedIn?: string[];
    description?: string;
    cvssScore?: number;
}

export interface ScanResult {
    timestamp: string;
    vulnerabilities: Vulnerability[];
    summary: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    metadata?: {
        scanDuration?: number;
        retryCount?: number;
        errors?: string[];
    };
}

export interface ScannerOptions {
    token?: string;
    maxRetries?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
}

export class SnykScanner {
    private outputDir: string;
    private maxRetries: number;
    private retryDelayMs: number;
    private timeoutMs: number;

    constructor(options: ScannerOptions = {}) {
        const { token, maxRetries = 3, retryDelayMs = 2000, timeoutMs = 300000 } = options;

        if (!process.env.SNYK_TOKEN && !token) {
            console.warn("⚠️  SNYK_TOKEN not found. Scanner may fail or require CLI login.");
        }

        this.maxRetries = maxRetries;
        this.retryDelayMs = retryDelayMs;
        this.timeoutMs = timeoutMs; // Default 5 minutes
        this.outputDir = path.resolve(process.cwd(), 'scan-results');

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Retry wrapper with exponential backoff
     */
    private async retryWithBackoff<T>(
        fn: () => Promise<T>,
        operationName: string,
        attempt = 1
    ): Promise<T> {
        try {
            return await fn();
        } catch (error: any) {
            const isTimeout = error.killed || error.signal === 'SIGTERM';
            const isNetworkError = error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED';

            if (attempt < this.maxRetries && (isTimeout || isNetworkError)) {
                const delay = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(
                    `⚠️  ${operationName} failed (attempt ${attempt}/${this.maxRetries}). ` +
                    `Retrying in ${delay}ms... Reason: ${error.message}`
                );

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryWithBackoff(fn, operationName, attempt + 1);
            }

            throw error;
        }
    }

    async test(): Promise<ScanResult> {
        console.log("🔍 Running Snyk security scan...");
        const startTime = Date.now();
        let retryCount = 0;
        const errors: string[] = [];

        try {
            // Check if Snyk CLI is available (with retry)
            await this.retryWithBackoff(
                async () => {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout for version check

                    try {
                        await execAsync('snyk --version', {
                            signal: controller.signal as any
                        });
                    } finally {
                        clearTimeout(timeout);
                    }
                },
                'Snyk CLI version check'
            );
        } catch (error: any) {
            const errorMsg = "❌ Snyk CLI not found or not responding. Please install: npm install -g snyk";
            errors.push(errorMsg);
            throw new Error(errorMsg);
        }

        try {
            // Run snyk test with JSON output (with retry and timeout)
            const result = await this.retryWithBackoff(
                async () => {
                    console.log(`🔄 Executing Snyk scan (timeout: ${this.timeoutMs / 1000}s)...`);

                    // Note: snyk test exits with code 1 if vulnerabilities are found
                    try {
                        const { stdout } = await execAsync('snyk test --json', {
                            maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
                            timeout: this.timeoutMs
                        });
                        return stdout;
                    } catch (error: any) {
                        // Snyk returns exit code 1 when vulnerabilities are found
                        // The stdout still contains the JSON we need
                        if (error.stdout) {
                            return error.stdout;
                        }

                        // Handle timeout specifically
                        if (error.killed || error.signal === 'SIGTERM') {
                            throw new Error(`Snyk scan timed out after ${this.timeoutMs / 1000}s`);
                        }

                        throw error;
                    }
                },
                'Snyk security scan'
            );

            const scanDuration = Date.now() - startTime;
            const scanResult = this.parseSnykOutput(result);

            // Add metadata
            scanResult.metadata = {
                scanDuration,
                retryCount,
                errors: errors.length > 0 ? errors : undefined
            };

            console.log(`✅ Scan completed in ${(scanDuration / 1000).toFixed(2)}s`);
            return scanResult;

        } catch (error: any) {
            const errorMsg = `Snyk scan failed: ${error.message}`;
            errors.push(errorMsg);

            // Create a fallback scan result with error information
            const fallbackResult: ScanResult = {
                timestamp: new Date().toISOString(),
                vulnerabilities: [],
                summary: {
                    total: 0,
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                },
                metadata: {
                    scanDuration: Date.now() - startTime,
                    retryCount,
                    errors
                }
            };

            // Save the error state
            this.saveScanResults(fallbackResult);

            throw new Error(errorMsg);
        }
    }

    private parseSnykOutput(jsonOutput: string): ScanResult {
        console.log("📊 Parsing Snyk results...");

        let data: any;
        try {
            data = JSON.parse(jsonOutput);
        } catch (e) {
            throw new Error("Failed to parse Snyk JSON output");
        }

        const vulnerabilities: Vulnerability[] = [];
        const summary = {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        // Parse vulnerabilities from Snyk output
        if (data.vulnerabilities && Array.isArray(data.vulnerabilities)) {
            for (const vuln of data.vulnerabilities) {
                const severity = (vuln.severity || 'low').toLowerCase() as Vulnerability['severity'];

                vulnerabilities.push({
                    id: vuln.id || vuln.CVSSv3 || 'unknown',
                    title: vuln.title || 'Unknown vulnerability',
                    severity,
                    packageName: vuln.packageName || vuln.name || 'unknown',
                    version: vuln.version || 'unknown',
                    fixedIn: vuln.fixedIn || [],
                    description: vuln.description,
                    cvssScore: vuln.cvssScore
                });

                summary.total++;
                summary[severity]++;
            }
        }

        const result: ScanResult = {
            timestamp: new Date().toISOString(),
            vulnerabilities,
            summary
        };

        // Save to file
        this.saveScanResults(result);

        return result;
    }

    private saveScanResults(result: ScanResult): void {
        try {
            // Validate the result before saving
            this.validateScanResult(result);

            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const filename = `scan-${timestamp}.json`;
            const filepath = path.join(this.outputDir, filename);
            const latestPath = path.join(this.outputDir, 'scan-results.json');

            // Serialize with pretty formatting
            const jsonContent = JSON.stringify(result, null, 2);

            // Validate that the JSON is parseable (double-check)
            try {
                JSON.parse(jsonContent);
            } catch (e) {
                throw new Error('Generated JSON is not valid');
            }

            // Atomic write using temporary file
            const tempPath = `${filepath}.tmp`;
            const tempLatestPath = `${latestPath}.tmp`;

            try {
                // Write timestamped file
                fs.writeFileSync(tempPath, jsonContent, { encoding: 'utf8' });
                fs.renameSync(tempPath, filepath);

                // Write latest file
                fs.writeFileSync(tempLatestPath, jsonContent, { encoding: 'utf8' });
                fs.renameSync(tempLatestPath, latestPath);

                console.log(`💾 Scan results saved to: ${filepath}`);
                console.log(`💾 Latest results: ${latestPath}`);
            } catch (writeError) {
                // Cleanup temp files if they exist
                [tempPath, tempLatestPath].forEach(tmpFile => {
                    if (fs.existsSync(tmpFile)) {
                        try {
                            fs.unlinkSync(tmpFile);
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                    }
                });
                throw writeError;
            }
        } catch (error: any) {
            console.error(`❌ Failed to save scan results: ${error.message}`);

            // Try to save a minimal error report as fallback
            try {
                const errorReport = {
                    timestamp: new Date().toISOString(),
                    error: error.message,
                    vulnerabilities: [],
                    summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
                };

                const errorPath = path.join(this.outputDir, 'scan-error.json');
                fs.writeFileSync(errorPath, JSON.stringify(errorReport, null, 2));
                console.log(`💾 Error report saved to: ${errorPath}`);
            } catch (fallbackError) {
                console.error(`❌ Could not save error report: ${fallbackError}`);
            }

            throw error;
        }
    }

    /**
     * Validates the scan result structure
     */
    private validateScanResult(result: ScanResult): void {
        if (!result) {
            throw new Error('Scan result is null or undefined');
        }

        if (!result.timestamp || typeof result.timestamp !== 'string') {
            throw new Error('Invalid or missing timestamp');
        }

        if (!Array.isArray(result.vulnerabilities)) {
            throw new Error('Vulnerabilities must be an array');
        }

        if (!result.summary || typeof result.summary !== 'object') {
            throw new Error('Invalid or missing summary');
        }

        const requiredSummaryFields = ['total', 'critical', 'high', 'medium', 'low'];
        for (const field of requiredSummaryFields) {
            if (typeof result.summary[field as keyof typeof result.summary] !== 'number') {
                throw new Error(`Summary field '${field}' must be a number`);
            }
        }

        // Validate each vulnerability
        result.vulnerabilities.forEach((vuln, index) => {
            if (!vuln.id || !vuln.title || !vuln.severity || !vuln.packageName || !vuln.version) {
                throw new Error(`Vulnerability at index ${index} is missing required fields`);
            }

            const validSeverities = ['low', 'medium', 'high', 'critical'];
            if (!validSeverities.includes(vuln.severity)) {
                throw new Error(`Invalid severity '${vuln.severity}' at index ${index}`);
            }
        });
    }

    filterHighPriority(result: ScanResult): Vulnerability[] {
        return result.vulnerabilities.filter(
            v => v.severity === 'critical' || v.severity === 'high'
        );
    }

    printSummary(result: ScanResult): void {
        console.log("\n" + "=".repeat(60));
        console.log("📋 SECURITY SCAN SUMMARY");
        console.log("=".repeat(60));
        console.log(`Timestamp: ${result.timestamp}`);
        console.log(`Total Vulnerabilities: ${result.summary.total}`);
        console.log(`  🔴 Critical: ${result.summary.critical}`);
        console.log(`  🟠 High: ${result.summary.high}`);
        console.log(`  🟡 Medium: ${result.summary.medium}`);
        console.log(`  🟢 Low: ${result.summary.low}`);

        const highPriority = this.filterHighPriority(result);
        if (highPriority.length > 0) {
            console.log("\n⚠️  HIGH PRIORITY VULNERABILITIES:");
            highPriority.forEach((v, i) => {
                console.log(`\n${i + 1}. [${v.severity.toUpperCase()}] ${v.title}`);
                console.log(`   Package: ${v.packageName}@${v.version}`);
                console.log(`   ID: ${v.id}`);
                if (v.fixedIn && v.fixedIn.length > 0) {
                    console.log(`   Fixed in: ${v.fixedIn.join(', ')}`);
                }
            });
        }
        console.log("=".repeat(60) + "\n");
    }
}
