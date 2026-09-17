import {
  IntegrationConfig,
  QuranProviderConfig,
  Environment,
  ConnectionTestResult,
} from '../types/config';
import { BundledQuranProvider } from '../providers/BundledQuranProvider';
import { QuranComProvider } from '../providers/QuranComProvider';
import { AlQuranCloudProvider } from '../providers/AlQuranCloudProvider';
import { FallbackQuranProvider } from '../providers/FallbackQuranProvider';
import { IQuranDataProvider } from '../providers/IQuranDataProvider';
import { MushafProfile } from '../types';
import { getMushafProfileById } from '../models/MushafProfile';

/**
 * Default Non-Sensitive Integration Configurations
 * Environments: Development | Staging | Production
 *
 * NOTE ON SECRETS SECURITY:
 * ------------------------
 * Non-sensitive configuration (endpoints, timeouts, caching policies) can be safely
 * managed via configuration state or admin UI.
 * Any sensitive tokens or API keys MUST remain in server-side environment variables
 * (e.g. process.env.QURAN_API_KEY) and NEVER exposed to the frontend bundle or client state.
 */
export const DEFAULT_INTEGRATION_CONFIGS: Record<Environment, IntegrationConfig> = {
  development: {
    environment: 'development',
    primaryProviderId: 'bundled',
    activeMushafProfileId: 'madani_15_lines',
    updatedAt: new Date().toISOString(),
    providers: {
      bundled: {
        id: 'bundled',
        name: 'المصدر المحلي المدمج (تنزيل / مصحف المدينة)',
        provider: 'bundled',
        enabled: true,
        baseUrl: 'local://bundled-quran-data',
        apiVersion: '1.0.0',
        authType: 'none',
        connectionStatus: 'connected',
        timeoutMs: 0,
        retryPolicy: { maxRetries: 0, backoffMs: 0 },
        cachePolicy: { ttlMs: Infinity, persistOffline: true },
        syncSettings: { autoSync: false, intervalHours: 0 },
      },
      quran_com: {
        id: 'quran_com',
        name: 'Quran.com v4 REST API',
        provider: 'quran_com',
        enabled: true,
        baseUrl: 'https://api.quran.com/api/v4',
        apiVersion: 'v4',
        authType: 'none',
        connectionStatus: 'untested',
        timeoutMs: 8000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000 },
        cachePolicy: { ttlMs: 86400000, persistOffline: true },
        syncSettings: { autoSync: false, intervalHours: 168 },
        fallbackProviderId: 'bundled',
      },
      alquran_cloud: {
        id: 'alquran_cloud',
        name: 'AlQuran.cloud Global REST API',
        provider: 'alquran_cloud',
        enabled: true,
        baseUrl: 'https://api.alquran.cloud/v1',
        apiVersion: 'v1',
        authType: 'none',
        connectionStatus: 'untested',
        timeoutMs: 8000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000 },
        cachePolicy: { ttlMs: 86400000, persistOffline: true },
        syncSettings: { autoSync: false, intervalHours: 168 },
        fallbackProviderId: 'bundled',
      },
    },
  },
  staging: {
    environment: 'staging',
    primaryProviderId: 'bundled',
    activeMushafProfileId: 'madani_15_lines',
    updatedAt: new Date().toISOString(),
    providers: {
      bundled: {
        id: 'bundled',
        name: 'المصدر المحلي المدمج (Staging Cache)',
        provider: 'bundled',
        enabled: true,
        baseUrl: 'local://bundled-quran-data',
        apiVersion: '1.0.0',
        authType: 'none',
        connectionStatus: 'connected',
        timeoutMs: 0,
        retryPolicy: { maxRetries: 0, backoffMs: 0 },
        cachePolicy: { ttlMs: Infinity, persistOffline: true },
        syncSettings: { autoSync: false, intervalHours: 0 },
      },
      quran_com: {
        id: 'quran_com',
        name: 'Quran.com v4 REST API (Staging)',
        provider: 'quran_com',
        enabled: true,
        baseUrl: 'https://api.quran.com/api/v4',
        apiVersion: 'v4',
        authType: 'none',
        connectionStatus: 'untested',
        timeoutMs: 10000,
        retryPolicy: { maxRetries: 3, backoffMs: 1500 },
        cachePolicy: { ttlMs: 86400000, persistOffline: true },
        syncSettings: { autoSync: false, intervalHours: 72 },
        fallbackProviderId: 'bundled',
      },
    },
  },
  production: {
    environment: 'production',
    primaryProviderId: 'bundled',
    activeMushafProfileId: 'madani_15_lines',
    updatedAt: new Date().toISOString(),
    providers: {
      bundled: {
        id: 'bundled',
        name: 'المصدر المحلي المدمج (Production Core)',
        provider: 'bundled',
        enabled: true,
        baseUrl: 'local://bundled-quran-data',
        apiVersion: '1.0.0',
        authType: 'none',
        connectionStatus: 'connected',
        timeoutMs: 0,
        retryPolicy: { maxRetries: 0, backoffMs: 0 },
        cachePolicy: { ttlMs: Infinity, persistOffline: true },
        syncSettings: { autoSync: false, intervalHours: 0 },
      },
      quran_com: {
        id: 'quran_com',
        name: 'Quran.com v4 High-Availability API',
        provider: 'quran_com',
        enabled: true,
        baseUrl: 'https://api.quran.com/api/v4',
        apiVersion: 'v4',
        authType: 'none',
        connectionStatus: 'untested',
        timeoutMs: 8000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000 },
        cachePolicy: { ttlMs: 604800000, persistOffline: true },
        syncSettings: { autoSync: false, intervalHours: 168 },
        fallbackProviderId: 'bundled',
      },
    },
  },
};

