const fs = require('fs');
const path = require('path');

const reportPath = 'C:/Users/umama/.gemini/antigravity/brain/595b556b-22c8-422f-aa11-272f33c961c1/navigation_audit_report.md';
const content = fs.readFileSync(reportPath, 'utf8');
const lines = content.split('\n');

const validItems = [];

lines.forEach(line => {
    // Look for table rows
    if (!line.startsWith('|') || line.startsWith('| Page')) return;

    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 5) return;

    const file = parts[1].replace(/`/g, '');
    const lineNum = parts[2];
    const type = parts[3].replace(/`/g, '');
    const action = parts[4].replace(/`/g, '');

    // Filter for interaction handlers that use navigate
    if (action.includes('navigate(') || action.includes('navigate`')) {
        validItems.push({
            file,
            line: parseInt(lineNum),
            type,
            action
        });
    }
});

// Group by file
const grouped = {};
validItems.forEach(item => {
    if (!grouped[item.file]) grouped[item.file] = [];
    grouped[item.file].push(item);
});

const outputPath = 'filtered_navigation.json';
fs.writeFileSync(outputPath, JSON.stringify(grouped, null, 2), 'utf8');
console.log(`Written to ${outputPath}`);
