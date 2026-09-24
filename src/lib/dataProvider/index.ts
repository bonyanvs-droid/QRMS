import { IClientDataProvider, QueryOptions } from './IDataProvider';
import { apiClient } from '../api/apiClient';

export class UnifiedClientDataProvider implements IClientDataProvider {
  get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return apiClient.get<T>(endpoint, params);
  }

  post<T = any>(endpoint: string, data: any): Promise<T> {
    return apiClient.post<T>(endpoint, data);
  }

  put<T = any>(endpoint: string, data: any): Promise<T> {
    return apiClient.put<T>(endpoint, data);
  }

  delete(endpoint: string): Promise<boolean> {
    return apiClient.delete(endpoint);
  }

  async find<T = any>(collection: string, options: QueryOptions = {}): Promise<T[]> {
    const params: Record<string, any> = {};
    if (options.tenantId) params.tenantId = options.tenantId;
    if (options.organizationId) params.organizationId = options.organizationId;
    if (options.limit) params.limit = options.limit;
    if (options.offset) params.offset = options.offset;
    if (options.orderBy) params.orderBy = options.orderBy;
    if (options.orderDir) params.orderDir = options.orderDir;
    if (options.includeArchived) params.includeArchived = options.includeArchived;
    if (options.filter) {
      Object.assign(params, options.filter);
    }

    return apiClient.get<T[]>(`/v1/${collection}`, params);
  }

  async findById<T = any>(collection: string, id: string, tenantId?: string): Promise<T | null> {
    const params: Record<string, any> = {};
    if (tenantId) params.tenantId = tenantId;
    try {
      return await apiClient.get<T>(`/v1/${collection}/${id}`, params);
    } catch {
      return null;
    }
  }

  async save<T = any>(collection: string, data: Record<string, any>): Promise<T> {
    if (data.id) {
      return apiClient.put<T>(`/v1/${collection}/${data.id}`, data);
    }
    return apiClient.post<T>(`/v1/${collection}`, data);
  }

  async remove(collection: string, id: string, tenantId?: string): Promise<boolean> {
    const params: Record<string, any> = {};
    if (tenantId) params.tenantId = tenantId;
    return apiClient.delete(`/v1/${collection}/${id}`);
  }

  async bulkSave<T = any>(collection: string, items: any[]): Promise<any> {
    return apiClient.post(`/v1/${collection}/bulk`, { items });
  }

  subscribe<T = any>(
    collection: string,
    callback: (data: T) => void,
    filter?: (item: any) => boolean,
    pollIntervalMs = 8000
  ): () => void {
    return apiClient.subscribe<T>(collection, callback, filter, pollIntervalMs);
  }

  setTenantContext(tenantId: string | null): void {
    apiClient.setTenantContext(tenantId);
  }

  getTenantContext(): string | null {
    return apiClient.getTenantContext();
  }

  getTargetApiUrl(): string {
    return apiClient.getTargetApiUrl();
  }

  getDataSource(): string {
    return apiClient.getDataSource();
  }
}

export const dataProvider: IClientDataProvider = new UnifiedClientDataProvider();
export * from './IDataProvider';
