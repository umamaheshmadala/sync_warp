const fs = require('fs');
const path = require('path');

const actions = [
    'signUp', 'signIn', 'signOut',
    'updateProfile', 'uploadAvatar', 'checkUser',
    'clearError', 'forgotPassword', 'resetPassword'
];

function walk(dir) {
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            count += walk(fullPath);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
            // Exclude tests and the store definition itself
            if (fullPath.includes('__tests__') || entry.name === 'authStore.ts') continue;

            let content = fs.readFileSync(fullPath, 'utf8');

            const regex = /^([ \t]*)(const|let|var)\s+\{([\s\S]+?)\}\s*=\s*useAuthStore\s*\(\s*\);?/gm;
            let changed = false;

            const newContent = content.replace(regex, (match, indent, keyword, fieldsStr) => {
                const fields = fieldsStr.split(',').map(f => f.trim()).filter(f => f);
                const dataDecls = [];
                const actionDecls = [];

                let skip = false;

                for (const field of fields) {
                    if (field.includes('=')) {
                        console.log(`[SKIPPING] Default value found in ${fullPath}: ${field}`);
                        skip = true;
                        break;
                    }

                    const parts = field.split(':').map(p => p.trim());
                    const propName = parts[0];
                    const alias = parts[1] || propName;

                    if (actions.includes(propName)) {
                        actionDecls.push(field);
                    } else {
                        dataDecls.push(`${indent}${keyword} ${alias} = useAuthStore((state) => state.${propName});`);
                    }
                }

                if (skip) return match;

                const lines = [];
                if (dataDecls.length > 0) {
                    lines.push(dataDecls.join('\n'));
                }
                if (actionDecls.length > 0) {
                    lines.push(`${indent}${keyword} { ${actionDecls.join(', ')} } = useAuthStore();`);
                }

                changed = true;
                return lines.join('\n');
            });

            if (changed && content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log(`Updated: ${fullPath}`);
                count++;
            }
        }
    }
    return count;
}

const totalUpdated = walk(path.join(__dirname, 'src'));
console.log(`\nOperation Complete. Total files updated: ${totalUpdated}`);
