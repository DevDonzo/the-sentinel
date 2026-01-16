import { exec } from 'child_process';
import { promisify } from 'util';
import { ScanResult, Vulnerability } from './snyk';

const execAsync = promisify(exec);

export class NpmAuditScanner {

    async scan(): Promise<ScanResult> {
        console.log("🔍 Running npm audit fallback...");

        try {
            // npm audit returns exit code 1 if vulnerabilities are found, so we need to handle that
            let jsonOutput = '';
            try {
                const { stdout } = await execAsync('npm audit --json', { maxBuffer: 10 * 1024 * 1024 });
                jsonOutput = stdout;
            } catch (error: any) {
                // If the error code is 1, it just means vulns were found, which is fine.
                // If it's something else, then it might be a real error.
                if (error.stdout) {
                    jsonOutput = error.stdout;
                } else {
                    throw error;
                }
            }

            return this.parseAuditOutput(jsonOutput);

        } catch (error: any) {
            console.error("❌ npm audit failed:", error.message);
            throw new Error(`npm audit scan failed: ${error.message}`);
        }
    }

    private parseAuditOutput(jsonOutput: string): ScanResult {
        let data: any;
        try {
            data = JSON.parse(jsonOutput);
        } catch (e) {
            throw new Error("Failed to parse npm audit JSON output");
        }

        const vulnerabilities: Vulnerability[] = [];
        const summary = {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        // npm audit structure (v7+)
        // data.vulnerabilities is an object where keys are package names

        if (data.vulnerabilities) {
            for (const [key, val] of Object.entries(data.vulnerabilities)) {
                const vuln = val as any;

                // Normalize severity (handle npm's 'moderate' and 'info')
                let severityStr = (vuln.severity || 'low').toLowerCase();
                if (severityStr === 'moderate') severityStr = 'medium';
                if (severityStr === 'info') severityStr = 'low';
                const severity = severityStr as Vulnerability['severity'];

                vulnerabilities.push({
                    id: `NPM-${key}-${vuln.via?.[0]?.source || 'audit'}`, // synthesized ID
                    title: typeof vuln.via?.[0] === 'object' ? vuln.via[0].title : 'Vulnerability found via npm audit',
                    severity,
                    packageName: vuln.name,
                    version: vuln.range || 'unknown',
                    fixedIn: vuln.fixAvailable ? ['npm audit fix'] : [],
                    description: `Dependency path: ${key}`,
                    cvssScore: undefined
                });

                summary.total++;
                if (summary.hasOwnProperty(severity)) {
                    summary[severity]++;
                }
            }
        }

        // Note: We rely on our manual count above to ensure consistency between
        // the vulnerabilities list and the summary counts, rather than using
        // data.metadata which might mismatch or use non-standard keys.

        return {
            timestamp: new Date().toISOString(),
            vulnerabilities,
            summary
        };
    }
}
