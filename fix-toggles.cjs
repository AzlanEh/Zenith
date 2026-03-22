const fs = require('fs');

const files = ['src/pages/Settings.tsx', 'src/pages/Limits.tsx', 'src/pages/FocusMode.tsx'];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/after:bg-white after:border-gray-300/g, "after:bg-background after:border-border");
    content = content.replace(/peer-checked:after:border-white/g, "peer-checked:after:border-background");
    fs.writeFileSync(file, content);
  }
}
console.log("Done");
