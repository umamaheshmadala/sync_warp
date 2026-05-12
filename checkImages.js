const fs = require('fs');
const path = require('path');
function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matches = content.match(/<img\s+[^>]+>/g);
            if (matches) {
                matches.forEach(m => {
                    if (!m.includes('loading=')) {
                        console.log(`[MISSING LOADING] ${fullPath}\n${m}\n`);
                    }
                });
            }
        }
    }
}
walk(path.join(__dirname, 'src'));
console.log("Check Complete.");
