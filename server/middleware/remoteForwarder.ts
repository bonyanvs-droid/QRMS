import { Request, Response, NextFunction } from 'express';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { config } from '../config/env';

// Dedicated HTTPS & HTTP agents with keepAlive for reliable connection reuse
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 15,
  maxFreeSockets: 5,
  timeout: 30000,
});

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 15,
  maxFreeSockets: 5,
  timeout: 30000,
});

/**
 * Execute a proxied request with automatic retries for transient socket drops
 */
function forwardRequestWithRetry(
  targetUrl: URL,
  method: string,
  headers: Record<string, string>,
  payload: Buffer | undefined,
  maxRetries = 2
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  const transport = targetUrl.protocol === 'https:' ? https : http;
  const agent = targetUrl.protocol === 'https:' ? httpsAgent : httpAgent;

  const attempt = (retryCount: number): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> => {
    return new Promise((resolve, reject) => {
      const proxyReq = transport.request(
        targetUrl,
        {
          method,
          headers,
          agent,
          timeout: 25000,
        },
        (proxyRes) => {
          const chunks: Buffer[] = [];
          proxyRes.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          proxyRes.on('end', () => {
            resolve({
              statusCode: proxyRes.statusCode || 200,
              headers: proxyRes.headers,
              body: Buffer.concat(chunks),
            });
          });
        }
      );

      proxyReq.on('timeout', () => {
        proxyReq.destroy(new Error('Connection to upstream API timed out'));
      });

      proxyReq.on('error', async (err: any) => {
        const errMsg = err?.message || String(err);
        const isTransient =
          errMsg.includes('socket hang up') ||
          err.code === 'ECONNRESET' ||
          err.code === 'EPIPE' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'EAI_AGAIN';

        if (isTransient && retryCount < maxRetries) {
          // Exponential backoff before retry
          await new Promise((r) => setTimeout(r, 150 * (retryCount + 1)));
          try {
            const result = await attempt(retryCount + 1);
            return resolve(result);
          } catch (retryErr) {
            return reject(retryErr);
          }
        }
        reject(err);
      });

      if (payload && payload.length > 0) {
        proxyReq.write(payload);
      }
      proxyReq.end();
    });
  };

  return attempt(0);
}

/**
 * Recursively normalizes empty objects `{}` or invalid string patterns in date/timestamp fields to null
 */
function cleanPayloadForPostgres(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    return trimmed === '{}' ? null : obj;
  }
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanPayloadForPostgres);
  }
  const keys = Object.keys(obj);
  if (keys.length === 0 && !(obj instanceof Date)) {
    return null;
  }
  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const isDateField = /(?:date|time|at|_at)$/i.test(k) || k === 'termStart' || k === 'termEnd' || k === 'phaseStart' || k === 'phaseEnd';
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      if (Object.keys(v).length === 0) {
        sanitized[k] = null;
        continue;
      }
    }
    if (typeof v === 'string' && v.trim() === '{}' && isDateField) {
      sanitized[k] = null;
      continue;
    }
    sanitized[k] = cleanPayloadForPostgres(v);
  }
  return sanitized;
}

/**
 * Rewrites Set-Cookie attributes to be compatible with AI Studio Preview (Iframe/Cross-site)
 */
function rewriteSetCookieForPreview(cookieStr: string): string {
  // Remove Domain attribute to let browser use current preview domain
  let rewritten = cookieStr.replace(/Domain=[^;]+;?\s*/gi, '');
  
  // Ensure Secure and SameSite=None for iframe compatibility
  if (!rewritten.toLowerCase().includes('samesite=')) {
    rewritten += '; SameSite=None';
  } else {
    rewritten = rewritten.replace(/SameSite=[^;]+/gi, 'SameSite=None');
  }

  if (!rewritten.toLowerCase().includes('secure')) {
    rewritten += '; Secure';
  }

  // Adjust path if needed (usually /api is enough but let's keep it flexible)
  return rewritten;
}

/**
 * Secure Server-Side Remote Forwarder Middleware.
 */
