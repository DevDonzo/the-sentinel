import * as fs from 'fs';
import * as path from 'path';

export interface SentinelRules {
    content: string;
    directives: string[];
}

// Ensure the rules are loaded from the Sentinel's home directory even if process.cwd() changes
const SENTINEL_HOME = path.resolve(__dirname, '../../');
const RULES_FILE = path.join(SENTINEL_HOME, 'SENTINEL_CORE.md');

export function loadRules(): SentinelRules {
    if (!fs.existsSync(RULES_FILE)) {
        throw new Error(`CRITICAL: Rules of Engagement file not found at ${RULES_FILE}`);
    }

    const content = fs.readFileSync(RULES_FILE, 'utf-8');
    console.log("🔒 Rules of Engagement Loaded.");

    const directives = content.split('\n').filter(line => line.trim().length > 0);

    return { content, directives };
}
