const fs = require('fs');
const path = require('path');

const targetDirs = ['src/components', 'src/hooks', 'src/pages'];

function processDir(dir) {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) return;

    const files = fs.readdirSync(fullPath);
    for (const file of files) {
        const curPath = path.join(fullPath, file);
        if (fs.statSync(curPath).isDirectory()) {
            processDir(path.join(dir, file));
        } else if (curPath.endsWith('.ts') || curPath.endsWith('.tsx')) {
            let content = fs.readFileSync(curPath, 'utf8');
            let changed = false;

            // Replace .get(X) with [X] for mapping structures
            const regexMessages = /messages\.get\(([^)]+)\)/g;
            if (regexMessages.test(content)) {
                content = content.replace(regexMessages, 'messages[$1]');
                changed = true;
            }

            const regexTyping = /typingUsers\.get\(([^)]+)\)/g;
            if (regexTyping.test(content)) {
                content = content.replace(regexTyping, 'typingUsers[$1]');
                changed = true;
            }

            const regexUnread = /unreadCounts\.get\(([^)]+)\)/g;
            if (regexUnread.test(content)) {
                content = content.replace(regexUnread, 'unreadCounts[$1]');
                changed = true;
            }

            // Arrays from map values
            const regexArrayTyping = /Array\.from\(typingUsers\[([^\]]+)\]\)/g;
            if (regexArrayTyping.test(content)) {
                content = content.replace(regexArrayTyping, 'typingUsers[$1]');
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(curPath, content);
                console.log(`Updated ${curPath}`);
            }
        }
    }
}

targetDirs.forEach(processDir);
console.log('Consumer refactor complete.');
