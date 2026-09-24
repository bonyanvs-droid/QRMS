/**
 * Universal Quran Data Foundation
 * Core architecture for Quranic Data, Provider Abstraction, and Integration Layer.
 */

export * from './types';
export * from './types/config';
export * from './models/MushafProfile';
export * from './providers/IQuranDataProvider';
export * from './providers/BundledQuranProvider';
export * from './providers/QuranComProvider';
export * from './providers/AlQuranCloudProvider';
export * from './providers/FallbackQuranProvider';
export * from './services/rangeCalculator';
export * from './services/syncService';
export * from './services/quranService';
export * from './config/integrationConfig';
