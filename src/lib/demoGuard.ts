import { safeStorage } from './safeStorage';

export function isCurrentSessionDemo(): boolean {
  try {
    const userStr = safeStorage.getItem('school_screen_current_user') || safeStorage.getItem('qrms_current_user') || safeStorage.getItem('al_ghazzawi_current_user_v4');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u?.id?.startsWith('usr_demo_')) {
        return true;
      }
    }
    const tenantId = safeStorage.getItem('school_screen_active_tenant') || safeStorage.getItem('qrms_active_tenant') || safeStorage.getItem('al_ghazzawi_active_tenant_v4');
    if (tenantId === 'al-furqan-demo') {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
