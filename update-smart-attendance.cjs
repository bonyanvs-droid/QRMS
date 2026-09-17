const fs = require('fs');
let code = fs.readFileSync('src/components/common/SmartAttendanceWidget.tsx', 'utf8');

// The script might not have matched the regex perfectly. 
// Let's find the start and end indices of the blocks.

// 1. Remove settingsOpen state
code = code.replace(/const \[settingsOpen, setSettingsOpen\].*?\n/g, '');

// 2. Remove handleSaveSettings
code = code.replace(/const handleSaveSettings = [\s\S]*?تم حفظ إعدادات الحضور بنجاح'\);\n  };\n/g, '');

// 3. Remove the button
code = code.replace(/\{isPrivileged && \(\s*<button[\s\S]*?<\/button>\s*\)\}/g, '');

// 4. Remove the settings panel
code = code.replace(/\{\/\* Settings Panel for Admin \*\/\}\s*\{settingsOpen && \([\s\S]*?<\/form>\s*\)\}/g, '');

fs.writeFileSync('src/components/common/SmartAttendanceWidget.tsx', code);
