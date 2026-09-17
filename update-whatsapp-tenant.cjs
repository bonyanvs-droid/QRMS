const fs = require('fs');
let typesCode = fs.readFileSync('src/types/index.ts', 'utf8');

if (!typesCode.includes('whatsappConfig?: WhatsAppApiConfig')) {
  typesCode = typesCode.replace(/reportsConfig\?: TenantReportsConfig;/g, 'reportsConfig?: TenantReportsConfig;\n  whatsappConfig?: WhatsAppApiConfig;');
  fs.writeFileSync('src/types/index.ts', typesCode);
}
