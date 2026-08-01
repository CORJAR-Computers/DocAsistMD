const fs = require('fs');

const file = 'src-tauri/src/models.rs';
let content = fs.readFileSync(file, 'utf8');

// Remove ALL existing serde rename_all lines (including corrupted ones)
content = content.split('\n').filter(line => !line.includes('serde(rename_all')).join('\n');

// Add the correct serde after each derive
content = content.replace(
  /#\[derive\(Debug, Clone, Serialize, Deserialize\)\]/g,
  '#[derive(Debug, Clone, Serialize, Deserialize)]\n#[serde(rename_all = "camelCase")]'
);

fs.writeFileSync(file, content);
console.log('Fixed models.rs - done');

// Verify first few lines
const lines = content.split('\n').slice(0, 20);
console.log(lines.join('\n'));
