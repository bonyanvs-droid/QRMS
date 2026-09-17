const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(/updateAdmissionsConfig: \(config: import\('\.\.\/types'\)\.TenantAdmissionsConfig\) => Promise<void>;/g, 
  "updateAdmissionsConfig: (config: import('../types').TenantAdmissionsConfig) => Promise<void>;\n  updateReportsConfig: (config: import('../types').TenantReportsConfig) => Promise<void>;");

if (!code.includes('const updateReportsConfig = useCallback(')) {
  const method = `
  const updateReportsConfig = useCallback(
    async (config: import('../types').TenantReportsConfig) => {
      if (!activeTenantId) return;
      try {
        setTenants(prev =>
          prev.map(t =>
            t.id === activeTenantId
              ? { ...t, reportsConfig: config }
              : t
          )
        );
        toast.success('تم تحديث إعدادات التقارير بنجاح');
      } catch (error) {
        toast.error('حدث خطأ أثناء التحديث');
      }
    },
    [activeTenantId]
  );
`;
  code = code.replace(/const updateAttendanceConfig = useCallback\(/, method + '\n  const updateAttendanceConfig = useCallback(');
  code = code.replace(/updateAdmissionsConfig,\n/g, "updateAdmissionsConfig,\n    updateReportsConfig,\n");
  fs.writeFileSync('src/context/AppContext.tsx', code);
}
