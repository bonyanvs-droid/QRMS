const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// We will replace `'ghazzawi'` with `INITIAL_TENANTS[0].id` in logic lines.
// Except for the STORAGE_KEYS definition where it's part of the string, which we leave as is to preserve existing local data.

const replacements = [
  { search: /tenantId \|\| 'ghazzawi'/g, replace: "tenantId || INITIAL_TENANTS[0].id" },
  { search: /tenantId === 'ghazzawi'/g, replace: "tenantId === INITIAL_TENANTS[0].id" },
  { search: /\|\| 'ghazzawi'/g, replace: "|| INITIAL_TENANTS[0].id" },
  { search: /initialTid === 'ghazzawi'/g, replace: "initialTid === INITIAL_TENANTS[0].id" },
  { search: /activeTenantId === 'ghazzawi'/g, replace: "activeTenantId === INITIAL_TENANTS[0].id" },
  { search: /s\.tenantId === 'ghazzawi'/g, replace: "s.tenantId === INITIAL_TENANTS[0].id" },
  { search: /h\.tenantId === 'ghazzawi'/g, replace: "h.tenantId === INITIAL_TENANTS[0].id" },
  { search: /t\.tenantId === 'ghazzawi'/g, replace: "t.tenantId === INITIAL_TENANTS[0].id" },
  { search: /tenantId: 'ghazzawi'/g, replace: "tenantId: INITIAL_TENANTS[0].id" }
];

replacements.forEach(r => {
  code = code.replace(r.search, r.replace);
});

// Since INITIAL_TENANTS is from mockData.ts (or initialData.ts), ensure it's imported if used.
// It is already imported: `import { INITIAL_TENANTS, INITIAL_STUDENTS... } from '../data/initialData';`

fs.writeFileSync('src/context/AppContext.tsx', code);
