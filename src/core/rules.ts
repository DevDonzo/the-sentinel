import * as fs from 'fs';
import * as path from 'path';

export interface SentinelRules {
    content: string;
    directives: string[];
}

const RULES_FILE = path.resolve(process.cwd(), 'SENTINEL_CORE.md');

export function loadRules(): SentinelRules {
    if (!fs.existsSync(RULES_FILE)) {
        throw new Error(`CRITICAL: Rules of Engagement file not found at ${RULES_FILE}`);
    }

    const content = fs.readFileSync(RULES_FILE, 'utf-8');
    console.log("🔒 Rules of Engagement Loaded.");

    // Naive parsing for now, just split by lines and filter empty
    const directives = content.split('\n').filter(line => line.trim().length > 0);

    return { content, directives };
}
