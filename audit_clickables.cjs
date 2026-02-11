const fs = require('fs');
const path = require('path');
const glob = require('glob');

// List of all component files recursively to ensure coverage
const patterns = [
    'src/components/**/*.tsx',
    'src/pages/**/*.tsx',
    'src/layouts/**/*.tsx'
];

let allFiles = [];
patterns.forEach(p => {
    // Synchronous glob for simplicity in this script
    try {
        const matches = glob.sync(p, { cwd: __dirname });
        allFiles = allFiles.concat(matches);
    } catch (e) {
        console.error(`Error globbing ${p}:`, e);
    }
});

function cleanText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim().substring(0, 50);
}

const results = [];

function processFile(filePath) {
    const fullPath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return;

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const fileName = path.basename(filePath);
    const relativePath = path.relative(__dirname, fullPath);

    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        // 1. Check for <Link>
        if (line.includes('<Link')) {
            const toMatch = line.match(/to=(?:\{["'`]?([^}"'`]+)["'`]?\}|["']([^"']+)["'])/);
            const to = toMatch ? (toMatch[1] || toMatch[2]) : 'Dynamic/Unknown';

            results.push({
                file: relativePath,
                line: lineNum,
                type: 'Link',
                element: '<Link>',
                action: `Navigates to: ${to}`
            });
        }

        // 2. Check for onClick handlers on ANY element
        if (line.includes('onClick=')) {
            let elementType = 'Unknown';
            // Simple heuristic to find element type from start of line or near onClick
            // Very naive parser
            const elementMatch = line.match(/<(\w+)/);
            if (elementMatch) elementType = elementMatch[1];

            const handlerMatch = line.match(/onClick=\{([^}]+)\}/);
            const handler = handlerMatch ? handlerMatch[1] : 'Function';

            results.push({
                file: relativePath,
                line: lineNum,
                type: 'Interactive',
                element: `<${elementType}>`,
                action: `Handler: ${handler}`
            });
        }
    });
}

// Process unique files
[...new Set(allFiles)].forEach(processFile);

// Output to Artifact File
const artifactPath = 'C:/Users/umama/.gemini/antigravity/brain/595b556b-22c8-422f-aa11-272f33c961c1/navigation_audit_report.md';

let output = '# Navigation and Clickable Element Audit\n\n';
output += 'This report lists all interactive elements (Links, Buttons, Click handlers) across the application pages.\n\n';
output += '| Page / File | Line | Element Type | Interaction / Destination | Context |\n';
output += '|---|---|---|---|---|\n';

// Sort results by file then line
results.sort((a, b) => {
    if (a.file === b.file) return a.line - b.line;
    return a.file.localeCompare(b.file);
});

results.forEach(r => {
    // Escape pipes for markdown table
    const safeAction = (r.action || '').replace(/\|/g, '\\|');
    const safeElement = (r.element || '').replace(/\|/g, '\\|');
    const safeContext = (r.context || '').replace(/\|/g, '\\|');
    output += `| \`${r.file}\` | ${r.line} | \`${safeElement}\` | \`${safeAction}\` | ${safeContext} |\n`;
});

fs.writeFileSync(artifactPath, output);
console.log(`Report written to ${artifactPath}`);
