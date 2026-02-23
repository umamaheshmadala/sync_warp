const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content.replace(/<img\s([^>]*?)>/gs, (match, inner) => {
        let modified = inner;
        let changed = false;

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
