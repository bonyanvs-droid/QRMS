const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

if (!code.includes('updateWhatsAppConfig: (config: import')) {
  code = code.replace(/updateReportsConfig: \(config: import\('\.\.\/types'\)\.TenantReportsConfig\) => Promise<void>;/g, 
    "updateReportsConfig: (config: import('../types').TenantReportsConfig) => Promise<void>;\n  updateWhatsAppConfig: (config: import('../types').WhatsAppApiConfig) => Promise<void>;");
  
  const method = `
  const updateWhatsAppConfig = useCallback(
    async (config: import('../types').WhatsAppApiConfig) => {
      if (!activeTenantId) return;
      try {
        setTenants(prev =>
          prev.map(t =>
            t.id === activeTenantId
              ? { ...t, whatsappConfig: config }
              : t
          )
        );
        toast.success('تم حفظ إعدادات WhatsApp بنجاح');
      } catch (error) {
        toast.error('حدث خطأ أثناء التحديث');
      }
    },
    [activeTenantId]
  );
`;
  code = code.replace(/const updateAttendanceConfig = useCallback\(/, method + '\n  const updateAttendanceConfig = useCallback(');
  code = code.replace(/updateReportsConfig,\n/g, "updateReportsConfig,\n    updateWhatsAppConfig,\n");
  fs.writeFileSync('src/context/AppContext.tsx', code);
}
