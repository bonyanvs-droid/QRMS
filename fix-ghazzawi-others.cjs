const fs = require('fs');

// fix App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/tenantId \|\| 'ghazzawi'/g, "tenantId || INITIAL_TENANTS[0].id");
appCode = appCode.replace(/\|\| 'ghazzawi'/g, "|| (INITIAL_TENANTS.length > 0 ? INITIAL_TENANTS[0].id : '')");
fs.writeFileSync('src/App.tsx', appCode);

// fix tenantResolver.ts
let tenantCode = fs.readFileSync('src/lib/tenantResolver.ts', 'utf8');
tenantCode = tenantCode.replace(/'ghazzawi'/g, "''"); // just removing the hardcoded example string in comments
fs.writeFileSync('src/lib/tenantResolver.ts', tenantCode);

