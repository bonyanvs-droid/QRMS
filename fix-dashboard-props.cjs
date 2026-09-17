const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

// We want to replace `onOpenWhatsAppModal={() => setShowWhatsAppSettings(true)}` 
// with `onOpenWhatsAppModal={() => navigate('/admin/whatsapp_settings')}`

code = code.replace(/onOpenWhatsAppModal=\{.*?\}/, "onOpenWhatsAppModal={() => navigate('/admin/whatsapp_settings')}");

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
