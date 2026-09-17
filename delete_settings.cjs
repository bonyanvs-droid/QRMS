const fs = require('fs');
let code = fs.readFileSync('src/components/common/SmartAttendanceWidget.tsx', 'utf8');

code = code.replace(/\{\/\* Settings Panel for Admin \*\/\}\s*\{settingsOpen && \([\s\S]*?<\/form>\s*\)\}\n\n/g, '');

fs.writeFileSync('src/components/common/SmartAttendanceWidget.tsx', code);
