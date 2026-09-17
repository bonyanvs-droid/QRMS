import fs from 'fs';
import path from 'path';

function walkDir(dir: string, callback: (filepath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

walkDir('src', (filepath) => {
  let file = fs.readFileSync(filepath, 'utf8');
  if (file.includes("'مجمع الغزاوي'")) {
    file = file.replace(/'مجمع الغزاوي'/g, "''");
    fs.writeFileSync(filepath, file);
  }
  if (file.includes("'مجمع الغزاوي لتحفيظ القرآن الكريم'")) {
    file = file.replace(/'مجمع الغزاوي لتحفيظ القرآن الكريم'/g, "''");
    fs.writeFileSync(filepath, file);
  }
});
