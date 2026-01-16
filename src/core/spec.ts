import * as fs from 'fs';
import * as path from 'path';

export interface Spec {
    id: string;
    filename: string;
    content: string;
}

const SENTINEL_HOME = path.resolve(__dirname, '../../');
const SPEC_DIR = path.join(SENTINEL_HOME, 'SPEC');

export function loadSpecs(): Spec[] {
    if (!fs.existsSync(SPEC_DIR)) {
        console.warn(`⚠️  SPEC directory not found at ${SPEC_DIR}. Creating it...`);
        fs.mkdirSync(SPEC_DIR);
        return [];
    }

    const files = fs.readdirSync(SPEC_DIR).filter(f => f.endsWith('.md'));
    console.log(`📋 Found ${files.length} specifications.`);

    return files.map(file => {
        const content = fs.readFileSync(path.join(SPEC_DIR, file), 'utf-8');
        return {
            id: file.replace('.md', ''),
            filename: file,
            content
        };
    });
}
