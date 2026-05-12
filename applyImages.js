const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content.replace(/<img\s([^>]*?)>/gs, (match, inner) => {
        let modified = inner;
        let changed = false;

        // Avoid double applying or messing with strings that happen to contain `<img `
        // If it's inside a comment, we might accidentally touch it (e.g., // <img src="...")
        // But since this is a simple script, we'll accept that edge case.

        if (!modified.includes('decoding=')) {
            modified = 'decoding="async" ' + modified;
            changed = true;
        }

        if (!modified.includes('loading=')) {
            modified = 'loading="lazy" ' + modified;
            changed = true;
        }

        if (changed) {
            return `<img ${modified}>`;
        }
        return match;
    });

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
            processFile(fullPath);
        }
    }
}

walk(path.join(__dirname, 'src'));
console.log('Image tag update complete.');
