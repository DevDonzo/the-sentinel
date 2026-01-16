import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitManager } from './git';

const execAsync = promisify(exec);

export interface Diagnosis {
    vulnerabilityId: string;
    description: string;
    suggestedFix: string;
    filesToModify: string[];
}

interface Vulnerability {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    packageName: string;
    version: string;
    fixedIn: string[];
    description: string;
    cvssScore: number;
}

interface ScanResults {
    timestamp: string;
    vulnerabilities: Vulnerability[];
    summary: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}

export class EngineerAgent {
    private git: GitManager;
    private severityPriority: Record<string, number> = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1
    };

    constructor() {
        this.git = new GitManager();
    }

    /**
     * Read and parse the scan results JSON file
     */
    private async readScanResults(scanResultsPath: string): Promise<ScanResults> {
        console.log(`📖 Engineer: Reading scan results from ${scanResultsPath}...`);

        const absolutePath = path.isAbsolute(scanResultsPath)
            ? scanResultsPath
            : path.resolve(process.cwd(), scanResultsPath);

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Scan results file not found: ${absolutePath}`);
        }

        const fileContent = fs.readFileSync(absolutePath, 'utf-8');
        return JSON.parse(fileContent) as ScanResults;
    }

    /**
     * Sort vulnerabilities by severity (critical first)
     */
    private prioritizeVulnerabilities(vulnerabilities: Vulnerability[]): Vulnerability[] {
        return [...vulnerabilities].sort((a, b) => {
            const priorityDiff = this.severityPriority[b.severity] - this.severityPriority[a.severity];
            if (priorityDiff !== 0) return priorityDiff;
            return b.cvssScore - a.cvssScore;
        });
    }

    /**
     * Run a shell command (for npm)
     */
    private async runCommand(command: string): Promise<void> {
        console.log(`💻 Execute: ${command}`);
        try {
            await execAsync(command);
        } catch (error: any) {
            throw new Error(`Command failed: ${command}\n${error.stderr || error.message}`);
        }
    }

    /**
     * Analyze scan results and create diagnoses for vulnerabilities
     */
    async diagnose(scanResultsPath: string): Promise<Diagnosis[]> {
        console.log("🔧 Engineer: Analyzing scan results...");

        const scanResults = await this.readScanResults(scanResultsPath);
        const prioritized = this.prioritizeVulnerabilities(scanResults.vulnerabilities);

        console.log(`📊 Found ${scanResults.summary.total} vulnerabilities`);

        const diagnoses: Diagnosis[] = prioritized.map(vuln => ({
            vulnerabilityId: vuln.id,
            description: `${vuln.title} in ${vuln.packageName}@${vuln.version} (${vuln.severity.toUpperCase()})`,
            suggestedFix: `Update ${vuln.packageName} from ${vuln.version} to ${vuln.fixedIn[0]}`,
            filesToModify: ['package.json']
        }));

        return diagnoses;
    }

    /**
     * Apply a fix for a specific vulnerability
     */
    async applyFix(diagnosis: Diagnosis): Promise<boolean> {
        console.log(`\n🔧 Engineer: Applying fix for ${diagnosis.vulnerabilityId}...`);

        // Parsing the strings to get the package info
        // Format: "Update [package] from [old] to [new]"
        const match = diagnosis.suggestedFix.match(/Update\s+([^\s]+)\s+from\s+([^\s]+)\s+to\s+([^\s]+)/);

        if (!match) {
            console.error("❌ Could not parse fix suggestion format.");
            return false;
        }

        const [_, packageName, oldVersion, newVersion] = match;
        const branchName = `sentinel/fix-${packageName}`;

        try {
            // 1. Checkout Branch
            await this.git.checkoutBranch(branchName);

            // 2. Read package.json
            const packageJsonPath = path.resolve(process.cwd(), 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error("package.json not found!");
            }
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

            // 3. Update Dependency
            let updated = false;
            // Check dependencies
            if (packageJson.dependencies && packageJson.dependencies[packageName]) {
                console.log(`📝 Updating dependencies: ${packageName} ${packageJson.dependencies[packageName]} -> ${newVersion}`);
                packageJson.dependencies[packageName] = newVersion;
                updated = true;
            }
            // Check devDependencies
            if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
                console.log(`📝 Updating devDependencies: ${packageName} ${packageJson.devDependencies[packageName]} -> ${newVersion}`);
                packageJson.devDependencies[packageName] = newVersion;
                updated = true;
            }

            if (!updated) {
                console.warn(`⚠️ Package ${packageName} not found in dependencies. Trying to install directly...`);
                // If not found, we might want to skip or try npm install directly. 
                // For now, let's assume we modify the json if it existed, otherwise we fail.
                // But wait, the vulnerability exists, so it MUST be there somewhere. 
                // It could be a transitive dependency. Updating package.json only works for direct deps.
                // For this task, we assume direct dependency patching.
                console.error("❌ Failed to find direct dependency in package.json. This might be a transitive dependency.");
                return false;
            }

            // 4. Write package.json
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

            // 5. Update lockfile
            console.log("📦 Running npm install to update lockfile...");
            await this.runCommand('npm install');

            // 6. Verify
            console.log("🧪 Running Verification (npm test)...");
            try {
                await this.runCommand('npm test');
                console.log("✅ Verification Passed!");
            } catch (testError) {
                console.error("❌ Verification Failed! Reverting changes...");
                await this.git.revertChanges();
                return false;
            }

            // 7. Commit
            await this.git.stageAll();
            await this.git.commit(`fix(${packageName}): resolve ${diagnosis.vulnerabilityId}`);

            console.log(`\n✅ Fix applied successfully on branch ${branchName}`);
            return true;

        } catch (error) {
            console.error("❌ Failed to apply fix:", error);
            // Ensure we try to cleanup if we are in a dirty state? 
            // git.revertChanges() call is inside the test catch block.
            // If other errors happen, we might want to revert too.
            return false;
        }
    }

    async run(scanResultsPath: string): Promise<void> {
        console.log("🚀 Engineer Agent Starting...\n");

        try {
            const diagnoses = await this.diagnose(scanResultsPath);

            if (diagnoses.length === 0) {
                console.log("✨ No vulnerabilities found.");
                return;
            }

            const criticalDiagnosis = diagnoses[0];
            console.log(`\n🎯 Targeting highest priority vulnerability: ${criticalDiagnosis.vulnerabilityId}`);

            const success = await this.applyFix(criticalDiagnosis);

            if (success) {
                console.log("\n🎉 Engineer Agent completed successfully!");
            } else {
                console.error("\n⚠️ Engineer Agent failed to fix the issue.");
            }

        } catch (error) {
            console.error("❌ Engineer Agent encountered an error:", error);
            throw error;
        }
    }
}
