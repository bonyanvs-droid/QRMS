/**
 * Quran Integration Configuration Types
 * Supports Environment Separation (Dev / Staging / Production)
 * and Strict Separation of Non-sensitive Settings from Secrets.
 */

export type ProviderType = 'bundled' | 'quran_com' | 'alquran_cloud' | 'custom';

export type Environment = 'development' | 'staging' | 'production';

export type AuthenticationType = 'none' | 'bearer' | 'apiKey';

export type ConnectionStatus = 'connected' | 'untested' | 'failed' | 'degraded';

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
}

export interface CachePolicy {
  ttlMs: number;
  persistOffline: boolean;
}

export interface SyncSettings {
  autoSync: boolean;
  intervalHours: number;
}

export interface QuranProviderConfig {
  id: string;
  name: string;
  provider: ProviderType;
  enabled: boolean;
  baseUrl: string;
  apiVersion: string;
  authType: AuthenticationType;
  connectionStatus: ConnectionStatus;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  cachePolicy: CachePolicy;
  syncSettings: SyncSettings;
  fallbackProviderId?: string;
  lastTestedAt?: string;
  lastError?: string;
}

export interface IntegrationConfig {
  environment: Environment;
  primaryProviderId: string;
  activeMushafProfileId?: string;
  providers: Record<string, QuranProviderConfig>;
  updatedAt: string;
}

export interface ConnectionTestResult {
  providerId: string;
  providerName: string;
  success: boolean;
  latencyMs: number;
  message: string;
  timestamp: string;
  sampleAyahFetched?: string;
}
