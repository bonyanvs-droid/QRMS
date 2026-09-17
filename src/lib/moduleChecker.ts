import { MosqueComplexTenant } from '../types';

export type TenantModuleKey =
  | 'quran'
  | 'attendance'
  | 'spelling'
  | 'educational'
  | 'admissions'
  | 'finances'
  | 'association'
  | 'badges'
  | 'whatsapp'
  | 'reports'
  | 'parentPortal';

/**
 * Authoritatively determines if a specific module is enabled for a given tenant.
 * Uses tenant.modulesConfig as the single source of truth.
 *
 * Default behaviors:
 * - quran: always true unless explicitly false.
 * - attendance: default true unless explicitly false.
 * - spelling: default true for Ghazzawi, false for Al-Furqan or if set to false.
 * - educational: default true unless explicitly false.
 * - admissions: default true unless explicitly false.
 * - finances: default true unless explicitly false.
 * - association: default true for Ghazzawi, false for Al-Furqan or if set to false.
 * - badges: default true unless explicitly false.
 * - whatsapp: default true unless explicitly false.
 * - reports: default true unless explicitly false.
 * - parentPortal: default true unless explicitly false.
 */
export function isModuleEnabled(
  tenant: MosqueComplexTenant | null | undefined,
  moduleKey: TenantModuleKey
): boolean {
  if (!tenant) return true;
  const cfg = tenant.modulesConfig;
  if (!cfg) return true;

  switch (moduleKey) {
    case 'quran':
      return cfg.quran !== false && cfg.quranMemorization !== false;

    case 'attendance':
      return cfg.attendance !== false;

    case 'spelling':
      return cfg.spelling !== false && cfg.quranSpelling !== false;

    case 'educational':
      return cfg.educational !== false && cfg.educationalValues !== false;

    case 'admissions':
      return cfg.admissions !== false;

    case 'finances':
      return cfg.finances !== false && cfg.finance !== false;

    case 'association':
      return cfg.association !== false && cfg.associationTesting !== false;

    case 'badges':
      return cfg.badgesAndRewards !== false;

    case 'whatsapp':
      return cfg.whatsappNotifications !== false;

    case 'reports':
      return cfg.reports !== false;

    case 'parentPortal':
      return cfg.parentPortal !== false;

    default:
      return true;
  }
}
