const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

code = code.replace(/\{.*?WhatsAppApiSettingsModal.*?\}/g, '');
code = code.replace(/<WhatsAppApiSettingsModal[\s\S]*?\/>/g, '');

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
