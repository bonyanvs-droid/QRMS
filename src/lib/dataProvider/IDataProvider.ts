/**
 * QRMS Client-Side Data Provider Contract
 * 
 * Provides a unified, type-safe data access interface across the entire UI.
 * Components and repositories interact strictly through this abstraction,
 * completely decoupled from whether the backend is serving from DevelopmentDataProvider
 * or PostgreSQLDataProvider.
 */

export interface QueryOptions {
  tenantId?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  filter?: Record<string, any>;
  includeArchived?: boolean;
}

export interface IClientDataProvider {
  get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T>;
  post<T = any>(endpoint: string, data: any): Promise<T>;
  put<T = any>(endpoint: string, data: any): Promise<T>;
  delete(endpoint: string): Promise<boolean>;
  
  find<T = any>(collection: string, options?: QueryOptions): Promise<T[]>;
  findById<T = any>(collection: string, id: string, tenantId?: string): Promise<T | null>;
  save<T = any>(collection: string, data: Record<string, any>): Promise<T>;
  remove(collection: string, id: string, tenantId?: string): Promise<boolean>;
  bulkSave<T = any>(collection: string, items: any[]): Promise<any>;
  
  subscribe<T = any>(
    collection: string,
    callback: (data: T) => void,
    filter?: (item: any) => boolean,
    pollIntervalMs?: number
  ): () => void;
  
  setTenantContext(tenantId: string | null): void;
  getTenantContext(): string | null;
  getTargetApiUrl?(): string;
  getDataSource?(): string;
}