/**
 * Integration Manager
 * Instantiates concrete providers based on active environment & configuration.
 */
export class IntegrationConfigManager {
  private currentEnv: Environment = 'development';
  private config: IntegrationConfig;
  private instantiatedProviders = new Map<string, IQuranDataProvider>();

  constructor(env: Environment = 'development') {
    this.currentEnv = env;
    this.config = JSON.parse(JSON.stringify(DEFAULT_INTEGRATION_CONFIGS[env]));
  }

  getEnvironment(): Environment {
    return this.currentEnv;
  }

  setEnvironment(env: Environment): void {
    this.currentEnv = env;
    this.config = JSON.parse(JSON.stringify(DEFAULT_INTEGRATION_CONFIGS[env]));
    this.instantiatedProviders.clear();
  }

  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  updateProviderConfig(providerId: string, updates: Partial<QuranProviderConfig>): void {
    if (!this.config.providers[providerId]) {
      throw new Error(`Provider with id '${providerId}' does not exist.`);
    }
    this.config.providers[providerId] = {
      ...this.config.providers[providerId],
      ...updates,
    };
    this.config.updatedAt = new Date().toISOString();
    this.instantiatedProviders.delete(providerId);
  }

  setPrimaryProvider(providerId: string): void {
    if (!this.config.providers[providerId]) {
      throw new Error(`Provider '${providerId}' not configured.`);
    }
    this.config.primaryProviderId = providerId;
    this.config.updatedAt = new Date().toISOString();
  }

  getActiveMushafProfileId(): string {
    return this.config.activeMushafProfileId || 'madani_15_lines';
  }

  setActiveMushafProfileId(profileId: string): void {
    this.config.activeMushafProfileId = profileId;
    this.config.updatedAt = new Date().toISOString();
  }

  getActiveMushafProfile(): MushafProfile {
    return getMushafProfileById(this.getActiveMushafProfileId());
  }

  getProvider(providerId: string): IQuranDataProvider {
    if (this.instantiatedProviders.has(providerId)) {
      return this.instantiatedProviders.get(providerId)!;
    }

    const cfg = this.config.providers[providerId];
    if (!cfg) {
      // Fallback to bundled
      const bundled = new BundledQuranProvider();
      this.instantiatedProviders.set('bundled', bundled);
      return bundled;
    }

    let provider: IQuranDataProvider;

    switch (cfg.provider) {
      case 'bundled':
        provider = new BundledQuranProvider();
        break;
      case 'quran_com':
        provider = new QuranComProvider(cfg.baseUrl, cfg.timeoutMs);
        break;
      case 'alquran_cloud':
        provider = new AlQuranCloudProvider(cfg.baseUrl, cfg.timeoutMs);
        break;
      default:
        provider = new BundledQuranProvider();
    }

    // Check if fallback configured
    if (cfg.fallbackProviderId && cfg.fallbackProviderId !== providerId) {
      const fallbackProvider = this.getProvider(cfg.fallbackProviderId);
      provider = new FallbackQuranProvider(provider, fallbackProvider);
    }

    this.instantiatedProviders.set(providerId, provider);
    return provider;
  }

  getActiveProvider(): IQuranDataProvider {
    return this.getProvider(this.config.primaryProviderId);
  }

  async testConnection(providerId: string): Promise<ConnectionTestResult> {
    const p = this.getProvider(providerId);
    const cfg = this.config.providers[providerId];
    const testRes = await p.testConnection();

    // Update connection status in config
    if (cfg) {
      cfg.connectionStatus = testRes.success ? 'connected' : 'failed';
      cfg.lastTestedAt = new Date().toISOString();
      if (!testRes.success) {
        cfg.lastError = testRes.message;
      } else {
        delete cfg.lastError;
      }
    }

    return {
      providerId,
      providerName: p.providerName,
      success: testRes.success,
      latencyMs: testRes.latencyMs,
      message: testRes.message,
      timestamp: new Date().toISOString(),
      sampleAyahFetched: testRes.sampleAyahFetched,
    };
  }
}
