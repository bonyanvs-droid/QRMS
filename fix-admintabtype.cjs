const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

code = code.replace(/type AdminTabType = 'frontend'/g, "type AdminTabType = 'frontend'\n    | 'attendance_settings'\n    | 'admissions_settings'\n    | 'reports_settings'\n    | 'whatsapp_settings'\n    | 'supervisors'");

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
