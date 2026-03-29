const fs = require('fs');
const path = require('path');
const dir = __dirname;

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = content
        .replace(/SMART EXPENSE TRACKER/g, 'SMART EXPENSE TRACKER')
        .replace(/college expenses/g, 'personal expenses')
        .replace(/college finances/g, 'personal finances')
        .replace(/student@college\.edu/g, 'you@example.com')
        .replace(/Student/g, 'User');
        
    if (content !== updated) {
        fs.writeFileSync(filePath, updated);
        console.log('Updated:', filePath);
    }
}

function walk(directory) {
    fs.readdirSync(directory).forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'css' || file === 'js') walk(fullPath);
        } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
            replaceInFile(fullPath);
        }
    });
}

walk(dir);



