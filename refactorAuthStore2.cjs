const fs = require('fs');
const path = require('path');

const actions = [
    'signUp', 'signIn', 'signOut',
    'updateProfile', 'uploadAvatar', 'checkUser',
    'clearError', 'forgotPassword', 'resetPassword'
];

function getIndent(content, index) {
    let i = index - 1;
    while (i >= 0 && (content[i] === ' ' || content[i] === '\t')) {
        i--;
    }
    return content.slice(i + 1, index);
}

function walk(dir) {
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            count += walk(fullPath);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
            if (fullPath.includes('__tests__') || entry.name === 'authStore.ts') continue;

            let content = fs.readFileSync(fullPath, 'utf8');

            const regex = /(const|let|var)\s+\{([^}]+)\}\s*=\s*useAuthStore\s*\(\s*\);?/g;
            let changed = false;

            const newContent = content.replace(regex, (match, keyword, fieldsStr, offset) => {
                const indent = getIndent(content, offset);

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
                        dataDecls.push(`${keyword} ${alias} = useAuthStore((state) => state.${propName});`);
                    }
                }

                if (skip) return match;

                if (dataDecls.length === 0) {
                    return match; // No data fields to convert to selectors
                }

                const lines = [];
                if (dataDecls.length > 0) {
                    lines.push(dataDecls.join(`\n${indent}`));
                }
                if (actionDecls.length > 0) {
                    lines.push(`${keyword} { ${actionDecls.join(', ')} } = useAuthStore();`);
                }

                changed = true;
                return lines.join(`\n${indent}`);
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
