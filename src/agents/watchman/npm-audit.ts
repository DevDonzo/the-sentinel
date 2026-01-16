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
        // data.advisories (older versions)

        if (data.vulnerabilities) {
            for (const [key, val] of Object.entries(data.vulnerabilities)) {
                const vuln = val as any;
                const severity = (vuln.severity || 'low').toLowerCase() as Vulnerability['severity'];

                // npm audit aggregates by package, but we might want individual issues.
                // For now, let's map the package-level record.

                // If there are multiple 'via' sources, it implies multiple vulnerabilities or a dependency chain.
                // We will simplify for now.

                vulnerabilities.push({
                    id: `NPM-${key}-${vuln.via?.[0]?.source || 'audit'}`, // synthesized ID
                    title: typeof vuln.via?.[0] === 'object' ? vuln.via[0].title : 'Vulnerability found via npm audit',
                    severity,
                    packageName: vuln.name,
                    version: vuln.range || 'unknown',
                    fixedIn: vuln.fixAvailable ? ['npm audit fix'] : [],
                    description: `Dependency path: ${key}`,
                    cvssScore: undefined // npm audit doesn't always give easy access to this in simple view
                });

                summary.total++;
                if (summary.hasOwnProperty(severity)) {
                    summary[severity]++;
                }
            }
        }

        // Populate standard total/counts if available in metadata
        if (data.metadata && data.metadata.vulnerabilities) {
            summary.total = data.metadata.vulnerabilities.total;
            summary.critical = data.metadata.vulnerabilities.critical;
            summary.high = data.metadata.vulnerabilities.high;
            summary.medium = data.metadata.vulnerabilities.medium;
            summary.low = data.metadata.vulnerabilities.low;
        }

        return {
            timestamp: new Date().toISOString(),
            vulnerabilities,
            summary
        };
    }
}