export function createRemoteForwarder() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // If not in remote-proxy mode, proceed directly to local routes & database
    console.log(`[Forwarder] Request: ${req.method} ${req.originalUrl} | Mode: ${config.apiRuntimeMode}`);
    if (config.apiRuntimeMode !== 'remote-proxy') {
      console.log(`[Forwarder] Skipping - Not in remote-proxy mode`);
      return next();
    }

    // Fix Root Cause: Skip proxying for auth routes to allow local handling.
    // This allows the local authRouter to verify credentials and manage sessions.
    if (req.originalUrl.includes('/api/auth/login') || 
        req.originalUrl.includes('/api/auth/me') || 
        req.originalUrl.includes('/api/auth/update-password')) {
      console.log(`[AUTH-TRACE] Bypassing proxy for: ${req.originalUrl}`);
      return next();
    }

    try {
      const targetBase = config.devRemoteApiUrl.replace(/\/+$/, '');
      const subPath = req.originalUrl.replace(/^\/api(\/|$)/, '/');
      const targetUrlStr = `${targetBase}${subPath}`;
      const targetUrl = new URL(targetUrlStr);
      console.log(`[Forwarder] Target URL: ${targetUrlStr}`);

      // Prevent accidental loopback to localhost
      if (
        (targetUrl.hostname === 'localhost' || targetUrl.hostname === '127.0.0.1') &&
        targetUrl.port === String(config.port)
      ) {
        res.status(500).json({
          ok: false,
          error: 'Recursive proxy detected. Remote API URL cannot point to the local server port in remote-proxy mode.',
        });
        return;
      }

      // Prepare request headers
      const forwardHeaders: Record<string, string> = {
        'Accept': 'application/json',
        'Host': targetUrl.host,
        'User-Agent': 'QRMS-Server-Forwarder/1.0',
      };

      if (req.headers['content-type']) {
        forwardHeaders['Content-Type'] = String(req.headers['content-type']);
      }

      // CRITICAL: Forward existing session cookies from browser to VPS
      if (req.headers['cookie']) {
        forwardHeaders['Cookie'] = String(req.headers['cookie']);
      }

      // Forward Tenant Context
      if (req.headers['x-tenant-id'] || req.tenantId) {
        forwardHeaders['X-Tenant-Id'] = String(req.headers['x-tenant-id'] || req.tenantId);
      }
      if (req.headers['x-organization-id'] || req.organizationId) {
        forwardHeaders['X-Organization-Id'] = String(req.headers['x-organization-id'] || req.organizationId);
      }

      // Inject Server-Side HTTP Basic Auth from Environment Secrets ONLY
      let basicAuthHeader = '';
      if (config.devApiBasicAuth) {
        const raw = config.devApiBasicAuth.trim();
        basicAuthHeader = raw.toLowerCase().startsWith('basic ') ? raw : `Basic ${raw}`;
      } else if (config.devApiUsername && config.devApiPassword) {
        const token = Buffer.from(`${config.devApiUsername}:${config.devApiPassword}`).toString('base64');
        basicAuthHeader = `Basic ${token}`;
      }

      if (basicAuthHeader) {
        forwardHeaders['Authorization'] = basicAuthHeader;
      }

      // Prepare payload body with exact Content-Length
      let payload: Buffer | undefined;
      const isBodyMethod = !['GET', 'HEAD'].includes(req.method.toUpperCase());

      if (req.body !== undefined && req.body !== null && isBodyMethod) {
        const cleanedBody = typeof req.body === 'object' ? cleanPayloadForPostgres(req.body) : req.body;
        const bodyStr = typeof cleanedBody === 'string' ? cleanedBody : JSON.stringify(cleanedBody);
        payload = Buffer.from(bodyStr, 'utf8');
        forwardHeaders['Content-Type'] = forwardHeaders['Content-Type'] || 'application/json; charset=utf-8';
        forwardHeaders['Content-Length'] = String(payload.length);
      } else if (isBodyMethod) {
        forwardHeaders['Content-Length'] = '0';
      }

      const result = await forwardRequestWithRetry(targetUrl, req.method, forwardHeaders, payload);

      const contentType = String(result.headers['content-type'] || '');
      const statusCode = result.statusCode || 200;

      // If upstream returned non-JSON error (such as 502/404 HTML), wrap cleanly in JSON
      if (!contentType.includes('application/json') && statusCode >= 400) {
        if (!res.headersSent) {
          res.status(statusCode).json({
            ok: false,
            status: statusCode,
            error: `Remote API error (${statusCode}): Upstream service returned non-JSON response.`,
          });
        }
        return;
      }

      if (!res.headersSent) {
        res.status(statusCode);
        res.setHeader('Content-Type', contentType || 'application/json; charset=utf-8');
        res.setHeader('X-Debug-Forwarder', 'active');

        // Forward and Rewrite Set-Cookie headers
        const setCookie = result.headers['set-cookie'];
        if (setCookie) {
          const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
          const rewrittenCookies = cookies.map(rewriteSetCookieForPreview);
          res.setHeader('Set-Cookie', rewrittenCookies);
        }

        res.send(result.body);
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(502).json({
          ok: false,
          error: `Failed to communicate with remote development API: ${err?.message || 'Network error'}`,
        });
      }
    }
  };
}

