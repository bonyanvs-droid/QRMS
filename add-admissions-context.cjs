const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(/updateAttendanceConfig: \(config: TenantAttendanceConfig\) => Promise<void>;/g, 
  "updateAttendanceConfig: (config: TenantAttendanceConfig) => Promise<void>;\n  updateAdmissionsConfig: (config: import('../types').TenantAdmissionsConfig) => Promise<void>;");

if (!code.includes('const updateAdmissionsConfig = useCallback(')) {
  const method = `
  const updateAdmissionsConfig = useCallback(
    async (config: import('../types').TenantAdmissionsConfig) => {
      if (!activeTenantId) return;
      try {
        setTenants(prev =>
          prev.map(t =>
            t.id === activeTenantId
              ? { ...t, admissionsConfig: config }
              : t
          )
        );
        toast.success('تم تحديث إعدادات القبول والتسجيل بنجاح');
      } catch (error) {
        toast.error('حدث خطأ أثناء التحديث');
      }
    },
    [activeTenantId]
  );
`;
  code = code.replace(/const updateAttendanceConfig = useCallback\(/, method + '\n  const updateAttendanceConfig = useCallback(');
  code = code.replace(/updateAttendanceConfig,\n/g, "updateAttendanceConfig,\n    updateAdmissionsConfig,\n");
  fs.writeFileSync('src/context/AppContext.tsx', code);
}
