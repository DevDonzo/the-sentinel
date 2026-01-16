import { EngineerAgent } from './index';
import * as path from 'path';

/**
 * Demo script to test the Engineer Agent
 * This will read the scan results and simulate fixing the critical lodash vulnerability
 */
async function main() {
    const engineer = new EngineerAgent();
    const scanResultsPath = path.resolve(__dirname, '../../../scan-results/scan-results.json');

    await engineer.run(scanResultsPath);
}

main().catch(console.error);
