const fs = require('fs');
const path = require('path');
const dbRsPath = 'src-tauri/src/db.rs';
let dbRsContent = fs.readFileSync(dbRsPath, 'utf8');

let migrationsBlock = '';
for (let i = 1; i <= 9; i++) {
    let vStr = 'V00' + i;
    let files = fs.readdirSync('src-tauri/migrations');
    let fileName = files.find(f => f.startsWith(vStr));
    let sqlContent = fs.readFileSync(path.join('src-tauri/migrations', fileName), 'utf8');
    
    let statements = sqlContent.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => {
            s = s.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
            return `r#"${s}"#`;
        });
        
    migrationsBlock += `static MIGRATION_${vStr}: &[&str] = &[\n    ${statements.join(',\n    ')}\n];\n\n`;
}

let startIndex = dbRsContent.indexOf('static MIGRATION_V001:');
if (startIndex !== -1) {
    let newDbRs = dbRsContent.substring(0, startIndex) + migrationsBlock;
    fs.writeFileSync(dbRsPath, newDbRs);
    console.log('Fixed db.rs with correct migrations');
} else {
    console.log('Could not find MIGRATION_V001 in db.rs');
}
