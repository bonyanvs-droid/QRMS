const fs = require('fs');
let code = fs.readFileSync('src/components/admin/SupervisorsManagementTab.tsx', 'utf8');

code = code.replace(/s\.email && s\.email\.includes\(search\)/g, "('email' in s && s.email && s.email.includes(search))");
code = code.replace(/supervisor\.email \|\| 'غير محدد'/g, "('email' in supervisor ? supervisor.email : undefined) || 'غير محدد'");

fs.writeFileSync('src/components/admin/SupervisorsManagementTab.tsx', code);
