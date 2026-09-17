export function isCurrentSessionDemo(): boolean {
  try {
    const userStr = localStorage.getItem('school_screen_current_user') || localStorage.getItem('qrms_current_user') || localStorage.getItem('al_ghazzawi_current_user_v4');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u?.id?.startsWith('usr_demo_')) {
        return true;
      }
    }
    const tenantId = localStorage.getItem('school_screen_active_tenant') || localStorage.getItem('qrms_active_tenant') || localStorage.getItem('al_ghazzawi_active_tenant_v4');
    if (tenantId === 'al-furqan-demo') {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
