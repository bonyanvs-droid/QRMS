/**
 * QRMS PostgreSQL API Client
 * High-performance, reactive data access client communicating exclusively with the PostgreSQL backend.
 * Replaces Firestore SDK for all operational reads, writes, and real-time synchronization.
 */

type ListenerCallback<T> = (data: T) => void;
type Unsubscribe = () => void;

class ApiClient {
  private activeTenantId: string | null = null;
  private listeners: Map<string, Set<ListenerCallback<any>>> = new Map();
  private cache: Map<string, any> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Returns the configured target remote API URL that all operations forward to
   */
  getTargetApiUrl(): string {
    return 'https://qrms-dev.schoolscreen.sa/api';
  }

  getDataSource(): string {
    return 'api';
  }

  /**
   * Sets the current active tenant context for all outgoing API requests
   */
  setTenantContext(tenantId: string | null) {
    this.activeTenantId = tenantId;
  }

  getTenantContext(): string | null {
    return this.activeTenantId;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.activeTenantId) {
      headers['X-Tenant-Id'] = this.activeTenantId;
    }
    return headers;
  }

  /**
   * Safely parses JSON responses from the backend API.
   * Detects HTML or non-JSON payloads (such as proxy error pages) and produces informative diagnostics.
   */
  private async parseJsonResponse(res: Response, url: string): Promise<any> {
    const contentType = res.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      const textPreview = await res.text().catch(() => '');
      const sanitizedPreview = textPreview.substring(0, 150).replace(/\s+/g, ' ').trim();
      throw new Error(
        `API returned non-JSON response (status: ${res.status}, content-type: '${contentType || 'empty'}', url: '${url}'): ${sanitizedPreview}`
      );
    }

    let json: any;
    try {
      json = await res.json();
    } catch (parseErr: any) {
      throw new Error(
        `API returned invalid JSON (status: ${res.status}, content-type: '${contentType}', url: '${url}'): ${parseErr?.message}`
      );
    }

    if (!res.ok) {
      const errorMessage = json?.error || json?.message || `API Request failed with status ${res.status}`;
      throw new Error(errorMessage);
    }

    return json;
  }

  /**
   * Helper to build fully qualified API URL
   */
  private buildUrl(endpoint: string, queryParams?: Record<string, any>): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const baseUrl = this.getTargetApiUrl().replace(/\/+$/, '');
    
    // Normalize path to avoid duplicate /api prefix
    const path = cleanEndpoint.startsWith('/api/')
      ? cleanEndpoint.substring(4)
      : cleanEndpoint;

    const query = new URLSearchParams();
    if (queryParams) {
      for (const [key, val] of Object.entries(queryParams)) {
        if (val !== undefined && val !== null) {
          query.set(key, String(val));
        }
      }
    }
    const queryString = query.toString();
    return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Universal GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(endpoint, params);

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const json = await this.parseJsonResponse(res, url);
    return json.data !== undefined ? json.data : json;
  }

  /**
   * Universal POST request
   */
  async post<T = any>(endpoint: string, data: any): Promise<T> {
    const url = this.buildUrl(endpoint);

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    const json = await this.parseJsonResponse(res, url);
    const result = json.data !== undefined ? json.data : json;

    // Notify listeners for collection mutations
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const collection = cleanEndpoint.replace(/^\/api\//, '').split('/')[0];
    if (collection) {
      this.notifyListeners(collection);
    }

    return result;
  }

  /**
   * Universal PUT request
   */
  async put<T = any>(endpoint: string, data: any): Promise<T> {
    const url = this.buildUrl(endpoint);

    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    const json = await this.parseJsonResponse(res, url);
    const result = json.data !== undefined ? json.data : json;

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const collection = cleanEndpoint.replace(/^\/api\//, '').split('/')[0];
    if (collection) {
      this.notifyListeners(collection);
    }

    return result;
  }

  /**
   * Universal DELETE request
   */
  async delete(endpoint: string): Promise<boolean> {
    const url = this.buildUrl(endpoint);

    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const json = await this.parseJsonResponse(res, url);

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const collection = cleanEndpoint.replace(/^\/api\//, '').split('/')[0];
    if (collection) {
      this.notifyListeners(collection);
    }

    return json.ok !== false;
  }

  /**
   * Reactive subscription with immediate fetch and reactive event notifications
   */
  subscribe<T = any[]>(
    collection: string,
    callback: ListenerCallback<T>,
    filterParams?: Record<string, any>,
    pollIntervalMs: number = 10000
  ): Unsubscribe {
    const listenerKey = `${collection}_${JSON.stringify(filterParams || {})}`;
    
    if (!this.listeners.has(listenerKey)) {
      this.listeners.set(listenerKey, new Set());
    }
    this.listeners.get(listenerKey)!.add(callback);

    const fetchLatest = async () => {
      try {
        const data = await this.get<T>(`/${collection}`, filterParams);
        this.cache.set(listenerKey, data);
        callback(data);
      } catch (err) {
        console.warn(`[ApiClient] Subscription fetch for ${collection} encountered:`, err);
      }
    };

    // Initial fetch
    fetchLatest();

    // Start background polling if not already running
    if (!this.pollIntervals.has(listenerKey)) {
      const timer = setInterval(fetchLatest, pollIntervalMs);
      this.pollIntervals.set(listenerKey, timer);
    }

    return () => {
      const set = this.listeners.get(listenerKey);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(listenerKey);
          const timer = this.pollIntervals.get(listenerKey);
          if (timer) {
            clearInterval(timer);
            this.pollIntervals.delete(listenerKey);
          }
        }
      }
    };
  }

  /**
   * Triggers re-fetch for all active subscriptions listening to the specified collection
   */
  notifyListeners(collection: string) {
    for (const [key, callbacks] of this.listeners.entries()) {
      if (key.startsWith(collection)) {
        // Trigger async refresh
        const filterStr = key.substring(collection.length + 1);
        let params: Record<string, any> | undefined;
        try {
          params = JSON.parse(filterStr);
        } catch {
          params = undefined;
        }

        this.get(`/${collection}`, params)
          .then((data) => {
            for (const cb of callbacks) {
              cb(data);
            }
          })
          .catch((err) => console.warn(`Error refreshing listeners for ${collection}:`, err));
      }
    }
  }
}

export const apiClient = new ApiClient();
