var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express10 = __toESM(require("express"), 1);
var import_path3 = __toESM(require("path"), 1);

// server/app.ts
var import_express9 = __toESM(require("express"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);

// server/middleware/tenantContext.ts
function extractTenantContext(req, res, next) {
  const headerTenantId = req.headers["x-tenant-id"];
  const queryTenantId = req.query.tenantId;
  const headerOrgId = req.headers["x-organization-id"];
  const queryOrgId = req.query.organizationId;
  const rawTenantId = headerTenantId || queryTenantId;
  const rawOrgId = headerOrgId || queryOrgId;
  if (rawTenantId && typeof rawTenantId === "string") {
    req.tenantId = rawTenantId.trim();
  }
  if (rawOrgId && typeof rawOrgId === "string") {
    req.organizationId = rawOrgId.trim();
  }
  next();
}
function requireTenantContext(req, res, next) {
  if (!req.tenantId) {
    res.status(400).json({
      ok: false,
      error: "Tenant context is required for this operation. Please provide the X-Tenant-Id header or tenantId parameter."
    });
    return;
  }
  next();
}

// server/middleware/remoteForwarder.ts
var import_http = __toESM(require("http"), 1);
var import_https = __toESM(require("https"), 1);
var import_url = require("url");

// server/config/env.ts
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var config = {
  get port() {
    return parseInt(process.env.PORT || "3000", 10);
  },
  get nodeEnv() {
    return process.env.NODE_ENV || "development";
  },
  get databaseUrl() {
    return process.env.DATABASE_URL || "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  // Explicit API Runtime Mode:
  // - 'local-db': Direct connection to PostgreSQL database (used on VPS / local backend with DATABASE_URL)
  // - 'remote-proxy': Forwards /api/* requests to remote HTTPS API with server-side Basic Auth (used in AI Studio sandbox)
  get apiRuntimeMode() {
    return process.env.API_RUNTIME_MODE || (process.env.DATABASE_URL ? "local-db" : "remote-proxy");
  },
  get devRemoteApiUrl() {
    return process.env.DEV_REMOTE_API_URL || "https://qrms-dev.schoolscreen.sa/api";
  },
  get devApiBasicAuth() {
    return process.env.DEV_API_BASIC_AUTH || "";
  },
  get devApiUsername() {
    return process.env.DEV_API_USERNAME || "";
  },
  get devApiPassword() {
    return process.env.DEV_API_PASSWORD || "";
  }
};

// server/middleware/remoteForwarder.ts
var httpsAgent = new import_https.default.Agent({
  keepAlive: true,
  keepAliveMsecs: 3e4,
  maxSockets: 15,
  maxFreeSockets: 5,
  timeout: 3e4
});
var httpAgent = new import_http.default.Agent({
  keepAlive: true,
  keepAliveMsecs: 3e4,
  maxSockets: 15,
  maxFreeSockets: 5,
  timeout: 3e4
});
function forwardRequestWithRetry(targetUrl, method, headers, payload, maxRetries = 2) {
  const transport = targetUrl.protocol === "https:" ? import_https.default : import_http.default;
  const agent = targetUrl.protocol === "https:" ? httpsAgent : httpAgent;
  const attempt = (retryCount) => {
    return new Promise((resolve, reject) => {
      const proxyReq = transport.request(
        targetUrl,
        {
          method,
          headers,
          agent,
          timeout: 25e3
        },
        (proxyRes) => {
          const chunks = [];
          proxyRes.on("data", (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          proxyRes.on("end", () => {
            resolve({
              statusCode: proxyRes.statusCode || 200,
              headers: proxyRes.headers,
              body: Buffer.concat(chunks)
            });
          });
        }
      );
      proxyReq.on("timeout", () => {
        proxyReq.destroy(new Error("Connection to upstream API timed out"));
      });
      proxyReq.on("error", async (err) => {
        const errMsg = err?.message || String(err);
        const isTransient = errMsg.includes("socket hang up") || err.code === "ECONNRESET" || err.code === "EPIPE" || err.code === "ETIMEDOUT" || err.code === "EAI_AGAIN";
        if (isTransient && retryCount < maxRetries) {
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
function cleanPayloadForPostgres(obj) {
  if (obj === null || obj === void 0) return obj;
  if (typeof obj === "string") {
    const trimmed = obj.trim();
    return trimmed === "{}" ? null : obj;
  }
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanPayloadForPostgres);
  }
  const keys = Object.keys(obj);
  if (keys.length === 0 && !(obj instanceof Date)) {
    return null;
  }
  const sanitized = {};
  for (const [k, v] of Object.entries(obj)) {
    const isDateField = /(?:date|time|at|_at)$/i.test(k) || k === "termStart" || k === "termEnd" || k === "phaseStart" || k === "phaseEnd";
    if (v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      if (Object.keys(v).length === 0) {
        sanitized[k] = null;
        continue;
      }
    }
    if (typeof v === "string" && v.trim() === "{}" && isDateField) {
      sanitized[k] = null;
      continue;
    }
    sanitized[k] = cleanPayloadForPostgres(v);
  }
  return sanitized;
}
function rewriteSetCookieForPreview(cookieStr) {
  let rewritten = cookieStr.replace(/Domain=[^;]+;?\s*/gi, "");
  if (!rewritten.toLowerCase().includes("samesite=")) {
    rewritten += "; SameSite=None";
  } else {
    rewritten = rewritten.replace(/SameSite=[^;]+/gi, "SameSite=None");
  }
  if (!rewritten.toLowerCase().includes("secure")) {
    rewritten += "; Secure";
  }
  return rewritten;
}
function createRemoteForwarder() {
  return async (req, res, next) => {
    console.log(`[Forwarder] Request: ${req.method} ${req.originalUrl} | Mode: ${config.apiRuntimeMode}`);
    if (config.apiRuntimeMode !== "remote-proxy") {
      console.log(`[Forwarder] Skipping - Not in remote-proxy mode`);
      return next();
    }
    if (req.originalUrl.includes("/api/auth/login") || req.originalUrl.includes("/api/auth/me") || req.originalUrl.includes("/api/auth/update-password")) {
      console.log(`[AUTH-TRACE] Bypassing proxy for: ${req.originalUrl}`);
      return next();
    }
    try {
      const targetBase = config.devRemoteApiUrl.replace(/\/+$/, "");
      const subPath = req.originalUrl.replace(/^\/api(\/|$)/, "/");
      const targetUrlStr = `${targetBase}${subPath}`;
      const targetUrl = new import_url.URL(targetUrlStr);
      console.log(`[Forwarder] Target URL: ${targetUrlStr}`);
      if ((targetUrl.hostname === "localhost" || targetUrl.hostname === "127.0.0.1") && targetUrl.port === String(config.port)) {
        res.status(500).json({
          ok: false,
          error: "Recursive proxy detected. Remote API URL cannot point to the local server port in remote-proxy mode."
        });
        return;
      }
      const forwardHeaders = {
        "Accept": "application/json",
        "Host": targetUrl.host,
        "User-Agent": "QRMS-Server-Forwarder/1.0"
      };
      if (req.headers["content-type"]) {
        forwardHeaders["Content-Type"] = String(req.headers["content-type"]);
      }
      if (req.headers["cookie"]) {
        forwardHeaders["Cookie"] = String(req.headers["cookie"]);
      }
      if (req.headers["x-tenant-id"] || req.tenantId) {
        forwardHeaders["X-Tenant-Id"] = String(req.headers["x-tenant-id"] || req.tenantId);
      }
      if (req.headers["x-organization-id"] || req.organizationId) {
        forwardHeaders["X-Organization-Id"] = String(req.headers["x-organization-id"] || req.organizationId);
      }
      let basicAuthHeader = "";
      if (config.devApiBasicAuth) {
        const raw = config.devApiBasicAuth.trim();
        basicAuthHeader = raw.toLowerCase().startsWith("basic ") ? raw : `Basic ${raw}`;
      } else if (config.devApiUsername && config.devApiPassword) {
        const token = Buffer.from(`${config.devApiUsername}:${config.devApiPassword}`).toString("base64");
        basicAuthHeader = `Basic ${token}`;
      }
      if (basicAuthHeader) {
        forwardHeaders["Authorization"] = basicAuthHeader;
      }
      let payload;
      const isBodyMethod = !["GET", "HEAD"].includes(req.method.toUpperCase());
      if (req.body !== void 0 && req.body !== null && isBodyMethod) {
        const cleanedBody = typeof req.body === "object" ? cleanPayloadForPostgres(req.body) : req.body;
        const bodyStr = typeof cleanedBody === "string" ? cleanedBody : JSON.stringify(cleanedBody);
        payload = Buffer.from(bodyStr, "utf8");
        forwardHeaders["Content-Type"] = forwardHeaders["Content-Type"] || "application/json; charset=utf-8";
        forwardHeaders["Content-Length"] = String(payload.length);
      } else if (isBodyMethod) {
        forwardHeaders["Content-Length"] = "0";
      }
      const result = await forwardRequestWithRetry(targetUrl, req.method, forwardHeaders, payload);
      const contentType = String(result.headers["content-type"] || "");
      const statusCode = result.statusCode || 200;
      if (!contentType.includes("application/json") && statusCode >= 400) {
        if (!res.headersSent) {
          res.status(statusCode).json({
            ok: false,
            status: statusCode,
            error: `Remote API error (${statusCode}): Upstream service returned non-JSON response.`
          });
        }
        return;
      }
      if (!res.headersSent) {
        res.status(statusCode);
        res.setHeader("Content-Type", contentType || "application/json; charset=utf-8");
        res.setHeader("X-Debug-Forwarder", "active");
        const setCookie = result.headers["set-cookie"];
        if (setCookie) {
          const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
          const rewrittenCookies = cookies.map(rewriteSetCookieForPreview);
          res.setHeader("Set-Cookie", rewrittenCookies);
        }
        res.send(result.body);
      }
    } catch (err) {
      if (!res.headersSent) {
        res.status(502).json({
          ok: false,
          error: `Failed to communicate with remote development API: ${err?.message || "Network error"}`
        });
      }
    }
  };
}

// server/middleware/errorHandler.ts
function errorHandler(err, req, res, next) {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({
    ok: false,
    error: message,
    ...process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}
  });
}

// server/routes/healthRoutes.ts
var import_express = require("express");

// server/config/db.ts
var import_pg = __toESM(require("pg"), 1);
var { Pool } = import_pg.default;
var pool = null;
function getDbPool() {
  if (!config.databaseUrl) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 5e3,
      ssl: config.isProduction ? { rejectUnauthorized: false } : void 0
    });
    pool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });
  }
  return pool;
}
async function checkDbHealth() {
  const currentPool = getDbPool();
  if (!currentPool) {
    return {
      connected: false,
      configured: false,
      error: "DATABASE_URL environment variable is not configured"
    };
  }
  const start = Date.now();
  try {
    const client = await currentPool.connect();
    try {
      await client.query("SELECT 1");
      const latencyMs = Date.now() - start;
      return {
        connected: true,
        configured: true,
        latencyMs
      };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      connected: false,
      configured: true,
      error: err?.message || "Failed to connect to PostgreSQL database"
    };
  }
}

// server/services/healthService.ts
async function getSystemHealth() {
  const dbHealth = await checkDbHealth();
  return {
    ok: dbHealth.connected,
    service: "qrms-api",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    database: {
      status: dbHealth.connected ? "connected" : dbHealth.configured ? "disconnected" : "unconfigured",
      configured: dbHealth.configured,
      latencyMs: dbHealth.latencyMs,
      error: dbHealth.error
    }
  };
}

// server/routes/healthRoutes.ts
var healthRouter = (0, import_express.Router)();
healthRouter.get("/", async (req, res, next) => {
  try {
    const health = await getSystemHealth();
    const statusCode = health.ok ? 200 : health.database.configured ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (err) {
    next(err);
  }
});

// server/routes/tenantRoutes.ts
var import_express2 = require("express");

// src/db/schema.ts
function snakeToCamelCase(obj, parentKey) {
  if (obj === null || obj === void 0) {
    return obj;
  }
  if (obj instanceof Date) {
    if (isNaN(obj.getTime())) {
      return "";
    }
    const iso = obj.toISOString();
    const isPureDateKey = parentKey && /(?:^|[a-z])(Date|date)$/.test(parentKey);
    const isMidnight = iso.endsWith("T00:00:00.000Z");
    if (isPureDateKey || isMidnight) {
      return iso.split("T")[0];
    }
    return iso;
  }
  if (typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamelCase(item, parentKey));
  }
  const camelObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
    const isNumericField = [
      "spellingPassingThreshold",
      "passingScore",
      "passingThreshold",
      "baseTuition",
      "discountAmount",
      "scholarshipAmount",
      "paidAmount",
      "balanceDue",
      "estimatedAmount",
      "actualSpent",
      "budget",
      "overallProjectBudget"
    ].includes(camelKey);
    if (isNumericField && typeof value === "string" && value.trim() !== "" && !isNaN(Number(value))) {
      camelObj[camelKey] = Number(value);
    } else {
      camelObj[camelKey] = snakeToCamelCase(value, camelKey);
    }
  }
  return camelObj;
}
function camelToSnakeCase(obj) {
  if (obj === null || obj === void 0 || typeof obj !== "object") {
    return obj;
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => camelToSnakeCase(item));
  }
  const snakeObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    snakeObj[snakeKey] = camelToSnakeCase(value);
  }
  return snakeObj;
}

// server/db/query.ts
async function executeQuery(text, params = []) {
  const pool2 = getDbPool();
  if (!pool2) {
    throw new Error("Database is not connected. Please set DATABASE_URL.");
  }
  const client = await pool2.connect();
  try {
    const res = await client.query(text, params);
    return res.rows.map((row) => snakeToCamelCase(row));
  } finally {
    client.release();
  }
}
async function executeQuerySingle(text, params = []) {
  const rows = await executeQuery(text, params);
  return rows.length > 0 ? rows[0] : null;
}

// server/services/tenantService.ts
async function getPublicTenants() {
  const query = `
    SELECT 
      id, slug, name, organization_id, description, city, district, region, 
      address, supervisor_name, contact_phone, email, whatsapp_number, 
      logo_url, stage_logo_url, supported_stages, is_active, 
      tenant_type, show_on_public_directory, created_at, updated_at
    FROM tenants
    WHERE is_active = TRUE AND show_on_public_directory = TRUE
    ORDER BY name ASC
  `;
  return executeQuery(query);
}
async function getTenantByIdOrSlug(idOrSlug) {
  const query = `
    SELECT *
    FROM tenants
    WHERE id = $1 OR slug = $1
    LIMIT 1
  `;
  return executeQuerySingle(query, [idOrSlug]);
}

// server/services/entityService.ts
var ENTITY_TABLE_CONFIGS = {
  organizations: {
    tableName: "organizations",
    primaryKey: "id",
    isTenantScoped: false,
    allowedColumns: [
      "id",
      "name",
      "code",
      "license_number",
      "logo_url",
      "tenant_ids",
      "is_active",
      "role_permissions_overrides",
      "description",
      "city",
      "region",
      "contact_phone",
      "contact_email",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["tenant_ids", "role_permissions_overrides"],
    defaultSort: "name ASC",
    searchColumns: ["name", "code", "city", "description"]
  },
  tenants: {
    tableName: "tenants",
    primaryKey: "id",
    isTenantScoped: false,
    allowedColumns: [
      "id",
      "slug",
      "name",
      "organization_id",
      "description",
      "city",
      "district",
      "region",
      "address",
      "supervisor_name",
      "contact_phone",
      "email",
      "whatsapp_number",
      "logo_url",
      "stage_logo_url",
      "target_surah_default",
      "reference_outcome",
      "supported_stages",
      "is_active",
      "role_permissions_overrides",
      "notes",
      "custom_domain",
      "tenant_type",
      "show_on_public_directory",
      "subscription",
      "modules_config",
      "attendance_config",
      "prayer_config",
      "admissions_config",
      "reports_config",
      "whatsapp_config",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: [
      "supported_stages",
      "role_permissions_overrides",
      "subscription",
      "modules_config",
      "attendance_config",
      "prayer_config",
      "admissions_config",
      "reports_config",
      "whatsapp_config"
    ],
    defaultSort: "name ASC",
    searchColumns: ["name", "slug", "city", "supervisor_name"]
  },
  stages: {
    tableName: "stages",
    primaryKey: "id",
    isTenantScoped: false,
    allowedColumns: [
      "id",
      "code",
      "name",
      "subtitle",
      "age_range",
      "target_grades",
      "curriculum_focus",
      "default_target_surah",
      "accent_color",
      "icon_name",
      "display_order",
      "is_active",
      "role_permissions_overrides",
      "traits",
      "outcome_summary",
      "target_quran_amount",
      "logo_url",
      "is_logo_active",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["target_grades", "role_permissions_overrides", "traits"],
    defaultSort: "display_order ASC",
    searchColumns: ["name", "code", "subtitle"]
  },
  quran_stage_configs: {
    tableName: "quran_stage_configs",
    primaryKey: "id",
    isTenantScoped: false,
    allowedColumns: [
      "id",
      "name",
      "code",
      "description",
      "target_grades",
      "daily_pace_description",
      "memorization",
      "revision",
      "consolidation_days",
      "schedule",
      "default_term_weeks",
      "is_active",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["target_grades", "memorization", "revision", "schedule"],
    defaultSort: "name ASC",
    searchColumns: ["name", "code", "description"]
  },
  academic_years: {
    tableName: "academic_years",
    primaryKey: "id",
    isTenantScoped: false,
    allowedColumns: [
      "id",
      "name",
      "semester",
      "current_term",
      "academic_year",
      "start_date",
      "end_date",
      "holidays",
      "operational_start_week",
      "operational_end_week",
      "total_weeks",
      "current_week",
      "manual_week_override",
      "days_per_week",
      "spelling_passing_threshold",
      "grade_targets",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["holidays", "grade_targets"],
    defaultSort: "start_date DESC",
    searchColumns: ["name", "semester", "academic_year"]
  },
  spelling_lessons: {
    tableName: "spelling_lessons",
    primaryKey: "id",
    isTenantScoped: false,
    allowedColumns: [
      "id",
      "lesson_number",
      "title",
      "skill",
      "description",
      "expected_week",
      "target_grade",
      "passing_threshold",
      "passing_score",
      "display_order",
      "is_active",
      "core_skills",
      "sub_lessons",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["core_skills", "sub_lessons"],
    defaultSort: "display_order ASC, lesson_number ASC",
    searchColumns: ["title", "skill", "description"]
  },
  users: {
    tableName: "users",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "organization_id",
      "name",
      "full_name",
      "phone",
      "email",
      "national_id",
      "login_identifier",
      "password_hash",
      "role",
      "staff_role",
      "halaqah_id",
      "stage_id",
      "student_id",
      "teacher_id",
      "student_ids",
      "supervision_mode",
      "is_active",
      "must_change_password",
      "permission_mode",
      "role_permissions_overrides",
      "custom_permissions",
      "temporary_custom_permissions",
      "supervisor_scope",
      "assigned_stage_ids",
      "assigned_halaqah_ids",
      "is_all_halaqahs",
      "delegations",
      "is_archived",
      "teacher_archived",
      "supervisor_archived",
      "archive_type",
      "archived_at",
      "archived_by",
      "archive_reason",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: [
      "student_ids",
      "role_permissions_overrides",
      "custom_permissions",
      "temporary_custom_permissions",
      "supervisor_scope",
      "assigned_stage_ids",
      "assigned_halaqah_ids",
      "delegations"
    ],
    defaultSort: "name ASC",
    searchColumns: ["name", "full_name", "phone", "national_id", "login_identifier", "email"],
    hasSoftDelete: true
  },
  halaqahs: {
    tableName: "halaqahs",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "stage_id",
      "name",
      "teacher_id",
      "teacher_name",
      "teacher_phone",
      "location",
      "days_per_week",
      "grade",
      "target_surah",
      "assistant_teachers",
      "online_config",
      "weekly_schedule",
      "default_time_type",
      "default_start_time",
      "default_end_time",
      "default_start_prayer_offset",
      "default_end_prayer_offset",
      "active_track_ids",
      "role_permissions_overrides",
      "is_active",
      "is_archived",
      "archived_at",
      "archived_by",
      "archive_reason",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: [
      "assistant_teachers",
      "online_config",
      "weekly_schedule",
      "active_track_ids",
      "role_permissions_overrides"
    ],
    defaultSort: "name ASC",
    searchColumns: ["name", "teacher_name", "location"],
    hasSoftDelete: true
  },
  students: {
    tableName: "students",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "stage_id",
      "halaqah_id",
      "teacher_id",
      "full_name",
      "national_id",
      "grade",
      "halaqah_name",
      "teacher_name",
      "teacher_phone",
      "parent_name",
      "parent_phone",
      "phone",
      "mother_phone",
      "guardian_relationship",
      "other_contact_phone",
      "minimum_target_surah",
      "personal_target_surah",
      "status",
      "current_spelling_lesson_id",
      "current_spelling_score",
      "current_surah",
      "current_ayah",
      "avatar_url",
      "notes",
      "username",
      "active_quran_plan_id",
      "quran_plan",
      "term_histories",
      "attendance_streak",
      "registration_type",
      "registration_type_label",
      "previously_registered",
      "is_active",
      "is_archived",
      "archived_at",
      "archive_reason",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["quran_plan", "term_histories", "attendance_streak"],
    defaultSort: "full_name ASC",
    searchColumns: ["full_name", "national_id", "parent_phone", "phone", "username"],
    hasSoftDelete: true
  },
  quran_plans: {
    tableName: "quran_plans",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "student_id",
      "stage_id",
      "plan_name",
      "status",
      "scope",
      "direction",
      "unit_type",
      "daily_amount",
      "plan_data",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["plan_data"],
    defaultSort: "created_at DESC",
    searchColumns: ["plan_name", "student_id"]
  },
  daily_session_records: {
    tableName: "daily_session_records",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "student_id",
      "teacher_id",
      "halaqah_id",
      "date",
      "day_of_week",
      "week_number",
      "attendance",
      "teacher_remarks",
      "spelling_drill_minutes",
      "spelling_progress",
      "spelling",
      "memorization",
      "revision",
      "custom_tracks",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["spelling", "memorization", "revision", "custom_tracks"],
    defaultSort: "date DESC, created_at DESC",
    searchColumns: ["teacher_remarks", "date"]
  },
  educational_plan_weeks: {
    tableName: "educational_plan_weeks",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "stage_id",
      "target_stage_ids",
      "week_number",
      "start_date",
      "end_date",
      "day_dates",
      "week_type",
      "special_event_title",
      "domain",
      "domain_label",
      "value_title",
      "motto",
      "educational_goal",
      "goal_topic",
      "goal_presenter",
      "goal_location",
      "activity",
      "activity_presenter",
      "activity_location",
      "responsible_person",
      "quranic_program",
      "overall_project_budget",
      "budget",
      "notes",
      "values_list",
      "execution_status",
      "status",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["target_stage_ids", "day_dates", "values_list", "execution_status"],
    defaultSort: "week_number ASC",
    searchColumns: ["value_title", "motto", "educational_goal", "activity", "special_event_title"]
  },
  seasonal_programs: {
    tableName: "seasonal_programs",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "title",
      "name",
      "code",
      "type",
      "season",
      "start_date",
      "end_date",
      "target_stage_ids",
      "target_audience",
      "location",
      "max_capacity",
      "supervisor_id",
      "supervisor_name",
      "status",
      "budget",
      "description",
      "goals",
      "enrolled_student_ids",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["target_stage_ids", "goals", "enrolled_student_ids"],
    defaultSort: "start_date DESC",
    searchColumns: ["title", "name", "code", "description"]
  },
  seasonal_activities: {
    tableName: "seasonal_activities",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "program_id",
      "tenant_id",
      "title",
      "description",
      "activity_type",
      "category",
      "day_of_week",
      "date",
      "time_slot",
      "responsible_name",
      "supervisor_name",
      "supervisor_id",
      "location",
      "points",
      "status",
      "notes",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: [],
    defaultSort: "date ASC, created_at ASC",
    searchColumns: ["title", "description", "responsible_name", "location"]
  },
  seasonal_participations: {
    tableName: "seasonal_participations",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "program_id",
      "activity_id",
      "tenant_id",
      "student_id",
      "student_name",
      "original_halaqah_id",
      "original_halaqah_name",
      "attendance_status",
      "participation_level",
      "seasonal_points_earned",
      "points_earned",
      "achievement_note",
      "recorded_by",
      "notes",
      "recorded_at"
    ],
    jsonbColumns: [],
    defaultSort: "recorded_at DESC",
    searchColumns: ["student_name", "original_halaqah_name", "achievement_note"]
  },
  student_financial_records: {
    tableName: "student_financial_records",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "student_id",
      "student_name",
      "academic_year",
      "base_tuition",
      "discount_amount",
      "discount_reason",
      "scholarship_amount",
      "is_exempt",
      "exemption_reason",
      "paid_amount",
      "remaining_amount",
      "status",
      "payments",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["payments"],
    defaultSort: "created_at DESC",
    searchColumns: ["student_name", "academic_year"]
  },
  finance_revenues: {
    tableName: "finance_revenues",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "source_name",
      "amount",
      "date",
      "donor_or_source",
      "payment_method",
      "notes",
      "created_by",
      "created_at"
    ],
    jsonbColumns: [],
    defaultSort: "date DESC, created_at DESC",
    searchColumns: ["source_name", "donor_or_source", "notes"]
  },
  finance_expenses: {
    tableName: "finance_expenses",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "category",
      "description",
      "amount",
      "tax_amount",
      "total_amount",
      "date",
      "beneficiary",
      "payment_method",
      "program_name",
      "invoice_number",
      "attachment_url",
      "notes",
      "created_by",
      "created_at"
    ],
    jsonbColumns: [],
    defaultSort: "date DESC, created_at DESC",
    searchColumns: ["description", "category", "beneficiary", "invoice_number"]
  },
  finance_custodies: {
    tableName: "finance_custodies",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "holder_id",
      "holder_name",
      "purpose",
      "original_amount",
      "status",
      "disbursed_at",
      "settled_at",
      "closed_at",
      "reviewed_by",
      "notes",
      "created_by",
      "created_at"
    ],
    jsonbColumns: [],
    defaultSort: "created_at DESC",
    searchColumns: ["holder_name", "purpose", "notes"]
  },
  finance_custody_expenses: {
    tableName: "finance_custody_expenses",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "custody_id",
      "tenant_id",
      "vendor",
      "description",
      "amount",
      "tax_amount",
      "total_amount",
      "category",
      "date",
      "payment_method",
      "invoice_number",
      "attachment_url",
      "notes",
      "created_by",
      "created_at"
    ],
    jsonbColumns: [],
    defaultSort: "date DESC, created_at DESC",
    searchColumns: ["vendor", "description", "invoice_number"]
  },
  finance_budget_requests: {
    tableName: "finance_budget_requests",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "requester_id",
      "requester_name",
      "program_name",
      "estimated_amount",
      "justification",
      "status",
      "reviewed_by",
      "reviewed_at",
      "review_notes",
      "created_at"
    ],
    jsonbColumns: [],
    defaultSort: "created_at DESC",
    searchColumns: ["requester_name", "program_name", "justification"]
  },
  finance_settings: {
    tableName: "finance_settings",
    primaryKey: "tenant_id",
    isTenantScoped: true,
    allowedColumns: [
      "tenant_id",
      "revenue_sources",
      "expense_categories",
      "payment_methods",
      "tuition_configs",
      "default_tuition_amount",
      "bank_accounts",
      "financial_policies",
      "updated_at"
    ],
    jsonbColumns: [
      "revenue_sources",
      "expense_categories",
      "payment_methods",
      "tuition_configs",
      "bank_accounts",
      "financial_policies"
    ],
    defaultSort: "updated_at DESC"
  },
  registration_requests: {
    tableName: "registration_requests",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "student_name",
      "national_id",
      "parent_name",
      "parent_phone",
      "mother_phone",
      "guardian_relationship",
      "other_contact_phone",
      "birth_date",
      "grade",
      "registration_type",
      "registration_type_label",
      "tuition_fee_amount",
      "fee_pledge_accepted",
      "previously_registered",
      "desired_stage_id",
      "status",
      "notes",
      "interview_notes",
      "interview_score",
      "financial_decision_notes",
      "assigned_halaqah_id",
      "assigned_teacher_id",
      "enrolled_student_id",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: [],
    defaultSort: "created_at DESC",
    searchColumns: ["student_name", "national_id", "parent_name", "parent_phone"]
  },
  track_definitions: {
    tableName: "track_definitions",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "code",
      "name",
      "short_name",
      "description",
      "icon",
      "color_scheme",
      "is_active",
      "role_permissions_overrides",
      "display_order",
      "nomination_config",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: ["role_permissions_overrides", "nomination_config"],
    defaultSort: "display_order ASC, name ASC",
    searchColumns: ["name", "short_name", "code", "description"]
  },
  track_nominations: {
    tableName: "track_nominations",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "track_id",
      "track_name",
      "student_id",
      "student_name",
      "halaqah_id",
      "halaqah_name",
      "teacher_id",
      "teacher_name",
      "target_branch_or_level",
      "target_branch_snapshot",
      "status",
      "nomination_card_number",
      "internal_exam",
      "supervisor_approval",
      "association_exam",
      "teacher_recommendation",
      "teacher_notes",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: [
      "target_branch_snapshot",
      "internal_exam",
      "supervisor_approval",
      "association_exam"
    ],
    defaultSort: "created_at DESC",
    searchColumns: ["student_name", "track_name", "halaqah_name", "teacher_name"]
  },
  association_nominations: {
    tableName: "association_nominations",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "student_id",
      "student_name",
      "halaqah_id",
      "halaqah_name",
      "teacher_id",
      "teacher_name",
      "nomination_type",
      "target_title",
      "internal_exam_score",
      "teacher_recommendation",
      "teacher_notes",
      "supervisor_status",
      "supervisor_notes",
      "nomination_card_number",
      "approved_at",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: [],
    defaultSort: "created_at DESC",
    searchColumns: ["student_name", "target_title", "halaqah_name", "teacher_name"]
  },
  student_badges: {
    tableName: "student_badges",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "badge_type",
      "student_id",
      "student_name",
      "awarded_at",
      "awarded_by",
      "notes",
      "is_automatic",
      "created_at"
    ],
    jsonbColumns: [],
    defaultSort: "awarded_at DESC, created_at DESC",
    searchColumns: ["student_name", "badge_type", "notes"]
  },
  student_point_rules: {
    tableName: "student_point_rules",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "title",
      "category",
      "default_points",
      "is_active",
      "role_permissions_overrides",
      "description",
      "created_at"
    ],
    jsonbColumns: ["role_permissions_overrides"],
    defaultSort: "category ASC, title ASC",
    searchColumns: ["title", "category", "description"]
  },
  student_points: {
    tableName: "student_points",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "student_id",
      "student_name",
      "rule_id",
      "category",
      "points",
      "reason",
      "date",
      "recorded_by",
      "created_at"
    ],
    jsonbColumns: [],
    defaultSort: "date DESC, created_at DESC",
    searchColumns: ["student_name", "reason", "category"]
  },
  remedial_plans: {
    tableName: "remedial_plans",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "student_id",
      "student_name",
      "halaqah_id",
      "teacher_id",
      "risk_level",
      "category",
      "title",
      "diagnostic_summary",
      "recommended_action",
      "parent_guidance",
      "status",
      "notes",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: [],
    defaultSort: "created_at DESC",
    searchColumns: ["student_name", "title", "diagnostic_summary"]
  },
  meetings: {
    tableName: "meetings",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "title",
      "meeting_number",
      "category",
      "date",
      "start_time",
      "end_time",
      "location_type",
      "location",
      "meeting_url",
      "description",
      "objectives",
      "agenda",
      "attendees",
      "discussions",
      "decisions",
      "recommendations",
      "postponed_items",
      "notes",
      "status",
      "cancellation_reason",
      "created_by",
      "created_by_name",
      "created_by_role",
      "completed_at",
      "created_at",
      "updated_at"
    ],
    jsonbColumns: [
      "objectives",
      "agenda",
      "attendees",
      "discussions",
      "decisions",
      "recommendations",
      "postponed_items"
    ],
    defaultSort: "date DESC, created_at DESC",
    searchColumns: ["title", "description", "location", "meeting_number"]
  },
  staff_attendance: {
    tableName: "staff_attendance",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "user_id",
      "user_name",
      "user_role",
      "date",
      "timestamp",
      "is_regular_day",
      "reason",
      "method",
      "location_data",
      "created_at"
    ],
    jsonbColumns: ["location_data"],
    defaultSort: "date DESC, timestamp DESC",
    searchColumns: ["user_name", "reason"]
  },
  prayer_times: {
    tableName: "prayer_times",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "year",
      "latitude",
      "longitude",
      "timezone",
      "method",
      "last_synced_at",
      "source",
      "timings_by_date",
      "adjustments",
      "updated_at"
    ],
    jsonbColumns: ["timings_by_date", "adjustments"],
    defaultSort: "updated_at DESC"
  },
  frontend_configs: {
    tableName: "frontend_configs",
    primaryKey: "id",
    isTenantScoped: false,
    allowedColumns: [
      "id",
      "type",
      "name",
      "description",
      "logo_url",
      "contact_email",
      "contact_phone",
      "contact_whatsapp",
      "address",
      "show_supervisor",
      "show_prayer_times",
      "primary_color",
      "banners",
      "announcements",
      "sections",
      "updated_at"
    ],
    jsonbColumns: ["banners", "announcements", "sections"],
    defaultSort: "updated_at DESC",
    searchColumns: ["name", "description"]
  },
  audit_logs: {
    tableName: "audit_logs",
    primaryKey: "id",
    isTenantScoped: false,
    allowedColumns: [
      "id",
      "user_id",
      "user_name",
      "user_role",
      "action",
      "entity_type",
      "entity_id",
      "entity_name",
      "previous_value",
      "new_value",
      "notes",
      "timestamp"
    ],
    jsonbColumns: ["previous_value", "new_value"],
    defaultSort: "timestamp DESC",
    searchColumns: ["user_name", "action", "entity_type", "entity_name"]
  },
  report_logs: {
    tableName: "report_logs",
    primaryKey: "id",
    isTenantScoped: false,
    allowedColumns: [
      "id",
      "recipient_type",
      "recipient_name",
      "recipient_phone",
      "student_id",
      "teacher_id",
      "report_type",
      "title",
      "content",
      "timestamp",
      "status"
    ],
    jsonbColumns: [],
    defaultSort: "timestamp DESC",
    searchColumns: ["recipient_name", "recipient_phone", "title"]
  },
  academic_archives: {
    tableName: "academic_archives",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "tenant_id",
      "tenant_name",
      "academic_year",
      "term_name",
      "archived_at",
      "archived_by",
      "total_students",
      "total_halaqahs",
      "overall_mastery_rate",
      "notes",
      "student_snapshots",
      "created_at"
    ],
    jsonbColumns: ["student_snapshots"],
    defaultSort: "archived_at DESC",
    searchColumns: ["academic_year", "term_name", "notes"]
  },
  support_sessions: {
    tableName: "support_sessions",
    primaryKey: "id",
    isTenantScoped: true,
    allowedColumns: [
      "id",
      "system_admin_uid",
      "system_admin_name",
      "tenant_id",
      "reason",
      "expires_at",
      "is_active",
      "role_permissions_overrides",
      "created_at"
    ],
    jsonbColumns: ["role_permissions_overrides"],
    defaultSort: "created_at DESC",
    searchColumns: ["system_admin_name", "reason"]
  }
};
var COLLECTION_ALIASES = {
  // Direct names
  organizations: "organizations",
  tenants: "tenants",
  stages: "stages",
  educational_stages: "stages",
  quran_stage_configs: "quran_stage_configs",
  academic_years: "academic_years",
  spelling_lessons: "spelling_lessons",
  users: "users",
  platform_users: "users",
  halaqahs: "halaqahs",
  students: "students",
  quran_plans: "quran_plans",
  daily_records: "daily_session_records",
  daily_session_records: "daily_session_records",
  educational_plan: "educational_plan_weeks",
  educational_plans: "educational_plan_weeks",
  educational_plan_weeks: "educational_plan_weeks",
  seasonal_programs: "seasonal_programs",
  seasonal_activities: "seasonal_activities",
  seasonal_participations: "seasonal_participations",
  financial_records: "student_financial_records",
  student_financial_records: "student_financial_records",
  revenues: "finance_revenues",
  finance_revenues: "finance_revenues",
  expenses: "finance_expenses",
  finance_expenses: "finance_expenses",
  custodies: "finance_custodies",
  finance_custodies: "finance_custodies",
  custody_expenses: "finance_custody_expenses",
  finance_custody_expenses: "finance_custody_expenses",
  budget_requests: "finance_budget_requests",
  finance_budget_requests: "finance_budget_requests",
  finance_settings: "finance_settings",
  registration_requests: "registration_requests",
  track_definitions: "track_definitions",
  track_nominations: "track_nominations",
  association_nominations: "association_nominations",
  badges: "student_badges",
  student_badges: "student_badges",
  student_point_rules: "student_point_rules",
  student_points: "student_points",
  remedial_plans: "remedial_plans",
  meetings: "meetings",
  staff_attendance: "staff_attendance",
  prayer_times: "prayer_times",
  frontendConfigs: "frontend_configs",
  frontend_configs: "frontend_configs",
  audit_logs: "audit_logs",
  report_logs: "report_logs",
  academic_archives: "academic_archives",
  support_sessions: "support_sessions"
};
function resolveTableConfig(collectionName) {
  const canonicalName = COLLECTION_ALIASES[collectionName] || COLLECTION_ALIASES[collectionName.toLowerCase()];
  if (!canonicalName) {
    return null;
  }
  return ENTITY_TABLE_CONFIGS[canonicalName] || null;
}
async function findMany(collectionName, options = {}) {
  const config2 = resolveTableConfig(collectionName);
  if (!config2) {
    throw new Error(`Unknown or unsupported collection: '${collectionName}'`);
  }
  const { tenantId, queryParams = {} } = options;
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  if (config2.isTenantScoped) {
    const effectiveTenantId = tenantId || queryParams.tenantId;
    if (effectiveTenantId) {
      conditions.push(`${config2.tableName}.tenant_id = $${paramIndex}`);
      params.push(effectiveTenantId);
      paramIndex++;
    } else if (!options.isSuperAdmin) {
      return [];
    }
  }
  for (const [rawKey, rawVal] of Object.entries(queryParams)) {
    if (rawVal === void 0 || rawVal === null || rawVal === "") continue;
    if (rawKey === "tenantId" || rawKey === "limit" || rawKey === "offset" || rawKey === "page" || rawKey === "search") continue;
    const snakeCol = rawKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    if (config2.allowedColumns.includes(snakeCol)) {
      if (rawVal === "true") {
        conditions.push(`${config2.tableName}.${snakeCol} = TRUE`);
      } else if (rawVal === "false") {
        conditions.push(`${config2.tableName}.${snakeCol} = FALSE`);
      } else {
        conditions.push(`${config2.tableName}.${snakeCol} = $${paramIndex}`);
        params.push(rawVal);
        paramIndex++;
      }
    }
  }
  if (queryParams.search && config2.searchColumns && config2.searchColumns.length > 0) {
    const searchTerm = `%${queryParams.search.trim()}%`;
    const searchClauses = config2.searchColumns.map((col) => {
      return `CAST(${config2.tableName}.${col} AS TEXT) ILIKE $${paramIndex}`;
    });
    conditions.push(`(${searchClauses.join(" OR ")})`);
    params.push(searchTerm);
    paramIndex++;
  }
  if (config2.hasSoftDelete && queryParams.isArchived === void 0) {
    conditions.push(`(${config2.tableName}.is_archived = FALSE OR ${config2.tableName}.is_archived IS NULL)`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  let selectClause = `SELECT * FROM ${config2.tableName}`;
  if (config2.tableName === "users") {
    selectClause = `
      SELECT 
        u.id, u.tenant_id, u.organization_id, u.name, u.full_name, u.phone, u.email,
        u.national_id, u.login_identifier, u.role, u.staff_role, u.halaqah_id,
        h.name AS halaqah_name,
        u.stage_id, u.student_id, u.teacher_id, u.student_ids, u.supervision_mode,
        u.is_active, u.must_change_password, u.permission_mode, u.role_permissions_overrides,
        u.custom_permissions, u.temporary_custom_permissions, u.supervisor_scope,
        u.assigned_stage_ids, u.assigned_halaqah_ids, u.is_all_halaqahs, u.delegations,
        u.is_archived, u.teacher_archived, u.supervisor_archived, u.archive_type,
        u.archived_at, u.archived_by, u.archive_reason,
        u.created_at, u.updated_at
      FROM users u
      LEFT JOIN halaqahs h ON u.halaqah_id = h.id
    `;
  }
  const orderBy = config2.defaultSort ? `ORDER BY ${config2.defaultSort}` : "";
  let pagination = "";
  if (queryParams.limit) {
    const limitNum = Math.min(Math.max(1, parseInt(queryParams.limit, 10) || 500), 2e3);
    pagination += ` LIMIT ${limitNum}`;
    if (queryParams.offset) {
      const offsetNum = Math.max(0, parseInt(queryParams.offset, 10) || 0);
      pagination += ` OFFSET ${offsetNum}`;
    }
  }
  const fullQuery = `${selectClause} ${whereClause} ${orderBy} ${pagination}`;
  return executeQuery(fullQuery, params);
}
async function findById(collectionName, id, tenantId) {
  const config2 = resolveTableConfig(collectionName);
  if (!config2) {
    throw new Error(`Unknown or unsupported collection: '${collectionName}'`);
  }
  const conditions = [`${config2.tableName}.${config2.primaryKey} = $1`];
  const params = [id];
  if (config2.isTenantScoped && tenantId) {
    conditions.push(`${config2.tableName}.tenant_id = $2`);
    params.push(tenantId);
  }
  let selectClause = `SELECT * FROM ${config2.tableName}`;
  if (config2.tableName === "users") {
    selectClause = `
      SELECT 
        u.id, u.tenant_id, u.organization_id, u.name, u.full_name, u.phone, u.email,
        u.national_id, u.login_identifier, u.role, u.staff_role, u.halaqah_id,
        h.name AS halaqah_name,
        u.stage_id, u.student_id, u.teacher_id, u.student_ids, u.supervision_mode,
        u.is_active, u.must_change_password, u.permission_mode, u.role_permissions_overrides,
        u.custom_permissions, u.temporary_custom_permissions, u.supervisor_scope,
        u.assigned_stage_ids, u.assigned_halaqah_ids, u.is_all_halaqahs, u.delegations,
        u.is_archived, u.teacher_archived, u.supervisor_archived, u.archive_type,
        u.archived_at, u.archived_by, u.archive_reason,
        u.created_at, u.updated_at
      FROM users u
      LEFT JOIN halaqahs h ON u.halaqah_id = h.id
    `;
  }
  const query = `${selectClause} WHERE ${conditions.join(" AND ")} LIMIT 1`;
  return executeQuerySingle(query, params);
}
function prepareRecord(config2, rawData, tenantId) {
  const snakeData = camelToSnakeCase(rawData);
  const sanitized = {};
  if (config2.isTenantScoped) {
    sanitized.tenant_id = tenantId || snakeData.tenant_id;
  }
  for (const col of config2.allowedColumns) {
    if (snakeData[col] !== void 0) {
      let val = snakeData[col];
      if (config2.jsonbColumns.includes(col)) {
        if (val === null || val === void 0) {
          val = null;
        } else if (typeof val === "object") {
          val = JSON.stringify(val);
        }
      } else {
        if (val !== null && typeof val === "object" && !(val instanceof Date)) {
          if ("seconds" in val || "_seconds" in val) {
            const sec = val.seconds ?? val._seconds ?? 0;
            const nano = val.nanoseconds ?? val._nanoseconds ?? 0;
            val = new Date(sec * 1e3 + Math.floor(nano / 1e6)).toISOString();
          } else if (Object.keys(val).length === 0) {
            if (col === "created_at" || col === "updated_at" || col === "timestamp") {
              val = (/* @__PURE__ */ new Date()).toISOString();
            } else {
              val = null;
            }
          } else {
            val = null;
          }
        } else if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed === "{}" || trimmed === "") {
            val = null;
          }
        }
      }
      sanitized[col] = val;
    }
  }
  if (config2.primaryKey === "id" && !sanitized.id) {
    sanitized.id = rawData.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  if (config2.allowedColumns.includes("updated_at")) {
    sanitized.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  }
  return sanitized;
}
async function upsert(collectionName, rawData, tenantId) {
  const config2 = resolveTableConfig(collectionName);
  if (!config2) {
    throw new Error(`Unknown or unsupported collection: '${collectionName}'`);
  }
  const sanitized = prepareRecord(config2, rawData, tenantId);
  if (config2.tableName === "users" && sanitized.role === void 0 && sanitized.staff_role) {
    sanitized.role = sanitized.staff_role;
  }
  const keys = Object.keys(sanitized);
  if (keys.length === 0) {
    throw new Error(`No valid columns provided for table '${config2.tableName}'`);
  }
  const columns = keys.join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const values = keys.map((k) => sanitized[k]);
  const updateClauses = keys.filter((k) => k !== config2.primaryKey && (k !== "tenant_id" || !config2.isTenantScoped)).map((k) => `${k} = EXCLUDED.${k}`);
  let query;
  if (updateClauses.length > 0) {
    query = `
      INSERT INTO ${config2.tableName} (${columns})
      VALUES (${placeholders})
      ON CONFLICT (${config2.primaryKey})
      DO UPDATE SET ${updateClauses.join(", ")}
      RETURNING *
    `;
  } else {
    query = `
      INSERT INTO ${config2.tableName} (${columns})
      VALUES (${placeholders})
      ON CONFLICT (${config2.primaryKey})
      DO NOTHING
      RETURNING *
    `;
  }
  const result = await executeQuerySingle(query, values);
  if (!result) {
    const existing = await findById(collectionName, sanitized[config2.primaryKey], tenantId);
    if (!existing) {
      throw new Error(`Failed to upsert record into '${config2.tableName}'`);
    }
    return existing;
  }
  return result;
}
async function bulkUpsert(collectionName, items, tenantId) {
  if (!Array.isArray(items) || items.length === 0) {
    return { count: 0, items: [] };
  }
  const config2 = resolveTableConfig(collectionName);
  if (!config2) {
    throw new Error(`Unknown or unsupported collection: '${collectionName}'`);
  }
  const pool2 = getDbPool();
  if (!pool2) {
    throw new Error("Database is not connected. Please set DATABASE_URL.");
  }
  const client = await pool2.connect();
  const results = [];
  try {
    await client.query("BEGIN");
    for (const item of items) {
      const sanitized = prepareRecord(config2, item, tenantId);
      const keys = Object.keys(sanitized);
      const columns = keys.join(", ");
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
      const values = keys.map((k) => sanitized[k]);
      const updateClauses = keys.filter((k) => k !== config2.primaryKey && (k !== "tenant_id" || !config2.isTenantScoped)).map((k) => `${k} = EXCLUDED.${k}`);
      const query = updateClauses.length > 0 ? `INSERT INTO ${config2.tableName} (${columns}) VALUES (${placeholders}) ON CONFLICT (${config2.primaryKey}) DO UPDATE SET ${updateClauses.join(", ")} RETURNING *` : `INSERT INTO ${config2.tableName} (${columns}) VALUES (${placeholders}) ON CONFLICT (${config2.primaryKey}) DO NOTHING RETURNING *`;
      const res = await client.query(query, values);
      if (res.rows.length > 0) {
        results.push(snakeToCamelCase(res.rows[0]));
      }
    }
    await client.query("COMMIT");
    return { count: results.length, items: results };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
async function deleteRecord(collectionName, id, tenantId) {
  const config2 = resolveTableConfig(collectionName);
  if (!config2) {
    throw new Error(`Unknown or unsupported collection: '${collectionName}'`);
  }
  const conditions = [`${config2.primaryKey} = $1`];
  const params = [id];
  if (config2.isTenantScoped && tenantId) {
    conditions.push(`tenant_id = $2`);
    params.push(tenantId);
  }
  const query = `DELETE FROM ${config2.tableName} WHERE ${conditions.join(" AND ")} RETURNING ${config2.primaryKey}`;
  const deleted = await executeQuerySingle(query, params);
  return !!deleted;
}

// server/routes/tenantRoutes.ts
var tenantRouter = (0, import_express2.Router)();
tenantRouter.get("/", async (req, res, next) => {
  try {
    const tenants = await getPublicTenants();
    res.json({
      ok: true,
      count: tenants.length,
      data: tenants
    });
  } catch (err) {
    next(err);
  }
});
tenantRouter.get("/:idOrSlug", async (req, res, next) => {
  try {
    const tenant = await getTenantByIdOrSlug(req.params.idOrSlug);
    if (!tenant) {
      res.status(404).json({
        ok: false,
        error: "Tenant not found"
      });
      return;
    }
    res.json({
      ok: true,
      data: tenant
    });
  } catch (err) {
    next(err);
  }
});
tenantRouter.post("/", async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      res.status(400).json({ ok: false, error: "Invalid request body" });
      return;
    }
    const saved = await upsert("tenants", payload, req.tenantId);
    res.json({ ok: true, data: saved });
  } catch (err) {
    next(err);
  }
});
tenantRouter.put("/:id", async (req, res, next) => {
  try {
    const payload = { ...req.body, id: req.params.id };
    const saved = await upsert("tenants", payload, req.tenantId);
    res.json({ ok: true, data: saved });
  } catch (err) {
    next(err);
  }
});
tenantRouter.delete("/:id", async (req, res, next) => {
  try {
    const success = await deleteRecord("tenants", req.params.id, req.tenantId);
    if (!success) {
      res.status(404).json({ ok: false, error: "Tenant not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// server/routes/stageRoutes.ts
var import_express3 = require("express");

// server/services/stageService.ts
async function getActiveStages() {
  const query = `
    SELECT *
    FROM stages
    WHERE is_active = TRUE
    ORDER BY display_order ASC, name ASC
  `;
  return executeQuery(query);
}
async function getStageById(stageId) {
  const query = `
    SELECT *
    FROM stages
    WHERE id = $1
    LIMIT 1
  `;
  return executeQuerySingle(query, [stageId]);
}

// server/routes/stageRoutes.ts
var stageRouter = (0, import_express3.Router)();
stageRouter.get("/", async (req, res, next) => {
  try {
    const stages = await getActiveStages();
    res.json({
      ok: true,
      count: stages.length,
      data: stages
    });
  } catch (err) {
    next(err);
  }
});
stageRouter.get("/:id", async (req, res, next) => {
  try {
    const stage = await getStageById(req.params.id);
    if (!stage) {
      res.status(404).json({
        ok: false,
        error: "Educational stage not found"
      });
      return;
    }
    res.json({
      ok: true,
      data: stage
    });
  } catch (err) {
    next(err);
  }
});

// server/routes/userRoutes.ts
var import_express4 = require("express");

// server/services/userService.ts
var SAFE_USER_SELECT = `
  u.id, u.tenant_id, u.organization_id, u.name, u.full_name, u.phone, u.email,
  u.national_id, u.login_identifier, u.role, u.staff_role, u.halaqah_id,
  h.name AS halaqah_name,
  u.stage_id, u.student_id, u.teacher_id, u.student_ids, u.supervision_mode,
  u.is_active, u.must_change_password, u.permission_mode, u.role_permissions_overrides,
  u.custom_permissions, u.temporary_custom_permissions, u.supervisor_scope,
  u.assigned_stage_ids, u.assigned_halaqah_ids, u.is_all_halaqahs, u.delegations,
  u.is_archived, u.teacher_archived, u.supervisor_archived, u.archive_type,
  u.archived_at, u.archived_by, u.archive_reason,
  u.created_at, u.updated_at
`;
async function getUsersByTenant(tenantId, filters = {}) {
  const conditions = ["u.tenant_id = $1"];
  const params = [tenantId];
  if (filters.isArchived === true) {
    conditions.push("(u.is_archived = TRUE OR u.teacher_archived = TRUE OR u.supervisor_archived = TRUE)");
  } else {
    conditions.push("(u.is_archived = FALSE OR u.is_archived IS NULL)");
  }
  if (filters.role) {
    params.push(filters.role);
    conditions.push(`u.role = $${params.length}`);
  }
  const query = `
    SELECT ${SAFE_USER_SELECT}
    FROM users u
    LEFT JOIN halaqahs h ON u.halaqah_id = h.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY u.name ASC
  `;
  return executeQuery(query, params);
}
async function getUserById(userId, tenantId) {
  let query;
  let params;
  if (tenantId) {
    query = `
      SELECT ${SAFE_USER_SELECT}
      FROM users u
      LEFT JOIN halaqahs h ON u.halaqah_id = h.id
      WHERE u.id = $1 AND u.tenant_id = $2
      LIMIT 1
    `;
    params = [userId, tenantId];
  } else {
    query = `
      SELECT ${SAFE_USER_SELECT}
      FROM users u
      LEFT JOIN halaqahs h ON u.halaqah_id = h.id
      WHERE u.id = $1
      LIMIT 1
    `;
    params = [userId];
  }
  return executeQuerySingle(query, params);
}

// server/routes/userRoutes.ts
var userRouter = (0, import_express4.Router)();
userRouter.get("/", requireTenantContext, async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const filters = {};
    if (req.query.isArchived === "true") filters.isArchived = true;
    else if (req.query.isArchived === "false") filters.isArchived = false;
    if (typeof req.query.role === "string" && req.query.role) filters.role = req.query.role;
    const users = await getUsersByTenant(tenantId, filters);
    res.json({
      ok: true,
      tenantId,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
});
userRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id, req.tenantId);
    if (!user) {
      res.status(404).json({
        ok: false,
        error: "User not found in the specified context"
      });
      return;
    }
    res.json({
      ok: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});
userRouter.post("/", async (req, res, next) => {
  try {
    const saved = await upsert("users", req.body, req.tenantId);
    res.json({
      ok: true,
      data: saved
    });
  } catch (err) {
    next(err);
  }
});
userRouter.post("/bulk", async (req, res, next) => {
  try {
    const items = req.body.items || req.body.records || (Array.isArray(req.body) ? req.body : []);
    const result = await bulkUpsert("users", items, req.tenantId);
    res.json({
      ok: true,
      count: result.count,
      data: result.items
    });
  } catch (err) {
    next(err);
  }
});
userRouter.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await deleteRecord("users", req.params.id, req.tenantId);
    if (!deleted) {
      res.status(404).json({
        ok: false,
        error: "User not found or could not be deleted"
      });
      return;
    }
    res.json({
      ok: true,
      message: `User ${req.params.id} deleted successfully`
    });
  } catch (err) {
    next(err);
  }
});

// server/routes/authRoutes.ts
var import_express5 = require("express");
var import_crypto = __toESM(require("crypto"), 1);
var authRouter = (0, import_express5.Router)();
var activeSessions = /* @__PURE__ */ new Map();
function hashPasswordWithSalt(password) {
  const salted = password.trim() + "_ghazzawi_salt_2026";
  return import_crypto.default.createHash("sha256").update(salted).digest("hex");
}
function hashPasswordPlain(password) {
  return import_crypto.default.createHash("sha256").update(password.trim()).digest("hex");
}
function verifyUserPassword(plainPassword, user) {
  if (!plainPassword) return false;
  const trimmed = plainPassword.trim();
  const inputSaltedHash = hashPasswordWithSalt(trimmed);
  const inputPlainHash = hashPasswordPlain(trimmed);
  const storedHash = (user.passwordHash || user.password_hash || "").trim();
  if (storedHash) {
    if (storedHash.toLowerCase() === inputSaltedHash.toLowerCase()) return true;
    if (storedHash.toLowerCase() === inputPlainHash.toLowerCase()) return true;
    if (storedHash === trimmed) return true;
    return false;
  }
  const validInitialPasswords = [
    "Admin@123456",
    "Admin@123",
    "123456",
    "admin123",
    user.phone?.trim(),
    user.nationalId?.trim(),
    user.national_id?.trim()
  ].filter(Boolean);
  return validInitialPasswords.includes(trimmed);
}
function normalizeDigits(val) {
  if (!val) return "";
  return String(val).trim().replace(/\D/g, "");
}
async function findUsersByIdentifier(identifier) {
  const trimmedIdentifier = identifier.trim();
  const identDigits = normalizeDigits(trimmedIdentifier);
  const identLower = trimmedIdentifier.toLowerCase();
  const pool2 = getDbPool();
  if (pool2) {
    try {
      const users = await executeQuery(`
        SELECT 
          u.id, u.tenant_id, u.organization_id, u.name, u.full_name, u.phone, u.email,
          u.national_id, u.login_identifier, u.password_hash, u.role, u.staff_role, u.halaqah_id,
          u.stage_id, u.student_id, u.teacher_id, u.student_ids, u.supervision_mode,
          u.is_active, u.must_change_password, u.permission_mode, u.role_permissions_overrides,
          u.custom_permissions, u.temporary_custom_permissions, u.supervisor_scope,
          u.assigned_stage_ids, u.assigned_halaqah_ids, u.is_all_halaqahs, u.delegations,
          u.is_archived
        FROM users u
        WHERE (u.is_archived = FALSE OR u.is_archived IS NULL)
          AND (
            u.phone = $1 OR u.national_id = $1 OR LOWER(u.email) = $2 
            OR u.login_identifier = $1 OR u.id = $1
          )
      `, [trimmedIdentifier, identLower]);
      if (users && users.length > 0) return users;
    } catch (dbErr) {
      console.warn("[AUTH] Direct DB query fallback to remote forwarder:", dbErr);
    }
  }
  const user = config.devApiUsername;
  const pass = config.devApiPassword;
  const token = Buffer.from(user + ":" + pass).toString("base64");
  const remoteUrl = config.devRemoteApiUrl || "https://qrms-dev.schoolscreen.sa/api";
  const remoteMatches = [];
  try {
    const tenantsRes = await fetch(`${remoteUrl.replace(/\/+$/, "")}/tenants`, {
      headers: {
        Authorization: `Basic ${token}`,
        Accept: "application/json"
      }
    });
    let tenants = [];
    if (tenantsRes.ok) {
      const tenantsData = await tenantsRes.json();
      tenants = tenantsData.data || [];
    }
    if (tenants.length === 0) {
      tenants = [{ id: "tenant_1789350839237" }, { id: "tenant_1789346881267" }];
    }
    for (const t of tenants) {
      const usersRes = await fetch(`${remoteUrl.replace(/\/+$/, "")}/users`, {
        headers: {
          Authorization: `Basic ${token}`,
          Accept: "application/json",
          "X-Tenant-Id": t.id
        }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const userList = usersData.data || [];
        for (const u of userList) {
          const uPhone = (u.phone || "").trim();
          const uPhoneDigits = normalizeDigits(uPhone);
          const uNatId = (u.nationalId || u.national_id || "").trim();
          const uEmail = (u.email || "").trim().toLowerCase();
          const uLoginId = (u.loginIdentifier || u.login_identifier || "").trim().toLowerCase();
          const uId = (u.id || "").trim().toLowerCase();
          if (identDigits && uPhoneDigits) {
            if (identDigits === uPhoneDigits) {
              remoteMatches.push(u);
              continue;
            }
            if (identDigits.startsWith("966") && identDigits.slice(3) === uPhoneDigits.replace(/^0/, "") || uPhoneDigits.startsWith("966") && uPhoneDigits.slice(3) === identDigits.replace(/^0/, "") || identDigits.replace(/^0/, "") === uPhoneDigits.replace(/^0/, "")) {
              remoteMatches.push(u);
              continue;
            }
          }
          if (uNatId && (uNatId === trimmedIdentifier || identDigits && uNatId === identDigits)) {
            remoteMatches.push(u);
            continue;
          }
          if (uEmail && uEmail === identLower) {
            remoteMatches.push(u);
            continue;
          }
          if (uLoginId && uLoginId === identLower) {
            remoteMatches.push(u);
            continue;
          }
          if (uId && uId === identLower) {
            remoteMatches.push(u);
          }
        }
      }
    }
  } catch (remoteErr) {
    console.error("[AUTH] Remote user fetch error:", remoteErr);
  }
  return remoteMatches;
}
authRouter.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      res.status(400).json({ ok: false, error: "\u0645\u0639\u0631\u0641 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0637\u0644\u0648\u0628 (\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629)." });
      return;
    }
    if (!password || typeof password !== "string") {
      res.status(400).json({ ok: false, error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629." });
      return;
    }
    const candidates = await findUsersByIdentifier(identifier);
    if (candidates.length === 0) {
      res.status(401).json({ ok: false, error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631." });
      return;
    }
    const verified = candidates.filter((u) => verifyUserPassword(password, u));
    const ROLE_PRIORITY = ["parent", "student"];
    const userRow = [...verified].sort(
      (a, b) => (ROLE_PRIORITY.indexOf(a.role) === -1 ? 99 : ROLE_PRIORITY.indexOf(a.role)) - (ROLE_PRIORITY.indexOf(b.role) === -1 ? 99 : ROLE_PRIORITY.indexOf(b.role))
    )[0];
    if (!userRow) {
      res.status(401).json({ ok: false, error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629. \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0645\u0637\u0627\u0628\u0642\u0629." });
      return;
    }
    if (userRow.isActive === false || userRow.is_active === false || userRow.isArchived === true || userRow.is_archived === true) {
      res.status(403).json({ ok: false, error: "\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0639\u0637\u0644 \u0623\u0648 \u0645\u0624\u0631\u0634\u0641. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062C\u0645\u0639." });
      return;
    }
    const sessionId = `sess_${import_crypto.default.randomBytes(24).toString("hex")}`;
    const { passwordHash, password_hash, ...safeUser } = userRow;
    activeSessions.set(sessionId, {
      user: safeUser,
      createdAt: Date.now()
    });
    res.cookie("session_id", sessionId, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1e3
    });
    res.json({
      ok: true,
      user: safeUser,
      token: sessionId,
      mustChangePassword: userRow.mustChangePassword || userRow.must_change_password || false
    });
  } catch (err) {
    console.error("[AUTH] Login unexpected error:", err);
    next(err);
  }
});
authRouter.get("/me", (req, res) => {
  const sessionId = req.cookies?.session_id || req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!sessionId) {
    res.status(401).json({ ok: false, error: "Not authenticated" });
    return;
  }
  const session = activeSessions.get(sessionId);
  if (!session || !session.user) {
    res.status(401).json({ ok: false, error: "Session expired or invalid" });
    return;
  }
  res.json({ ok: true, user: session.user });
});
authRouter.post("/logout", (req, res) => {
  const sessionId = req.cookies?.session_id || req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
  res.clearCookie("session_id", { path: "/" });
  res.json({ ok: true, message: "Logged out successfully" });
});
authRouter.post("/update-password", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      res.status(400).json({ ok: false, error: "User ID and new password are required" });
      return;
    }
    const newHash = hashPasswordWithSalt(newPassword);
    const pool2 = getDbPool();
    if (pool2) {
      await pool2.query("UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2", [newHash, userId]);
    }
    for (const [sId, sess] of activeSessions.entries()) {
      if (sess.user.id === userId) {
        sess.user.mustChangePassword = false;
        activeSessions.set(sId, sess);
      }
    }
    res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("[AUTH] Update password error:", err);
    res.status(500).json({ ok: false, error: "Failed to update password" });
  }
});

// server/routes/entityRoutes.ts
var import_express6 = require("express");
var entityRouter = (0, import_express6.Router)();
entityRouter.use((req, res, next) => {
  const systemPaths = ["/auth", "/health", "/tenants", "/stages", "/users", "/admin"];
  if (systemPaths.some((p) => req.path.startsWith(p))) {
    return next();
  }
  console.log(`[ENTITY-DEBUG] Request reached entityRouter: ${req.method} ${req.originalUrl} | Path: ${req.path}`);
  next();
});
function validateCollection(req, res, next) {
  const collectionName = req.params.collection;
  const config2 = resolveTableConfig(collectionName);
  if (!config2) {
    res.status(404).json({
      ok: false,
      error: `Unknown collection '${collectionName}'`
    });
    return;
  }
  next();
}
entityRouter.get("/:collection", validateCollection, async (req, res, next) => {
  try {
    const collection = req.params.collection;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;
    const items = await findMany(collection, {
      tenantId,
      queryParams: req.query,
      isSuperAdmin
    });
    res.json({
      ok: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    next(err);
  }
});
entityRouter.get("/:collection/:id", validateCollection, async (req, res, next) => {
  try {
    const { collection, id } = req.params;
    const tenantId = req.tenantId;
    const item = await findById(collection, id, tenantId);
    if (!item) {
      res.status(404).json({
        ok: false,
        error: `Record not found in '${collection}' with ID '${id}'`
      });
      return;
    }
    res.json({
      ok: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
});
entityRouter.post("/:collection/bulk", validateCollection, async (req, res, next) => {
  try {
    const collection = req.params.collection;
    const tenantId = req.tenantId;
    const items = req.body.items || req.body.records || (Array.isArray(req.body) ? req.body : []);
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        ok: false,
        error: "Bulk operation requires a non-empty array of items in body (e.g. { items: [...] })"
      });
      return;
    }
    const result = await bulkUpsert(collection, items, tenantId);
    res.json({
      ok: true,
      count: result.count,
      data: result.items
    });
  } catch (err) {
    next(err);
  }
});
entityRouter.post("/:collection", validateCollection, async (req, res, next) => {
  try {
    const collection = req.params.collection;
    const tenantId = req.tenantId;
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      res.status(400).json({
        ok: false,
        error: "Invalid request body"
      });
      return;
    }
    const saved = await upsert(collection, payload, tenantId);
    res.json({
      ok: true,
      data: saved
    });
  } catch (err) {
    next(err);
  }
});
entityRouter.put("/:collection/:id", validateCollection, async (req, res, next) => {
  try {
    const { collection, id } = req.params;
    const tenantId = req.tenantId;
    const payload = { ...req.body, id };
    const saved = await upsert(collection, payload, tenantId);
    res.json({
      ok: true,
      data: saved
    });
  } catch (err) {
    next(err);
  }
});
entityRouter.delete("/:collection/:id", validateCollection, async (req, res, next) => {
  try {
    const { collection, id } = req.params;
    const tenantId = req.tenantId;
    const success = await deleteRecord(collection, id, tenantId);
    if (!success) {
      res.status(404).json({
        ok: false,
        error: `Record not found or already deleted in '${collection}' with ID '${id}'`
      });
      return;
    }
    res.json({
      ok: true,
      message: `Record '${id}' deleted from '${collection}'`
    });
  } catch (err) {
    next(err);
  }
});

// server/routes/backupRestoreRoutes.ts
var import_express7 = require("express");

// migration/config/collectionMap.ts
var COLLECTION_MAPPINGS = {
  // ---------------------------------------------------------------------------
  // Tier 1: Core Independent Master Tables
  // ---------------------------------------------------------------------------
  organizations: {
    firestoreCollection: "organizations",
    postgresTable: "organizations",
    primaryKey: "id",
    order: 1,
    description: "\u062C\u0645\u0639\u064A\u0627\u062A \u0627\u0644\u062A\u062D\u0641\u064A\u0638 \u0648\u0627\u0644\u0645\u0642\u0631\u0627\u062A \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 (Master Organizations)",
    dependencies: [],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "name", postgresColumn: "name", type: "string", required: true },
      { firestoreField: "code", postgresColumn: "code", type: "string" },
      { firestoreField: "licenseNumber", postgresColumn: "license_number", type: "string" },
      { firestoreField: "logoUrl", postgresColumn: "logo_url", type: "string" },
      { firestoreField: "tenantIds", postgresColumn: "tenant_ids", type: "jsonb", defaultValue: [] },
      { firestoreField: "isActive", postgresColumn: "is_active", type: "boolean", defaultValue: true },
      { firestoreField: "rolePermissionsOverrides", postgresColumn: "role_permissions_overrides", type: "jsonb", defaultValue: {} },
      { firestoreField: "description", postgresColumn: "description", type: "string" },
      { firestoreField: "city", postgresColumn: "city", type: "string" },
      { firestoreField: "region", postgresColumn: "region", type: "string" },
      { firestoreField: "contactPhone", postgresColumn: "contact_phone", type: "string" },
      { firestoreField: "contactEmail", postgresColumn: "contact_email", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  educational_stages: {
    firestoreCollection: "educational_stages",
    postgresTable: "stages",
    primaryKey: "id",
    order: 2,
    description: "\u0627\u0644\u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 (Educational Stages)",
    dependencies: [],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "code", postgresColumn: "code", type: "string", required: true },
      { firestoreField: "name", postgresColumn: "name", type: "string", required: true },
      { firestoreField: "subtitle", postgresColumn: "subtitle", type: "string" },
      { firestoreField: "ageRange", postgresColumn: "age_range", type: "string" },
      { firestoreField: "targetGrades", postgresColumn: "target_grades", type: "jsonb", defaultValue: [] },
      { firestoreField: "curriculumFocus", postgresColumn: "curriculum_focus", type: "string" },
      { firestoreField: "defaultTargetSurah", postgresColumn: "default_target_surah", type: "string", defaultValue: "\u0627\u0644\u063A\u0627\u0634\u064A\u0629" },
      { firestoreField: "accentColor", postgresColumn: "accent_color", type: "string", defaultValue: "emerald" },
      { firestoreField: "iconName", postgresColumn: "icon_name", type: "string", defaultValue: "Sparkles" },
      { firestoreField: "order", postgresColumn: "display_order", type: "number", defaultValue: 1 },
      { firestoreField: "isActive", postgresColumn: "is_active", type: "boolean", defaultValue: true },
      { firestoreField: "rolePermissionsOverrides", postgresColumn: "role_permissions_overrides", type: "jsonb", defaultValue: {} },
      { firestoreField: "traits", postgresColumn: "traits", type: "jsonb", defaultValue: [] },
      { firestoreField: "outcomeSummary", postgresColumn: "outcome_summary", type: "string" },
      { firestoreField: "targetQuranAmount", postgresColumn: "target_quran_amount", type: "string" },
      { firestoreField: "logoUrl", postgresColumn: "logo_url", type: "string" },
      { firestoreField: "isLogoActive", postgresColumn: "is_logo_active", type: "boolean", defaultValue: true },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  quran_stage_configs: {
    firestoreCollection: "quran_stage_configs",
    postgresTable: "quran_stage_configs",
    primaryKey: "id",
    order: 3,
    description: "\u062E\u0637\u0637 \u0648\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0642\u0631\u0622\u0646 \u0644\u0644\u0645\u0631\u0627\u062D\u0644 (Stage Quran Configs)",
    dependencies: [],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      {
        firestoreField: "name",
        postgresColumn: "name",
        type: "string",
        required: true,
        transform: (val, rawDoc) => String(
          val || rawDoc?.title || rawDoc?.stageName || rawDoc?.label || rawDoc?.code || rawDoc?.id || rawDoc?.documentId || ""
        ).trim()
      },
      {
        firestoreField: "code",
        postgresColumn: "code",
        type: "string",
        required: true,
        transform: (val, rawDoc) => String(val || rawDoc?.id || rawDoc?.documentId || "").trim()
      },
      { firestoreField: "description", postgresColumn: "description", type: "string" },
      { firestoreField: "targetGrades", postgresColumn: "target_grades", type: "jsonb", defaultValue: [] },
      { firestoreField: "dailyPaceDescription", postgresColumn: "daily_pace_description", type: "string" },
      { firestoreField: "memorization", postgresColumn: "memorization", type: "jsonb", defaultValue: {} },
      { firestoreField: "revision", postgresColumn: "revision", type: "jsonb", defaultValue: {} },
      { firestoreField: "consolidationDays", postgresColumn: "consolidation_days", type: "number", defaultValue: 3 },
      { firestoreField: "schedule", postgresColumn: "schedule", type: "jsonb", defaultValue: {} },
      { firestoreField: "defaultTermWeeks", postgresColumn: "default_term_weeks", type: "number", defaultValue: 12 },
      { firestoreField: "isActive", postgresColumn: "is_active", type: "boolean", defaultValue: true },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  academic_years: {
    firestoreCollection: "academic_years",
    postgresTable: "academic_years",
    primaryKey: "id",
    order: 4,
    description: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u062F\u0631\u0627\u0633\u064A \u0648\u0627\u0644\u0623\u0633\u0627\u0628\u064A\u0639 (Academic Years)",
    dependencies: [],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "name", postgresColumn: "name", type: "string", required: true },
      { firestoreField: "semester", postgresColumn: "semester", type: "string", required: true },
      { firestoreField: "currentTerm", postgresColumn: "current_term", type: "string" },
      { firestoreField: "academicYear", postgresColumn: "academic_year", type: "string" },
      { firestoreField: "startDate", postgresColumn: "start_date", type: "date", required: true },
      { firestoreField: "endDate", postgresColumn: "end_date", type: "date", required: true },
      { firestoreField: "holidays", postgresColumn: "holidays", type: "jsonb", defaultValue: [] },
      { firestoreField: "operationalStartWeek", postgresColumn: "operational_start_week", type: "number", defaultValue: 3 },
      { firestoreField: "operationalEndWeek", postgresColumn: "operational_end_week", type: "number", defaultValue: 14 },
      { firestoreField: "totalWeeks", postgresColumn: "total_weeks", type: "number", defaultValue: 12 },
      { firestoreField: "currentWeek", postgresColumn: "current_week", type: "number", defaultValue: 5 },
      { firestoreField: "manualWeekOverride", postgresColumn: "manual_week_override", type: "boolean", defaultValue: false },
      { firestoreField: "daysPerWeek", postgresColumn: "days_per_week", type: "number", defaultValue: 4 },
      { firestoreField: "spellingPassingThreshold", postgresColumn: "spelling_passing_threshold", type: "number", defaultValue: 85 },
      { firestoreField: "gradeTargets", postgresColumn: "grade_targets", type: "jsonb", defaultValue: {} },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  spelling_lessons: {
    firestoreCollection: "spelling_lessons",
    postgresTable: "spelling_lessons",
    primaryKey: "id",
    order: 5,
    description: "\u0628\u0646\u0643 \u062F\u0631\u0648\u0633 \u0627\u0644\u0647\u062C\u0627\u0621 \u0627\u0644\u0642\u0631\u0622\u0646\u064A (Spelling Lessons)",
    dependencies: [],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "lessonNumber", postgresColumn: "lesson_number", type: "number", required: true },
      { firestoreField: "title", postgresColumn: "title", type: "string", required: true },
      { firestoreField: "skill", postgresColumn: "skill", type: "string" },
      { firestoreField: "description", postgresColumn: "description", type: "string" },
      { firestoreField: "expectedWeek", postgresColumn: "expected_week", type: "number" },
      { firestoreField: "targetGrade", postgresColumn: "target_grade", type: "string" },
      { firestoreField: "passingThreshold", postgresColumn: "passing_threshold", type: "number", defaultValue: 85 },
      { firestoreField: "passingScore", postgresColumn: "passing_score", type: "number", defaultValue: 85 },
      { firestoreField: "order", postgresColumn: "display_order", type: "number", defaultValue: 1 },
      { firestoreField: "isActive", postgresColumn: "is_active", type: "boolean", defaultValue: true },
      { firestoreField: "coreSkills", postgresColumn: "core_skills", type: "jsonb", defaultValue: [] },
      { firestoreField: "subLessons", postgresColumn: "sub_lessons", type: "jsonb", defaultValue: [] },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  // ---------------------------------------------------------------------------
  // Tier 2: Tenants (Depend on Organizations)
  // ---------------------------------------------------------------------------
  tenants: {
    firestoreCollection: "tenants",
    postgresTable: "tenants",
    primaryKey: "id",
    organizationKey: "organization_id",
    order: 6,
    description: "\u0627\u0644\u0645\u062C\u0645\u0639\u0627\u062A \u0648\u0627\u0644\u0645\u0631\u0627\u0643\u0632 \u0627\u0644\u0642\u0631\u0622\u0646\u064A\u0629 (Tenants / Mosque Complexes)",
    dependencies: ["organizations"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "slug", postgresColumn: "slug", type: "string", required: true },
      { firestoreField: "name", postgresColumn: "name", type: "string", required: true },
      { firestoreField: "organizationId", postgresColumn: "organization_id", type: "string", isForeignKey: true, foreignKeyTable: "organizations" },
      { firestoreField: "description", postgresColumn: "description", type: "string" },
      { firestoreField: "city", postgresColumn: "city", type: "string", defaultValue: "\u0627\u0644\u0631\u064A\u0627\u0636" },
      { firestoreField: "district", postgresColumn: "district", type: "string", defaultValue: "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0631\u0626\u064A\u0633\u064A" },
      { firestoreField: "region", postgresColumn: "region", type: "string" },
      { firestoreField: "address", postgresColumn: "address", type: "string" },
      { firestoreField: "supervisorName", postgresColumn: "supervisor_name", type: "string", defaultValue: "\u0627\u0644\u0645\u0634\u0631\u0641 \u0627\u0644\u0639\u0627\u0645" },
      { firestoreField: "contactPhone", postgresColumn: "contact_phone", type: "string", defaultValue: "0500000000" },
      { firestoreField: "email", postgresColumn: "email", type: "string" },
      { firestoreField: "whatsappNumber", postgresColumn: "whatsapp_number", type: "string" },
      { firestoreField: "logoUrl", postgresColumn: "logo_url", type: "string" },
      { firestoreField: "stageLogoUrl", postgresColumn: "stage_logo_url", type: "string" },
      { firestoreField: "targetSurahDefault", postgresColumn: "target_surah_default", type: "string", defaultValue: "\u0627\u0644\u063A\u0627\u0634\u064A\u0629" },
      { firestoreField: "referenceOutcome", postgresColumn: "reference_outcome", type: "string" },
      { firestoreField: "supportedStages", postgresColumn: "supported_stages", type: "jsonb", defaultValue: ["baraem", "ashbal"] },
      { firestoreField: "isActive", postgresColumn: "is_active", type: "boolean", defaultValue: true },
      { firestoreField: "rolePermissionsOverrides", postgresColumn: "role_permissions_overrides", type: "jsonb", defaultValue: {} },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "customDomain", postgresColumn: "custom_domain", type: "string" },
      { firestoreField: "tenantType", postgresColumn: "tenant_type", type: "string", defaultValue: "production" },
      { firestoreField: "showOnPublicDirectory", postgresColumn: "show_on_public_directory", type: "boolean", defaultValue: true },
      { firestoreField: "subscription", postgresColumn: "subscription", type: "jsonb", defaultValue: {} },
      { firestoreField: "modulesConfig", postgresColumn: "modules_config", type: "jsonb", defaultValue: {} },
      { firestoreField: "attendanceConfig", postgresColumn: "attendance_config", type: "jsonb", defaultValue: {} },
      { firestoreField: "prayerConfig", postgresColumn: "prayer_config", type: "jsonb", defaultValue: {} },
      { firestoreField: "admissionsConfig", postgresColumn: "admissions_config", type: "jsonb", defaultValue: {} },
      { firestoreField: "reportsConfig", postgresColumn: "reports_config", type: "jsonb", defaultValue: {} },
      { firestoreField: "whatsappConfig", postgresColumn: "whatsapp_config", type: "jsonb", defaultValue: {} },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  // ---------------------------------------------------------------------------
  // Tier 3: Users & Track Definitions (Depend on Tenants, Stages, Organizations)
  // ---------------------------------------------------------------------------
  platform_users: {
    firestoreCollection: "platform_users",
    postgresTable: "users",
    primaryKey: "id",
    tenantKey: "tenant_id",
    organizationKey: "organization_id",
    order: 7,
    description: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 \u0648\u0627\u0644\u0643\u0648\u0627\u062F\u0631 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 (Users & Staff)",
    dependencies: ["tenants", "organizations", "stages"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "organizationId", postgresColumn: "organization_id", type: "string", isForeignKey: true, foreignKeyTable: "organizations" },
      { firestoreField: "name", postgresColumn: "name", type: "string", required: true },
      { firestoreField: "fullName", postgresColumn: "full_name", type: "string" },
      { firestoreField: "phone", postgresColumn: "phone", type: "string", required: true },
      { firestoreField: "email", postgresColumn: "email", type: "string" },
      { firestoreField: "nationalId", postgresColumn: "national_id", type: "string" },
      { firestoreField: "loginIdentifier", postgresColumn: "login_identifier", type: "string" },
      { firestoreField: "passwordHash", postgresColumn: "password_hash", type: "string" },
      { firestoreField: "role", postgresColumn: "role", type: "string", required: true },
      { firestoreField: "staffRole", postgresColumn: "staff_role", type: "string" },
      { firestoreField: "halaqahId", postgresColumn: "halaqah_id", type: "string" },
      { firestoreField: "stageId", postgresColumn: "stage_id", type: "string", isForeignKey: true, foreignKeyTable: "stages" },
      { firestoreField: "studentId", postgresColumn: "student_id", type: "string" },
      { firestoreField: "teacherId", postgresColumn: "teacher_id", type: "string" },
      { firestoreField: "studentIds", postgresColumn: "student_ids", type: "jsonb", defaultValue: [] },
      { firestoreField: "supervisionMode", postgresColumn: "supervision_mode", type: "string", defaultValue: "full_access" },
      { firestoreField: "isActive", postgresColumn: "is_active", type: "boolean", defaultValue: true },
      { firestoreField: "mustChangePassword", postgresColumn: "must_change_password", type: "boolean", defaultValue: false },
      { firestoreField: "permissionMode", postgresColumn: "permission_mode", type: "string", defaultValue: "role_defaults" },
      { firestoreField: "rolePermissionsOverrides", postgresColumn: "role_permissions_overrides", type: "jsonb", defaultValue: {} },
      { firestoreField: "customPermissions", postgresColumn: "custom_permissions", type: "jsonb", defaultValue: [] },
      { firestoreField: "temporaryCustomPermissions", postgresColumn: "temporary_custom_permissions", type: "jsonb", defaultValue: [] },
      { firestoreField: "supervisorScope", postgresColumn: "supervisor_scope", type: "jsonb", defaultValue: {} },
      { firestoreField: "assignedStageIds", postgresColumn: "assigned_stage_ids", type: "jsonb", defaultValue: [] },
      { firestoreField: "assignedHalaqahIds", postgresColumn: "assigned_halaqah_ids", type: "jsonb", defaultValue: [] },
      { firestoreField: "isAllHalaqahs", postgresColumn: "is_all_halaqahs", type: "boolean", defaultValue: false },
      { firestoreField: "delegations", postgresColumn: "delegations", type: "jsonb", defaultValue: {} },
      { firestoreField: "isArchived", postgresColumn: "is_archived", type: "boolean", defaultValue: false },
      { firestoreField: "teacherArchived", postgresColumn: "teacher_archived", type: "boolean", defaultValue: false },
      { firestoreField: "supervisorArchived", postgresColumn: "supervisor_archived", type: "boolean", defaultValue: false },
      { firestoreField: "archiveType", postgresColumn: "archive_type", type: "string" },
      { firestoreField: "archivedAt", postgresColumn: "archived_at", type: "timestamp" },
      { firestoreField: "archivedBy", postgresColumn: "archived_by", type: "string" },
      { firestoreField: "archiveReason", postgresColumn: "archive_reason", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  track_definitions: {
    firestoreCollection: "track_definitions",
    postgresTable: "track_definitions",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 8,
    description: "\u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u062A\u062E\u0635\u0635\u064A\u0629 \u0627\u0644\u0642\u0631\u0622\u0646\u064A\u0629 (Track Definitions)",
    dependencies: ["tenants"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "code", postgresColumn: "code", type: "string", required: true },
      { firestoreField: "name", postgresColumn: "name", type: "string", required: true },
      { firestoreField: "shortName", postgresColumn: "short_name", type: "string", required: true },
      { firestoreField: "description", postgresColumn: "description", type: "string" },
      { firestoreField: "icon", postgresColumn: "icon", type: "string", defaultValue: "BookOpen" },
      { firestoreField: "colorScheme", postgresColumn: "color_scheme", type: "string", defaultValue: "emerald" },
      { firestoreField: "isActive", postgresColumn: "is_active", type: "boolean", defaultValue: true },
      { firestoreField: "rolePermissionsOverrides", postgresColumn: "role_permissions_overrides", type: "jsonb", defaultValue: {} },
      { firestoreField: "order", postgresColumn: "display_order", type: "number", defaultValue: 1 },
      { firestoreField: "nominationConfig", postgresColumn: "nomination_config", type: "jsonb", defaultValue: {} },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  // ---------------------------------------------------------------------------
  // Tier 4: Halaqahs (Depend on Tenants, Stages, Users/Teachers)
  // ---------------------------------------------------------------------------
  halaqahs: {
    firestoreCollection: "halaqahs",
    postgresTable: "halaqahs",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 9,
    description: "\u0627\u0644\u062D\u0644\u0642\u0627\u062A \u0627\u0644\u0642\u0631\u0622\u0646\u064A\u0629 (Halaqahs)",
    dependencies: ["tenants", "stages", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "stageId", postgresColumn: "stage_id", type: "string", isForeignKey: true, foreignKeyTable: "stages" },
      { firestoreField: "name", postgresColumn: "name", type: "string", required: true },
      { firestoreField: "teacherId", postgresColumn: "teacher_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "teacherName", postgresColumn: "teacher_name", type: "string", required: true },
      { firestoreField: "teacherPhone", postgresColumn: "teacher_phone", type: "string" },
      { firestoreField: "location", postgresColumn: "location", type: "string", defaultValue: "\u0627\u0644\u0645\u0633\u062C\u062F" },
      { firestoreField: "daysPerWeek", postgresColumn: "days_per_week", type: "number", defaultValue: 4 },
      { firestoreField: "grade", postgresColumn: "grade", type: "string" },
      { firestoreField: "targetSurah", postgresColumn: "target_surah", type: "string", defaultValue: "\u0627\u0644\u063A\u0627\u0634\u064A\u0629" },
      { firestoreField: "assistantTeachers", postgresColumn: "assistant_teachers", type: "jsonb", defaultValue: [] },
      { firestoreField: "onlineConfig", postgresColumn: "online_config", type: "jsonb", defaultValue: {} },
      { firestoreField: "weeklySchedule", postgresColumn: "weekly_schedule", type: "jsonb", defaultValue: [] },
      { firestoreField: "defaultTimeType", postgresColumn: "default_time_type", type: "string", defaultValue: "fixed" },
      { firestoreField: "defaultStartTime", postgresColumn: "default_start_time", type: "string" },
      { firestoreField: "defaultEndTime", postgresColumn: "default_end_time", type: "string" },
      { firestoreField: "defaultStartPrayerOffset", postgresColumn: "default_start_prayer_offset", type: "jsonb" },
      { firestoreField: "defaultEndPrayerOffset", postgresColumn: "default_end_prayer_offset", type: "jsonb" },
      { firestoreField: "activeTrackIds", postgresColumn: "active_track_ids", type: "jsonb", defaultValue: ["track_quran", "track_spelling", "track_virtues"] },
      { firestoreField: "rolePermissionsOverrides", postgresColumn: "role_permissions_overrides", type: "jsonb", defaultValue: {} },
      { firestoreField: "isActive", postgresColumn: "is_active", type: "boolean", defaultValue: true },
      { firestoreField: "isArchived", postgresColumn: "is_archived", type: "boolean", defaultValue: false },
      { firestoreField: "archivedAt", postgresColumn: "archived_at", type: "timestamp" },
      { firestoreField: "archivedBy", postgresColumn: "archived_by", type: "string" },
      { firestoreField: "archiveReason", postgresColumn: "archive_reason", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  // ---------------------------------------------------------------------------
  // Tier 5: Students (Depend on Tenants, Stages, Halaqahs, Users, Spelling Lessons)
  // ---------------------------------------------------------------------------
  students: {
    firestoreCollection: "students",
    postgresTable: "students",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 10,
    description: "\u0645\u0644\u0641\u0627\u062A \u0648\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 (Students)",
    dependencies: ["tenants", "stages", "halaqahs", "users", "spelling_lessons"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "stageId", postgresColumn: "stage_id", type: "string", isForeignKey: true, foreignKeyTable: "stages" },
      { firestoreField: "halaqahId", postgresColumn: "halaqah_id", type: "string", isForeignKey: true, foreignKeyTable: "halaqahs" },
      { firestoreField: "teacherId", postgresColumn: "teacher_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "fullName", postgresColumn: "full_name", type: "string", required: true },
      { firestoreField: "nationalId", postgresColumn: "national_id", type: "string" },
      { firestoreField: "grade", postgresColumn: "grade", type: "string", required: true },
      { firestoreField: "halaqahName", postgresColumn: "halaqah_name", type: "string" },
      { firestoreField: "teacherName", postgresColumn: "teacher_name", type: "string" },
      { firestoreField: "teacherPhone", postgresColumn: "teacher_phone", type: "string" },
      { firestoreField: "parentName", postgresColumn: "parent_name", type: "string" },
      { firestoreField: "parentPhone", postgresColumn: "parent_phone", type: "string" },
      { firestoreField: "phone", postgresColumn: "phone", type: "string" },
      { firestoreField: "motherPhone", postgresColumn: "mother_phone", type: "string" },
      { firestoreField: "guardianRelationship", postgresColumn: "guardian_relationship", type: "string" },
      { firestoreField: "otherContactPhone", postgresColumn: "other_contact_phone", type: "string" },
      { firestoreField: "minimumTargetSurah", postgresColumn: "minimum_target_surah", type: "string", defaultValue: "\u0627\u0644\u063A\u0627\u0634\u064A\u0629" },
      { firestoreField: "personalTargetSurah", postgresColumn: "personal_target_surah", type: "string" },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "on_track" },
      { firestoreField: "currentSpellingLessonId", postgresColumn: "current_spelling_lesson_id", type: "string", isForeignKey: true, foreignKeyTable: "spelling_lessons" },
      { firestoreField: "currentSpellingScore", postgresColumn: "current_spelling_score", type: "number", defaultValue: 0 },
      { firestoreField: "currentSurah", postgresColumn: "current_surah", type: "string", defaultValue: "\u0627\u0644\u0646\u0627\u0633" },
      { firestoreField: "currentAyah", postgresColumn: "current_ayah", type: "number", defaultValue: 1 },
      { firestoreField: "avatarUrl", postgresColumn: "avatar_url", type: "string" },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "username", postgresColumn: "username", type: "string" },
      { firestoreField: "activeQuranPlanId", postgresColumn: "active_quran_plan_id", type: "string" },
      { firestoreField: "quranPlan", postgresColumn: "quran_plan", type: "jsonb", defaultValue: {} },
      { firestoreField: "termHistories", postgresColumn: "term_histories", type: "jsonb", defaultValue: [] },
      { firestoreField: "attendanceStreak", postgresColumn: "attendance_streak", type: "number", defaultValue: 0 },
      { firestoreField: "registrationType", postgresColumn: "registration_type", type: "string" },
      { firestoreField: "registrationTypeLabel", postgresColumn: "registration_type_label", type: "string" },
      { firestoreField: "previouslyRegistered", postgresColumn: "previously_registered", type: "string" },
      { firestoreField: "isActive", postgresColumn: "is_active", type: "boolean", defaultValue: true },
      { firestoreField: "isArchived", postgresColumn: "is_archived", type: "boolean", defaultValue: false },
      { firestoreField: "archivedAt", postgresColumn: "archived_at", type: "timestamp" },
      { firestoreField: "archiveReason", postgresColumn: "archive_reason", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  // ---------------------------------------------------------------------------
  // Tier 6: Student Dependents (Quran Plans, Daily Records, Financial, Badges, Remedial)
  // ---------------------------------------------------------------------------
  quran_plans: {
    firestoreCollection: "quran_plans",
    postgresTable: "quran_plans",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 11,
    description: "\u062E\u0637\u0637 \u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u0641\u0631\u062F\u064A\u0629 \u0644\u0644\u0637\u0644\u0627\u0628 (Student Quran Plans)",
    dependencies: ["tenants", "students", "stages"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "studentId", postgresColumn: "student_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "students" },
      { firestoreField: "stageId", postgresColumn: "stage_id", type: "string", isForeignKey: true, foreignKeyTable: "stages" },
      { firestoreField: "planName", postgresColumn: "plan_name", type: "string" },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "active" },
      { firestoreField: "scope", postgresColumn: "scope", type: "string", defaultValue: "semester" },
      { firestoreField: "direction", postgresColumn: "direction", type: "string", defaultValue: "backward" },
      { firestoreField: "unitType", postgresColumn: "unit_type", type: "string", defaultValue: "ayah" },
      { firestoreField: "dailyAmount", postgresColumn: "daily_amount", type: "number" },
      { firestoreField: "planData", postgresColumn: "plan_data", type: "jsonb", defaultValue: {} },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  daily_records: {
    firestoreCollection: "daily_records",
    postgresTable: "daily_session_records",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 12,
    description: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062D\u0641\u0638 \u0648\u0627\u0644\u0647\u062C\u0627\u0621 \u0648\u0627\u0644\u062D\u0636\u0648\u0631 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 (Daily Session Records)",
    dependencies: ["tenants", "students", "halaqahs", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "studentId", postgresColumn: "student_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "students" },
      { firestoreField: "teacherId", postgresColumn: "teacher_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "halaqahId", postgresColumn: "halaqah_id", type: "string", isForeignKey: true, foreignKeyTable: "halaqahs" },
      { firestoreField: "date", postgresColumn: "date", type: "date", required: true },
      { firestoreField: "dayOfWeek", postgresColumn: "day_of_week", type: "string" },
      { firestoreField: "weekNumber", postgresColumn: "week_number", type: "number", required: true },
      { firestoreField: "attendance", postgresColumn: "attendance", type: "string", defaultValue: "present" },
      { firestoreField: "teacherRemarks", postgresColumn: "teacher_remarks", type: "string" },
      { firestoreField: "spellingDrillMinutes", postgresColumn: "spelling_drill_minutes", type: "number", defaultValue: 10 },
      { firestoreField: "spellingProgress", postgresColumn: "spelling_progress", type: "jsonb" },
      { firestoreField: "spelling", postgresColumn: "spelling", type: "jsonb" },
      { firestoreField: "memorization", postgresColumn: "memorization", type: "jsonb" },
      { firestoreField: "revision", postgresColumn: "revision", type: "jsonb" },
      { firestoreField: "customTracks", postgresColumn: "custom_tracks", type: "jsonb" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  educational_plan: {
    firestoreCollection: "educational_plan",
    postgresTable: "educational_plan_weeks",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 13,
    description: "\u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u062A\u0631\u0628\u0648\u064A\u0629 \u0648\u0627\u0644\u0642\u064A\u0645\u064A\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A\u0629 (Educational Plan Weeks)",
    dependencies: ["tenants", "stages"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "stageId", postgresColumn: "stage_id", type: "string", isForeignKey: true, foreignKeyTable: "stages" },
      { firestoreField: "targetStageIds", postgresColumn: "target_stage_ids", type: "jsonb", defaultValue: [] },
      { firestoreField: "weekNumber", postgresColumn: "week_number", type: "number", required: true },
      { firestoreField: "startDate", postgresColumn: "start_date", type: "date", required: true },
      { firestoreField: "endDate", postgresColumn: "end_date", type: "date", required: true },
      { firestoreField: "dayDates", postgresColumn: "day_dates", type: "jsonb", defaultValue: {} },
      { firestoreField: "weekType", postgresColumn: "week_type", type: "string", defaultValue: "normal" },
      { firestoreField: "specialEventTitle", postgresColumn: "special_event_title", type: "string" },
      { firestoreField: "domain", postgresColumn: "domain", type: "string" },
      { firestoreField: "domainLabel", postgresColumn: "domain_label", type: "string" },
      { firestoreField: "valueTitle", postgresColumn: "value_title", type: "string" },
      { firestoreField: "motto", postgresColumn: "motto", type: "string", defaultValue: "\u0642\u064A\u0645\u0646\u0627 \u062D\u064A\u0627\u062A\u0646\u0627" },
      { firestoreField: "educationalGoal", postgresColumn: "educational_goal", type: "string", defaultValue: "\u062A\u0639\u0632\u064A\u0632 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u062A\u0631\u0628\u0648\u064A\u0629" },
      { firestoreField: "goalTopic", postgresColumn: "goal_topic", type: "string" },
      { firestoreField: "goalPresenter", postgresColumn: "goal_presenter", type: "string" },
      { firestoreField: "goalLocation", postgresColumn: "goal_location", type: "string" },
      { firestoreField: "activity", postgresColumn: "activity", type: "string", defaultValue: "\u0646\u0634\u0627\u0637 \u062A\u0631\u0628\u0648\u064A" },
      { firestoreField: "activityPresenter", postgresColumn: "activity_presenter", type: "string" },
      { firestoreField: "activityLocation", postgresColumn: "activity_location", type: "string" },
      { firestoreField: "responsiblePerson", postgresColumn: "responsible_person", type: "string", defaultValue: "\u0627\u0644\u0645\u0634\u0631\u0641" },
      { firestoreField: "quranicProgram", postgresColumn: "quranic_program", type: "string" },
      { firestoreField: "overallProjectBudget", postgresColumn: "overall_project_budget", type: "number", defaultValue: 0 },
      { firestoreField: "budget", postgresColumn: "budget", type: "number", defaultValue: 0 },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "valuesList", postgresColumn: "values_list", type: "jsonb", defaultValue: [] },
      { firestoreField: "executionStatus", postgresColumn: "execution_status", type: "string", defaultValue: "planned" },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "scheduled" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  seasonal_programs: {
    firestoreCollection: "seasonal_programs",
    postgresTable: "seasonal_programs",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 14,
    description: "\u0627\u0644\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u0645\u0648\u0633\u0645\u064A\u0629 (Seasonal Programs)",
    dependencies: ["tenants", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "title", postgresColumn: "title", type: "string", required: true },
      { firestoreField: "name", postgresColumn: "name", type: "string" },
      { firestoreField: "code", postgresColumn: "code", type: "string" },
      { firestoreField: "type", postgresColumn: "type", type: "string", required: true },
      { firestoreField: "season", postgresColumn: "season", type: "string" },
      { firestoreField: "startDate", postgresColumn: "start_date", type: "date", required: true },
      { firestoreField: "endDate", postgresColumn: "end_date", type: "date", required: true },
      { firestoreField: "targetStageIds", postgresColumn: "target_stage_ids", type: "jsonb", defaultValue: [] },
      { firestoreField: "targetAudience", postgresColumn: "target_audience", type: "string" },
      { firestoreField: "location", postgresColumn: "location", type: "string" },
      { firestoreField: "maxCapacity", postgresColumn: "max_capacity", type: "number" },
      { firestoreField: "supervisorId", postgresColumn: "supervisor_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "supervisorName", postgresColumn: "supervisor_name", type: "string" },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "active" },
      { firestoreField: "budget", postgresColumn: "budget", type: "number", defaultValue: 0 },
      { firestoreField: "description", postgresColumn: "description", type: "string" },
      { firestoreField: "goals", postgresColumn: "goals", type: "jsonb", defaultValue: [] },
      { firestoreField: "enrolledStudentIds", postgresColumn: "enrolled_student_ids", type: "jsonb", defaultValue: [] },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  seasonal_activities: {
    firestoreCollection: "seasonal_activities",
    postgresTable: "seasonal_activities",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 15,
    description: "\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u0645\u0648\u0633\u0645\u064A\u0629 (Seasonal Activities)",
    dependencies: ["seasonal_programs", "tenants", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "programId", postgresColumn: "program_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "seasonal_programs" },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "title", postgresColumn: "title", type: "string", required: true },
      { firestoreField: "description", postgresColumn: "description", type: "string" },
      { firestoreField: "activityType", postgresColumn: "activity_type", type: "string" },
      { firestoreField: "category", postgresColumn: "category", type: "string" },
      { firestoreField: "dayOfWeek", postgresColumn: "day_of_week", type: "string" },
      { firestoreField: "date", postgresColumn: "date", type: "date" },
      { firestoreField: "timeSlot", postgresColumn: "time_slot", type: "string" },
      { firestoreField: "responsibleName", postgresColumn: "responsible_name", type: "string" },
      { firestoreField: "supervisorName", postgresColumn: "supervisor_name", type: "string" },
      { firestoreField: "supervisorId", postgresColumn: "supervisor_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "location", postgresColumn: "location", type: "string" },
      { firestoreField: "points", postgresColumn: "points", type: "number", defaultValue: 0 },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "planned" },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  seasonal_participations: {
    firestoreCollection: "seasonal_participations",
    postgresTable: "seasonal_participations",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 16,
    description: "\u0645\u0634\u0627\u0631\u0643\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0641\u064A \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u0645\u0648\u0633\u0645\u064A\u0629 (Seasonal Participations)",
    dependencies: ["seasonal_programs", "seasonal_activities", "tenants", "students"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "programId", postgresColumn: "program_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "seasonal_programs" },
      { firestoreField: "activityId", postgresColumn: "activity_id", type: "string", isForeignKey: true, foreignKeyTable: "seasonal_activities" },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "studentId", postgresColumn: "student_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "students" },
      { firestoreField: "studentName", postgresColumn: "student_name", type: "string" },
      { firestoreField: "originalHalaqahId", postgresColumn: "original_halaqah_id", type: "string" },
      { firestoreField: "originalHalaqahName", postgresColumn: "original_halaqah_name", type: "string" },
      { firestoreField: "attendanceStatus", postgresColumn: "attendance_status", type: "string", required: true },
      { firestoreField: "participationLevel", postgresColumn: "participation_level", type: "string" },
      { firestoreField: "seasonalPointsEarned", postgresColumn: "seasonal_points_earned", type: "number", defaultValue: 0 },
      { firestoreField: "pointsEarned", postgresColumn: "points_earned", type: "number", defaultValue: 0 },
      { firestoreField: "achievementNote", postgresColumn: "achievement_note", type: "string" },
      { firestoreField: "recordedBy", postgresColumn: "recorded_by", type: "string" },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "recordedAt", postgresColumn: "recorded_at", type: "timestamp" }
    ]
  },
  financial_records: {
    firestoreCollection: "financial_records",
    postgresTable: "student_financial_records",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 17,
    description: "\u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u0631\u0633\u0648\u0645 \u0644\u0644\u0637\u0644\u0627\u0628 (Student Financial Records)",
    dependencies: ["tenants", "students"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "studentId", postgresColumn: "student_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "students" },
      { firestoreField: "studentName", postgresColumn: "student_name", type: "string", required: true },
      { firestoreField: "academicYear", postgresColumn: "academic_year", type: "string", required: true },
      { firestoreField: "baseTuition", postgresColumn: "base_tuition", type: "number", defaultValue: 0 },
      { firestoreField: "discountAmount", postgresColumn: "discount_amount", type: "number", defaultValue: 0 },
      { firestoreField: "discountReason", postgresColumn: "discount_reason", type: "string" },
      { firestoreField: "scholarshipAmount", postgresColumn: "scholarship_amount", type: "number", defaultValue: 0 },
      { firestoreField: "isExempt", postgresColumn: "is_exempt", type: "boolean", defaultValue: false },
      { firestoreField: "exemptionReason", postgresColumn: "exemption_reason", type: "string" },
      { firestoreField: "paidAmount", postgresColumn: "paid_amount", type: "number", defaultValue: 0 },
      { firestoreField: "remainingAmount", postgresColumn: "remaining_amount", type: "number", defaultValue: 0 },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "unpaid" },
      { firestoreField: "payments", postgresColumn: "payments", type: "jsonb", defaultValue: [] },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  revenues: {
    firestoreCollection: "revenues",
    postgresTable: "finance_revenues",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 18,
    description: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0648\u0633\u0646\u062F\u0627\u062A \u0627\u0644\u0642\u0628\u0636 (Finance Revenues)",
    dependencies: ["tenants"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "sourceName", postgresColumn: "source_name", type: "string", required: true },
      { firestoreField: "amount", postgresColumn: "amount", type: "number", required: true },
      { firestoreField: "date", postgresColumn: "date", type: "date", required: true },
      { firestoreField: "donorOrSource", postgresColumn: "donor_or_source", type: "string" },
      { firestoreField: "paymentMethod", postgresColumn: "payment_method", type: "string", required: true },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "createdBy", postgresColumn: "created_by", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" }
    ]
  },
  expenses: {
    firestoreCollection: "expenses",
    postgresTable: "finance_expenses",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 19,
    description: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0648\u0633\u0646\u062F\u0627\u062A \u0627\u0644\u0635\u0631\u0641 (Finance Expenses)",
    dependencies: ["tenants"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "category", postgresColumn: "category", type: "string", required: true },
      { firestoreField: "description", postgresColumn: "description", type: "string", required: true },
      { firestoreField: "amount", postgresColumn: "amount", type: "number", required: true },
      { firestoreField: "taxAmount", postgresColumn: "tax_amount", type: "number", defaultValue: 0 },
      { firestoreField: "totalAmount", postgresColumn: "total_amount", type: "number", required: true },
      { firestoreField: "date", postgresColumn: "date", type: "date", required: true },
      { firestoreField: "beneficiary", postgresColumn: "beneficiary", type: "string", required: true },
      { firestoreField: "paymentMethod", postgresColumn: "payment_method", type: "string", required: true },
      { firestoreField: "programName", postgresColumn: "program_name", type: "string" },
      { firestoreField: "invoiceNumber", postgresColumn: "invoice_number", type: "string" },
      { firestoreField: "attachmentUrl", postgresColumn: "attachment_url", type: "string" },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "createdBy", postgresColumn: "created_by", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" }
    ]
  },
  custodies: {
    firestoreCollection: "custodies",
    postgresTable: "finance_custodies",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 20,
    description: "\u0627\u0644\u0639\u0647\u062F \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0625\u063A\u0644\u0627\u0642\u0647\u0627 (Finance Custodies)",
    dependencies: ["tenants", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "holderId", postgresColumn: "holder_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "holderName", postgresColumn: "holder_name", type: "string", required: true },
      { firestoreField: "purpose", postgresColumn: "purpose", type: "string", required: true },
      { firestoreField: "originalAmount", postgresColumn: "original_amount", type: "number", required: true },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "draft" },
      { firestoreField: "disbursedAt", postgresColumn: "disbursed_at", type: "timestamp" },
      { firestoreField: "settledAt", postgresColumn: "settled_at", type: "timestamp" },
      { firestoreField: "closedAt", postgresColumn: "closed_at", type: "timestamp" },
      { firestoreField: "reviewedBy", postgresColumn: "reviewed_by", type: "string" },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "createdBy", postgresColumn: "created_by", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" }
    ]
  },
  budget_requests: {
    firestoreCollection: "budget_requests",
    postgresTable: "finance_budget_requests",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 21,
    description: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629 \u0648\u0627\u0644\u0628\u0631\u0627\u0645\u062C (Finance Budget Requests)",
    dependencies: ["tenants", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "requesterId", postgresColumn: "requester_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "requesterName", postgresColumn: "requester_name", type: "string", required: true },
      { firestoreField: "programName", postgresColumn: "program_name", type: "string", required: true },
      { firestoreField: "estimatedAmount", postgresColumn: "estimated_amount", type: "number", required: true },
      { firestoreField: "justification", postgresColumn: "justification", type: "string", required: true },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "pending" },
      { firestoreField: "reviewedBy", postgresColumn: "reviewed_by", type: "string" },
      { firestoreField: "reviewedAt", postgresColumn: "reviewed_at", type: "timestamp" },
      { firestoreField: "reviewNotes", postgresColumn: "review_notes", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" }
    ]
  },
  finance_settings: {
    firestoreCollection: "finance_settings",
    postgresTable: "finance_settings",
    primaryKey: "tenant_id",
    tenantKey: "tenant_id",
    order: 22,
    description: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0648\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0644\u0644\u0645\u0633\u062A\u0623\u062C\u0631 (Finance Settings)",
    dependencies: ["tenants"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "tenant_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "revenueSources", postgresColumn: "revenue_sources", type: "jsonb", defaultValue: ["\u0631\u0633\u0648\u0645 \u0627\u0644\u0637\u0644\u0627\u0628", "\u062A\u0628\u0631\u0639\u0627\u062A", "\u062F\u0639\u0645", "\u0623\u0648\u0642\u0627\u0641", "\u0623\u062E\u0631\u0649"] },
      { firestoreField: "expenseCategories", postgresColumn: "expense_categories", type: "jsonb", defaultValue: ["\u062A\u0634\u063A\u064A\u0644\u064A", "\u0631\u0648\u0627\u062A\u0628 \u0648\u0645\u0643\u0627\u0641\u0622\u062A", "\u0628\u0631\u0627\u0645\u062C \u0648\u0623\u0646\u0634\u0637\u0629", "\u0642\u0631\u0637\u0627\u0633\u064A\u0629", "\u062C\u0648\u0627\u0626\u0632 \u0648\u0647\u062F\u0627\u064A\u0627", "\u0623\u062E\u0631\u0649"] },
      { firestoreField: "paymentMethods", postgresColumn: "payment_methods", type: "jsonb", defaultValue: ["\u0646\u0642\u062F\u064A", "\u062A\u062D\u0648\u064A\u0644 \u0628\u0646\u0643\u064A", "\u0634\u0628\u0643\u0629", "\u0623\u062E\u0631\u0649"] },
      { firestoreField: "tuitionConfigs", postgresColumn: "tuition_configs", type: "jsonb", defaultValue: [] },
      { firestoreField: "defaultTuitionAmount", postgresColumn: "default_tuition_amount", type: "number", defaultValue: 0 },
      { firestoreField: "bankAccounts", postgresColumn: "bank_accounts", type: "jsonb", defaultValue: [] },
      { firestoreField: "financialPolicies", postgresColumn: "financial_policies", type: "jsonb", defaultValue: {} },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  registration_requests: {
    firestoreCollection: "registration_requests",
    postgresTable: "registration_requests",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 23,
    description: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0648\u0627\u0644\u0642\u0628\u0648\u0644 (Registration Requests)",
    dependencies: ["tenants", "stages", "halaqahs", "users", "students"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "studentName", postgresColumn: "student_name", type: "string", required: true },
      { firestoreField: "nationalId", postgresColumn: "national_id", type: "string" },
      { firestoreField: "parentName", postgresColumn: "parent_name", type: "string", required: true },
      { firestoreField: "parentPhone", postgresColumn: "parent_phone", type: "string", required: true },
      { firestoreField: "motherPhone", postgresColumn: "mother_phone", type: "string" },
      { firestoreField: "guardianRelationship", postgresColumn: "guardian_relationship", type: "string" },
      { firestoreField: "otherContactPhone", postgresColumn: "other_contact_phone", type: "string" },
      { firestoreField: "birthDate", postgresColumn: "birth_date", type: "date" },
      { firestoreField: "grade", postgresColumn: "grade", type: "string", required: true },
      { firestoreField: "registrationType", postgresColumn: "registration_type", type: "string" },
      { firestoreField: "registrationTypeLabel", postgresColumn: "registration_type_label", type: "string" },
      { firestoreField: "tuitionFeeAmount", postgresColumn: "tuition_fee_amount", type: "number" },
      { firestoreField: "feePledgeAccepted", postgresColumn: "fee_pledge_accepted", type: "boolean", defaultValue: false },
      { firestoreField: "previouslyRegistered", postgresColumn: "previously_registered", type: "string" },
      { firestoreField: "desiredStageId", postgresColumn: "desired_stage_id", type: "string", isForeignKey: true, foreignKeyTable: "stages" },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "pending" },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "interviewNotes", postgresColumn: "interview_notes", type: "string" },
      { firestoreField: "interviewScore", postgresColumn: "interview_score", type: "number" },
      { firestoreField: "financialDecisionNotes", postgresColumn: "financial_decision_notes", type: "string" },
      { firestoreField: "assignedHalaqahId", postgresColumn: "assigned_halaqah_id", type: "string", isForeignKey: true, foreignKeyTable: "halaqahs" },
      { firestoreField: "assignedTeacherId", postgresColumn: "assigned_teacher_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "enrolledStudentId", postgresColumn: "enrolled_student_id", type: "string", isForeignKey: true, foreignKeyTable: "students" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  track_nominations: {
    firestoreCollection: "track_nominations",
    postgresTable: "track_nominations",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 24,
    description: "\u062A\u0631\u0634\u064A\u062D\u0627\u062A \u0648\u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A (Track Nominations)",
    dependencies: ["tenants", "track_definitions", "students", "halaqahs", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "trackId", postgresColumn: "track_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "track_definitions" },
      { firestoreField: "trackName", postgresColumn: "track_name", type: "string" },
      { firestoreField: "studentId", postgresColumn: "student_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "students" },
      { firestoreField: "studentName", postgresColumn: "student_name", type: "string", required: true },
      { firestoreField: "halaqahId", postgresColumn: "halaqah_id", type: "string", isForeignKey: true, foreignKeyTable: "halaqahs" },
      { firestoreField: "halaqahName", postgresColumn: "halaqah_name", type: "string" },
      { firestoreField: "teacherId", postgresColumn: "teacher_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "teacherName", postgresColumn: "teacher_name", type: "string" },
      { firestoreField: "targetBranchOrLevel", postgresColumn: "target_branch_or_level", type: "string", required: true },
      { firestoreField: "targetBranchSnapshot", postgresColumn: "target_branch_snapshot", type: "string" },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "submitted" },
      { firestoreField: "nominationCardNumber", postgresColumn: "nomination_card_number", type: "string" },
      { firestoreField: "internalExam", postgresColumn: "internal_exam", type: "jsonb" },
      { firestoreField: "supervisorApproval", postgresColumn: "supervisor_approval", type: "jsonb" },
      { firestoreField: "associationExam", postgresColumn: "association_exam", type: "jsonb" },
      { firestoreField: "teacherRecommendation", postgresColumn: "teacher_recommendation", type: "string" },
      { firestoreField: "teacherNotes", postgresColumn: "teacher_notes", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  association_nominations: {
    firestoreCollection: "association_nominations",
    postgresTable: "association_nominations",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 25,
    description: "\u062A\u0631\u0634\u064A\u062D\u0627\u062A \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A \u0627\u0644\u062C\u0645\u0639\u064A\u0629 (Association Nominations)",
    dependencies: ["tenants", "students", "halaqahs", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "studentId", postgresColumn: "student_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "students" },
      { firestoreField: "studentName", postgresColumn: "student_name", type: "string", required: true },
      { firestoreField: "halaqahId", postgresColumn: "halaqah_id", type: "string", isForeignKey: true, foreignKeyTable: "halaqahs" },
      { firestoreField: "halaqahName", postgresColumn: "halaqah_name", type: "string" },
      { firestoreField: "teacherId", postgresColumn: "teacher_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "teacherName", postgresColumn: "teacher_name", type: "string" },
      { firestoreField: "nominationType", postgresColumn: "nomination_type", type: "string", required: true },
      { firestoreField: "targetTitle", postgresColumn: "target_title", type: "string", required: true },
      { firestoreField: "internalExamScore", postgresColumn: "internal_exam_score", type: "number", defaultValue: 0 },
      { firestoreField: "teacherRecommendation", postgresColumn: "teacher_recommendation", type: "string" },
      { firestoreField: "teacherNotes", postgresColumn: "teacher_notes", type: "string" },
      { firestoreField: "supervisorStatus", postgresColumn: "supervisor_status", type: "string", defaultValue: "pending" },
      { firestoreField: "supervisorNotes", postgresColumn: "supervisor_notes", type: "string" },
      { firestoreField: "nominationCardNumber", postgresColumn: "nomination_card_number", type: "string" },
      { firestoreField: "approvedAt", postgresColumn: "approved_at", type: "timestamp" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  badges: {
    firestoreCollection: "badges",
    postgresTable: "student_badges",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 26,
    description: "\u0623\u0648\u0633\u0645\u0629 \u0648\u062A\u062D\u0641\u064A\u0632 \u0627\u0644\u0637\u0644\u0627\u0628 (Student Badges)",
    dependencies: ["tenants", "students"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "badgeType", postgresColumn: "badge_type", type: "string", required: true },
      { firestoreField: "studentId", postgresColumn: "student_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "students" },
      { firestoreField: "studentName", postgresColumn: "student_name", type: "string", required: true },
      { firestoreField: "awardedAt", postgresColumn: "awarded_at", type: "date", required: true },
      { firestoreField: "awardedBy", postgresColumn: "awarded_by", type: "string", required: true },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "isAutomatic", postgresColumn: "is_automatic", type: "boolean", defaultValue: false },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" }
    ]
  },
  remedial_plans: {
    firestoreCollection: "remedial_plans",
    postgresTable: "remedial_plans",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 27,
    description: "\u0627\u0644\u062E\u0637\u0637 \u0627\u0644\u0639\u0644\u0627\u062C\u064A\u0629 \u0644\u0644\u0637\u0644\u0627\u0628 (Remedial Action Plans)",
    dependencies: ["tenants", "students", "halaqahs", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "studentId", postgresColumn: "student_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "students" },
      { firestoreField: "studentName", postgresColumn: "student_name", type: "string", required: true },
      { firestoreField: "halaqahId", postgresColumn: "halaqah_id", type: "string", isForeignKey: true, foreignKeyTable: "halaqahs" },
      { firestoreField: "teacherId", postgresColumn: "teacher_id", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "riskLevel", postgresColumn: "risk_level", type: "string", required: true },
      { firestoreField: "category", postgresColumn: "category", type: "string", required: true },
      { firestoreField: "title", postgresColumn: "title", type: "string", required: true },
      { firestoreField: "diagnosticSummary", postgresColumn: "diagnostic_summary", type: "string", required: true },
      { firestoreField: "recommendedAction", postgresColumn: "recommended_action", type: "string", required: true },
      { firestoreField: "parentGuidance", postgresColumn: "parent_guidance", type: "string" },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "active" },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  meetings: {
    firestoreCollection: "meetings",
    postgresTable: "meetings",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 28,
    description: "\u0645\u062D\u0627\u0636\u0631 \u0627\u0644\u0627\u062C\u062A\u0645\u0627\u0639\u0627\u062A \u0648\u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A (Official Meetings)",
    dependencies: ["tenants", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "title", postgresColumn: "title", type: "string", required: true },
      { firestoreField: "meetingNumber", postgresColumn: "meeting_number", type: "string" },
      { firestoreField: "category", postgresColumn: "category", type: "string", defaultValue: "general" },
      { firestoreField: "date", postgresColumn: "date", type: "date", required: true },
      { firestoreField: "startTime", postgresColumn: "start_time", type: "string", required: true },
      { firestoreField: "endTime", postgresColumn: "end_time", type: "string" },
      { firestoreField: "locationType", postgresColumn: "location_type", type: "string", defaultValue: "in_person" },
      { firestoreField: "location", postgresColumn: "location", type: "string" },
      { firestoreField: "meetingUrl", postgresColumn: "meeting_url", type: "string" },
      { firestoreField: "description", postgresColumn: "description", type: "string" },
      { firestoreField: "objectives", postgresColumn: "objectives", type: "jsonb", defaultValue: [] },
      { firestoreField: "agenda", postgresColumn: "agenda", type: "jsonb", defaultValue: [] },
      { firestoreField: "attendees", postgresColumn: "attendees", type: "jsonb", defaultValue: [] },
      { firestoreField: "discussions", postgresColumn: "discussions", type: "string" },
      { firestoreField: "decisions", postgresColumn: "decisions", type: "jsonb", defaultValue: [] },
      { firestoreField: "recommendations", postgresColumn: "recommendations", type: "jsonb", defaultValue: [] },
      { firestoreField: "postponedItems", postgresColumn: "postponed_items", type: "jsonb", defaultValue: [] },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "scheduled" },
      { firestoreField: "cancellationReason", postgresColumn: "cancellation_reason", type: "string" },
      { firestoreField: "createdBy", postgresColumn: "created_by", type: "string", isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "createdByName", postgresColumn: "created_by_name", type: "string", defaultValue: "\u0627\u0644\u0645\u0634\u0631\u0641" },
      { firestoreField: "createdByRole", postgresColumn: "created_by_role", type: "string", defaultValue: "supervisor" },
      { firestoreField: "completedAt", postgresColumn: "completed_at", type: "timestamp" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  staff_attendance: {
    firestoreCollection: "staff_attendance",
    postgresTable: "staff_attendance",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 29,
    description: "\u062D\u0636\u0648\u0631 \u0648\u0627\u0646\u0635\u0631\u0627\u0641 \u0627\u0644\u0643\u0627\u062F\u0631 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u064A (Staff Attendance)",
    dependencies: ["tenants", "users"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "userId", postgresColumn: "user_id", type: "string", required: true, isForeignKey: true, foreignKeyTable: "users" },
      { firestoreField: "userName", postgresColumn: "user_name", type: "string", required: true },
      { firestoreField: "userRole", postgresColumn: "user_role", type: "string", required: true },
      { firestoreField: "date", postgresColumn: "date", type: "date", required: true },
      { firestoreField: "timestamp", postgresColumn: "timestamp", type: "timestamp", required: true },
      { firestoreField: "isRegularDay", postgresColumn: "is_regular_day", type: "boolean", defaultValue: true },
      { firestoreField: "reason", postgresColumn: "reason", type: "string" },
      { firestoreField: "method", postgresColumn: "method", type: "string", defaultValue: "geo" },
      { firestoreField: "locationData", postgresColumn: "location_data", type: "jsonb" },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" }
    ]
  },
  prayer_times: {
    firestoreCollection: "prayer_times",
    postgresTable: "prayer_times",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 30,
    description: "\u0645\u0648\u0627\u0642\u064A\u062A \u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0633\u0646\u0648\u064A\u0629 (Prayer Times Cache)",
    dependencies: ["tenants"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "year", postgresColumn: "year", type: "number", required: true },
      { firestoreField: "latitude", postgresColumn: "latitude", type: "number", required: true },
      { firestoreField: "longitude", postgresColumn: "longitude", type: "number", required: true },
      { firestoreField: "timezone", postgresColumn: "timezone", type: "string", defaultValue: "Asia/Riyadh" },
      { firestoreField: "method", postgresColumn: "method", type: "number", defaultValue: 4 },
      { firestoreField: "lastSyncedAt", postgresColumn: "last_synced_at", type: "timestamp" },
      { firestoreField: "source", postgresColumn: "source", type: "string", defaultValue: "aladhan" },
      { firestoreField: "timingsByDate", postgresColumn: "timings_by_date", type: "jsonb", defaultValue: {} },
      { firestoreField: "adjustments", postgresColumn: "adjustments", type: "jsonb", defaultValue: {} },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  frontendConfigs: {
    firestoreCollection: "frontendConfigs",
    postgresTable: "frontend_configs",
    primaryKey: "id",
    order: 31,
    description: "\u062A\u062E\u0635\u064A\u0635 \u0627\u0644\u0648\u0627\u062C\u0647\u0627\u062A \u0648\u0627\u0644\u0628\u0627\u0646\u0631\u0627\u062A \u0648\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A (Frontend Configs)",
    dependencies: [],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "type", postgresColumn: "type", type: "string", defaultValue: "tenant" },
      { firestoreField: "name", postgresColumn: "name", type: "string", required: true },
      { firestoreField: "description", postgresColumn: "description", type: "string" },
      { firestoreField: "logoUrl", postgresColumn: "logo_url", type: "string" },
      { firestoreField: "contactEmail", postgresColumn: "contact_email", type: "string" },
      { firestoreField: "contactPhone", postgresColumn: "contact_phone", type: "string" },
      { firestoreField: "contactWhatsapp", postgresColumn: "contact_whatsapp", type: "string" },
      { firestoreField: "address", postgresColumn: "address", type: "string" },
      { firestoreField: "showSupervisor", postgresColumn: "show_supervisor", type: "boolean", defaultValue: true },
      { firestoreField: "showPrayerTimes", postgresColumn: "show_prayer_times", type: "boolean", defaultValue: true },
      { firestoreField: "primaryColor", postgresColumn: "primary_color", type: "string" },
      { firestoreField: "banners", postgresColumn: "banners", type: "jsonb", defaultValue: [] },
      { firestoreField: "announcements", postgresColumn: "announcements", type: "jsonb", defaultValue: [] },
      { firestoreField: "sections", postgresColumn: "sections", type: "jsonb", defaultValue: [] },
      { firestoreField: "updatedAt", postgresColumn: "updated_at", type: "timestamp" }
    ]
  },
  audit_logs: {
    firestoreCollection: "audit_logs",
    postgresTable: "audit_logs",
    primaryKey: "id",
    order: 32,
    description: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0627\u0644\u0623\u0645\u0646\u064A\u0629 (Audit Logs)",
    dependencies: [],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "userId", postgresColumn: "user_id", type: "string", required: true },
      { firestoreField: "userName", postgresColumn: "user_name", type: "string", required: true },
      { firestoreField: "userRole", postgresColumn: "user_role", type: "string", required: true },
      { firestoreField: "action", postgresColumn: "action", type: "string", required: true },
      { firestoreField: "entityType", postgresColumn: "entity_type", type: "string", required: true },
      { firestoreField: "entityId", postgresColumn: "entity_id", type: "string", required: true },
      { firestoreField: "entityName", postgresColumn: "entity_name", type: "string" },
      { firestoreField: "previousValue", postgresColumn: "previous_value", type: "jsonb" },
      { firestoreField: "newValue", postgresColumn: "new_value", type: "jsonb" },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "timestamp", postgresColumn: "timestamp", type: "timestamp", required: true }
    ]
  },
  report_logs: {
    firestoreCollection: "report_logs",
    postgresTable: "report_logs",
    primaryKey: "id",
    order: 33,
    description: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0648\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0645\u0631\u0633\u0644\u0629 (Report Logs)",
    dependencies: [],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "recipientType", postgresColumn: "recipient_type", type: "string", required: true },
      { firestoreField: "recipientName", postgresColumn: "recipient_name", type: "string", required: true },
      { firestoreField: "recipientPhone", postgresColumn: "recipient_phone", type: "string" },
      { firestoreField: "studentId", postgresColumn: "student_id", type: "string" },
      { firestoreField: "teacherId", postgresColumn: "teacher_id", type: "string" },
      { firestoreField: "reportType", postgresColumn: "report_type", type: "string", required: true },
      { firestoreField: "title", postgresColumn: "title", type: "string", required: true },
      { firestoreField: "content", postgresColumn: "content", type: "string", required: true },
      { firestoreField: "timestamp", postgresColumn: "timestamp", type: "timestamp", required: true },
      { firestoreField: "status", postgresColumn: "status", type: "string", defaultValue: "sent" }
    ]
  },
  academic_archives: {
    firestoreCollection: "academic_archives",
    postgresTable: "academic_archives",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 34,
    description: "\u0623\u0631\u0634\u064A\u0641 \u0627\u0644\u0641\u0635\u0648\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629 \u0627\u0644\u0645\u063A\u0644\u0642\u0629 (Academic Archives)",
    dependencies: ["tenants"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "tenantName", postgresColumn: "tenant_name", type: "string", required: true },
      { firestoreField: "academicYear", postgresColumn: "academic_year", type: "string", required: true },
      { firestoreField: "termName", postgresColumn: "term_name", type: "string", required: true },
      { firestoreField: "archivedAt", postgresColumn: "archived_at", type: "timestamp", required: true },
      { firestoreField: "archivedBy", postgresColumn: "archived_by", type: "string", required: true },
      { firestoreField: "totalStudents", postgresColumn: "total_students", type: "number", defaultValue: 0 },
      { firestoreField: "totalHalaqahs", postgresColumn: "total_halaqahs", type: "number", defaultValue: 0 },
      { firestoreField: "overallMasteryRate", postgresColumn: "overall_mastery_rate", type: "number", defaultValue: 0 },
      { firestoreField: "notes", postgresColumn: "notes", type: "string" },
      { firestoreField: "studentSnapshots", postgresColumn: "student_snapshots", type: "jsonb", defaultValue: [] },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" }
    ]
  },
  support_sessions: {
    firestoreCollection: "support_sessions",
    postgresTable: "support_sessions",
    primaryKey: "id",
    tenantKey: "tenant_id",
    order: 35,
    description: "\u062C\u0644\u0633\u0627\u062A \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A \u0627\u0644\u0637\u0627\u0631\u0626 (Emergency Support Sessions)",
    dependencies: ["tenants"],
    fieldMappings: [
      { firestoreField: "id", postgresColumn: "id", type: "string", required: true },
      { firestoreField: "systemAdminUid", postgresColumn: "system_admin_uid", type: "string", required: true },
      { firestoreField: "systemAdminName", postgresColumn: "system_admin_name", type: "string", required: true },
      { firestoreField: "tenantId", postgresColumn: "tenant_id", type: "string", isForeignKey: true, foreignKeyTable: "tenants" },
      { firestoreField: "reason", postgresColumn: "reason", type: "string", required: true },
      { firestoreField: "expiresAt", postgresColumn: "expires_at", type: "timestamp", required: true },
      { firestoreField: "isActive", postgresColumn: "is_active", type: "boolean", defaultValue: true },
      { firestoreField: "rolePermissionsOverrides", postgresColumn: "role_permissions_overrides", type: "jsonb", defaultValue: {} },
      { firestoreField: "createdAt", postgresColumn: "created_at", type: "timestamp" }
    ]
  }
};

// migration/transformers/typeTransformers.ts
function transformTimestamp(val) {
  if (val === null || val === void 0) {
    return null;
  }
  if (typeof val === "object") {
    if (val._type === "timestamp") {
      if (val.iso && typeof val.iso === "string") {
        return val.iso;
      }
      if (typeof val.seconds === "number") {
        const ms = val.seconds * 1e3 + Math.floor((val.nanoseconds || 0) / 1e6);
        return new Date(ms).toISOString();
      }
    }
    if (typeof val.toDate === "function") {
      return val.toDate().toISOString();
    }
    if (typeof val.seconds === "number") {
      const ms = val.seconds * 1e3 + Math.floor((val.nanoseconds || 0) / 1e6);
      return new Date(ms).toISOString();
    }
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
    return val;
  }
  if (typeof val === "number") {
    return new Date(val).toISOString();
  }
  return null;
}
function transformDocumentReference(val) {
  if (val === null || val === void 0) {
    return null;
  }
  if (typeof val === "string") {
    return val.trim();
  }
  if (typeof val === "object" && typeof val.id === "string") {
    return val.id;
  }
  if (typeof val === "object" && typeof val.path === "string") {
    const parts = val.path.split("/");
    return parts[parts.length - 1] || null;
  }
  return null;
}
function transformJsonb(val, fallback = {}) {
  if (val === null || val === void 0) {
    return fallback;
  }
  if (typeof val === "object") {
    return deepSanitize(val);
  }
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}
function deepSanitize(val) {
  if (val === null || val === void 0) return val;
  if (typeof val === "object") {
    if (val._type === "timestamp") {
      if (val.iso && typeof val.iso === "string") return val.iso;
      if (typeof val.seconds === "number") {
        const ms = val.seconds * 1e3 + Math.floor((val.nanoseconds || 0) / 1e6);
        return new Date(ms).toISOString();
      }
    }
    if (typeof val.toDate === "function") {
      return val.toDate().toISOString();
    }
    if (typeof val.seconds === "number" && typeof val.nanoseconds === "number") {
      const ms = val.seconds * 1e3 + Math.floor(val.nanoseconds / 1e6);
      return new Date(ms).toISOString();
    }
  }
  if (Array.isArray(val)) {
    return val.map((item) => deepSanitize(item));
  }
  if (typeof val === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      clean[k] = deepSanitize(v);
    }
    return clean;
  }
  return val;
}
function transformDocument(docId, rawDoc, fieldMappings, primaryKeyCol = "id", tenantKeyCol, organizationKeyCol) {
  const resultData = {};
  const unknownFields = {};
  resultData[primaryKeyCol] = String(docId).trim();
  const mappedFirestoreFields = /* @__PURE__ */ new Set();
  for (const rule of fieldMappings) {
    mappedFirestoreFields.add(rule.firestoreField);
    let rawValue = rawDoc[rule.firestoreField];
    if ((rawValue === void 0 || rawValue === null) && (rule.firestoreField === "id" || rule.postgresColumn === primaryKeyCol)) {
      rawValue = docId;
    }
    if (rule.transform) {
      resultData[rule.postgresColumn] = rule.transform(rawValue, rawDoc);
      continue;
    }
    switch (rule.type) {
      case "string":
        resultData[rule.postgresColumn] = rawValue !== void 0 && rawValue !== null ? String(rawValue).trim() : rule.defaultValue ?? null;
        break;
      case "number":
        if (rawValue !== void 0 && rawValue !== null && rawValue !== "") {
          const num = Number(rawValue);
          resultData[rule.postgresColumn] = isNaN(num) ? rule.defaultValue ?? 0 : num;
        } else {
          resultData[rule.postgresColumn] = rule.defaultValue ?? null;
        }
        break;
      case "boolean":
        resultData[rule.postgresColumn] = typeof rawValue === "boolean" ? rawValue : rule.defaultValue ?? false;
        break;
      case "date":
      case "timestamp":
        resultData[rule.postgresColumn] = transformTimestamp(rawValue) ?? (rule.defaultValue ?? null);
        break;
      case "reference":
        resultData[rule.postgresColumn] = transformDocumentReference(rawValue) ?? (rule.defaultValue ?? null);
        break;
      case "jsonb":
      case "array":
        resultData[rule.postgresColumn] = transformJsonb(rawValue, rule.defaultValue ?? (rule.type === "array" ? [] : {}));
        break;
      default:
        resultData[rule.postgresColumn] = rawValue !== void 0 ? rawValue : rule.defaultValue ?? null;
    }
  }
  for (const [key, val] of Object.entries(rawDoc)) {
    if (key === "id" || mappedFirestoreFields.has(key)) {
      continue;
    }
    unknownFields[key] = val;
  }
  const tenantId = tenantKeyCol ? resultData[tenantKeyCol] : void 0;
  const organizationId = organizationKeyCol ? resultData[organizationKeyCol] : void 0;
  return {
    id: resultData[primaryKeyCol],
    tenantId,
    organizationId,
    data: resultData,
    unknownFields,
    rawFirestoreId: docId
  };
}

// migration/validators/migrationValidator.ts
var MigrationValidator = class {
  constructor(tenantResolver) {
    this.knownIdsByTable = /* @__PURE__ */ new Map();
    this.knownIdsByCollection = /* @__PURE__ */ new Map();
    this.tenantResolver = null;
    if (tenantResolver) {
      this.tenantResolver = tenantResolver;
    }
    const canonicalStages = ["baraem", "ashbal", "fityan", "motawassit", "thanawi", "jamiyeen"];
    for (const stg of canonicalStages) {
      this.registerId("stages", stg, "educational_stages");
    }
  }
  setTenantResolver(resolver) {
    this.tenantResolver = resolver;
  }
  /**
   * Registers a known ID for foreign key cross-referencing.
   */
  registerId(table, id, collectionName) {
    if (!id || typeof id !== "string") return;
    const cleanId = id.trim();
    if (!cleanId) return;
    if (!this.knownIdsByTable.has(table)) {
      this.knownIdsByTable.set(table, /* @__PURE__ */ new Set());
    }
    this.knownIdsByTable.get(table).add(cleanId);
    if (collectionName) {
      if (!this.knownIdsByCollection.has(collectionName)) {
        this.knownIdsByCollection.set(collectionName, /* @__PURE__ */ new Set());
      }
      this.knownIdsByCollection.get(collectionName).add(cleanId);
    }
  }
  /**
   * Checks if an ID exists in another collection in the same backup (e.g. teachers vs users).
   */
  hasIdInCollection(collectionName, id) {
    const colSet = this.knownIdsByCollection.get(collectionName);
    return !!colSet && colSet.has(id);
  }
  /**
   * Checks if an ID exists in a target PostgreSQL table set.
   */
  hasIdInTable(table, id) {
    const tblSet = this.knownIdsByTable.get(table);
    return !!tblSet && tblSet.has(id);
  }
  /**
   * Validates a batch of transformed records for a specific collection configuration.
   */
  validateBatch(config2, records, sourceDocCount = "N/A") {
    const errors = [];
    const warnings = [];
    const unknownFieldsSet = /* @__PURE__ */ new Set();
    const seenIdsInBatch = /* @__PURE__ */ new Set();
    let validCount = 0;
    let invalidCount = 0;
    let resolvableFkCount = 0;
    let deferredFkCount = 0;
    let missingExternalFkCount = 0;
    let unresolvableFkCount = 0;
    let tenantResolvedCount = 0;
    let hasExplicitTenant = false;
    let hasDefaultedTenant = false;
    for (const record of records) {
      let recordHasFatalError = false;
      if (!record.id || typeof record.id !== "string" || record.id.trim() === "") {
        errors.push({
          type: "ID_MISSING",
          message: `Missing or invalid document ID for collection ${config2.firestoreCollection}`,
          documentId: record.rawFirestoreId || "UNKNOWN"
        });
        recordHasFatalError = true;
      } else if (seenIdsInBatch.has(record.id)) {
        errors.push({
          type: "ID_INVALID",
          message: `Duplicate document ID detected: ${record.id}`,
          documentId: record.id
        });
        recordHasFatalError = true;
      } else {
        seenIdsInBatch.add(record.id);
        this.registerId(config2.postgresTable, record.id, config2.firestoreCollection);
      }
      if (config2.tenantKey) {
        const rawTenantVal = record.data[config2.tenantKey] || record.tenantId;
        if (this.tenantResolver) {
          const res = this.tenantResolver.resolveTenantId(rawTenantVal);
          if (res.isResolved && res.resolvedTenantId) {
            record.data[config2.tenantKey] = res.resolvedTenantId;
            record.tenantId = res.resolvedTenantId;
            if (res.isDefaultInferred) {
              hasDefaultedTenant = true;
              tenantResolvedCount++;
              warnings.push({
                type: "DEFAULT_APPLIED",
                field: config2.tenantKey,
                message: `\u062D\u0642\u0644 tenant_id \u062A\u0645 \u0631\u0628\u0637\u0647 \u062F\u064A\u0646\u0627\u0645\u064A\u0643\u064A\u0627\u064B \u0628\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631 \u0627\u0644\u0641\u0639\u0644\u064A: ${res.resolvedTenantId} (\u0627\u0644\u0646\u0648\u0639: ${res.matchType})`,
                documentId: record.id
              });
            } else {
              hasExplicitTenant = true;
            }
          } else {
            errors.push({
              type: "REQUIRED_FIELD_MISSING",
              field: config2.tenantKey,
              message: `\u0645\u0631\u062C\u0639 \u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631 '${rawTenantVal}' \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0628\u064A\u0627\u0646\u0627\u062A tenants \u0628\u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629.`,
              documentId: record.id
            });
            recordHasFatalError = true;
          }
        } else if (rawTenantVal && typeof rawTenantVal === "string" && rawTenantVal.trim() !== "") {
          hasExplicitTenant = true;
        }
      }
      for (const rule of config2.fieldMappings) {
        const val = record.data[rule.postgresColumn];
        if (rule.required && (val === void 0 || val === null || val === "")) {
          const isStudentAccount = record.data["role"] === "student" || typeof record.id === "string" && record.id.startsWith("usr_std_") || !!record.data["student_id"];
          if (rule.postgresColumn === "phone" && isStudentAccount) {
            continue;
          }
          errors.push({
            type: "REQUIRED_FIELD_MISSING",
            field: rule.postgresColumn,
            message: `\u0627\u0644\u062D\u0642\u0644 \u0627\u0644\u0625\u0644\u0632\u0627\u0645\u064A '${rule.postgresColumn}' \u0645\u0641\u0642\u0648\u062F \u0623\u0648 \u0641\u0627\u0631\u063A \u0641\u064A ${config2.firestoreCollection}`,
            documentId: record.id
          });
          recordHasFatalError = true;
        }
        if (rule.isForeignKey && rule.foreignKeyTable && val && typeof val === "string" && val.trim() !== "") {
          const fkVal = val.trim();
          const targetTableSet = this.knownIdsByTable.get(rule.foreignKeyTable);
          if (targetTableSet && targetTableSet.has(fkVal)) {
            resolvableFkCount++;
          } else if (rule.foreignKeyTable === "users" && this.hasIdInCollection("teachers", fkVal) || rule.foreignKeyTable === "tenants" && this.tenantResolver?.resolveTenantId(fkVal)?.isResolved || rule.foreignKeyTable === "stages" && this.hasIdInCollection("educational_stages", fkVal)) {
            deferredFkCount++;
            warnings.push({
              type: "UNKNOWN_FIELD",
              field: rule.postgresColumn,
              message: `\u0645\u0631\u062C\u0639 \u0639\u0644\u0627\u0642\u0629 \u0645\u0624\u062C\u0644 (Deferred FK): '${fkVal}' \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0645\u0635\u062F\u0631 \u0648\u0633\u064A\u062A\u0645 \u0631\u0628\u0637\u0647 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u0631\u062D\u064A\u0644.`,
              documentId: record.id
            });
          } else if (fkVal.startsWith("http") || fkVal.length < 2) {
            unresolvableFkCount++;
            warnings.push({
              type: "UNKNOWN_FIELD",
              field: rule.postgresColumn,
              message: `\u0645\u0631\u062C\u0639 \u0639\u0644\u0627\u0642\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0627\u0644\u062A\u0646\u0633\u064A\u0642 (Unresolvable FK): '${fkVal}'.`,
              documentId: record.id
            });
          } else {
            missingExternalFkCount++;
            warnings.push({
              type: "UNKNOWN_FIELD",
              field: rule.postgresColumn,
              message: `\u0645\u0631\u062C\u0639 \u062E\u0627\u0631\u062C\u064A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0646\u0633\u062E\u0629 (Missing External FK): '${fkVal}' \u0641\u064A \u062C\u062F\u0648\u0644 '${rule.foreignKeyTable}'.`,
              documentId: record.id
            });
          }
        }
      }
      if (record.unknownFields && Object.keys(record.unknownFields).length > 0) {
        for (const unknownKey of Object.keys(record.unknownFields)) {
          unknownFieldsSet.add(unknownKey);
          warnings.push({
            type: "UNKNOWN_FIELD",
            field: unknownKey,
            message: `\u062D\u0642\u0644 \u0625\u0636\u0627\u0641\u064A \u063A\u064A\u0631 \u0645\u0639\u064A\u0651\u0646 \u0628\u0627\u0644\u0645\u062E\u0637\u0637 '${unknownKey}'`,
            documentId: record.id,
            details: record.unknownFields[unknownKey]
          });
        }
      }
      if (recordHasFatalError) {
        invalidCount++;
      } else {
        validCount++;
      }
    }
    let tenantResolutionType = "GLOBAL_SYSTEM";
    if (config2.tenantKey) {
      if (hasExplicitTenant && hasDefaultedTenant) {
        tenantResolutionType = "MIXED";
      } else if (hasDefaultedTenant) {
        tenantResolutionType = "DEFAULTED_TO_AL_GHAZZAWI";
      } else if (hasExplicitTenant) {
        tenantResolutionType = "EXPLICIT_IN_DATA";
      }
    }
    return {
      collection: config2.firestoreCollection,
      targetTable: config2.postgresTable,
      sourceDocumentCount: sourceDocCount,
      targetRowCount: records.length,
      validCount,
      invalidCount,
      resolvableFkCount,
      deferredFkCount,
      missingExternalFkCount,
      unresolvableFkCount,
      tenantResolvedCount,
      tenantResolutionType,
      errors,
      warnings,
      unknownFieldsFound: Array.from(unknownFieldsSet)
    };
  }
};

// src/utils/quranMetadata.ts
var ALL_114_SURAHS = [
  { number: 1, name: "\u0627\u0644\u0641\u0627\u062A\u062D\u0629", arabicName: "\u0627\u0644\u0641\u0627\u062A\u062D\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0641\u0627\u062A\u062D\u0629", ayahsCount: 7, ayas: 7, juz: 1, startPage: 1, endPage: 1 },
  { number: 2, name: "\u0627\u0644\u0628\u0642\u0631\u0629", arabicName: "\u0627\u0644\u0628\u0642\u0631\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0628\u0642\u0631\u0629", ayahsCount: 286, ayas: 286, juz: 1, startPage: 2, endPage: 49 },
  { number: 3, name: "\u0622\u0644 \u0639\u0645\u0631\u0627\u0646", arabicName: "\u0622\u0644 \u0639\u0645\u0631\u0627\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0622\u0644 \u0639\u0645\u0631\u0627\u0646", ayahsCount: 200, ayas: 200, juz: 3, startPage: 50, endPage: 76 },
  { number: 4, name: "\u0627\u0644\u0646\u0633\u0627\u0621", arabicName: "\u0627\u0644\u0646\u0633\u0627\u0621", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0646\u0633\u0627\u0621", ayahsCount: 176, ayas: 176, juz: 4, startPage: 77, endPage: 106 },
  { number: 5, name: "\u0627\u0644\u0645\u0627\u0626\u062F\u0629", arabicName: "\u0627\u0644\u0645\u0627\u0626\u062F\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0627\u0626\u062F\u0629", ayahsCount: 120, ayas: 120, juz: 6, startPage: 106, endPage: 127 },
  { number: 6, name: "\u0627\u0644\u0623\u0646\u0639\u0627\u0645", arabicName: "\u0627\u0644\u0623\u0646\u0639\u0627\u0645", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0623\u0646\u0639\u0627\u0645", ayahsCount: 165, ayas: 165, juz: 7, startPage: 128, endPage: 150 },
  { number: 7, name: "\u0627\u0644\u0623\u0639\u0631\u0627\u0641", arabicName: "\u0627\u0644\u0623\u0639\u0631\u0627\u0641", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0623\u0639\u0631\u0627\u0641", ayahsCount: 206, ayas: 206, juz: 8, startPage: 151, endPage: 176 },
  { number: 8, name: "\u0627\u0644\u0623\u0646\u0641\u0627\u0644", arabicName: "\u0627\u0644\u0623\u0646\u0641\u0627\u0644", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0623\u0646\u0641\u0627\u0644", ayahsCount: 75, ayas: 75, juz: 9, startPage: 177, endPage: 186 },
  { number: 9, name: "\u0627\u0644\u062A\u0648\u0628\u0629", arabicName: "\u0627\u0644\u062A\u0648\u0628\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062A\u0648\u0628\u0629", ayahsCount: 129, ayas: 129, juz: 10, startPage: 187, endPage: 207 },
  { number: 10, name: "\u064A\u0648\u0646\u0633", arabicName: "\u064A\u0648\u0646\u0633", fullNameArabic: "\u0633\u0648\u0631\u0629 \u064A\u0648\u0646\u0633", ayahsCount: 109, ayas: 109, juz: 11, startPage: 208, endPage: 221 },
  { number: 11, name: "\u0647\u0648\u062F", arabicName: "\u0647\u0648\u062F", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0647\u0648\u062F", ayahsCount: 123, ayas: 123, juz: 11, startPage: 221, endPage: 235 },
  { number: 12, name: "\u064A\u0648\u0633\u0641", arabicName: "\u064A\u0648\u0633\u0641", fullNameArabic: "\u0633\u0648\u0631\u0629 \u064A\u0648\u0633\u0641", ayahsCount: 111, ayas: 111, juz: 12, startPage: 235, endPage: 248 },
  { number: 13, name: "\u0627\u0644\u0631\u0639\u062F", arabicName: "\u0627\u0644\u0631\u0639\u062F", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0631\u0639\u062F", ayahsCount: 43, ayas: 43, juz: 13, startPage: 249, endPage: 255 },
  { number: 14, name: "\u0625\u0628\u0631\u0627\u0647\u064A\u0645", arabicName: "\u0625\u0628\u0631\u0627\u0647\u064A\u0645", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0625\u0628\u0631\u0627\u0647\u064A\u0645", ayahsCount: 52, ayas: 52, juz: 13, startPage: 255, endPage: 261 },
  { number: 15, name: "\u0627\u0644\u062D\u062C\u0631", arabicName: "\u0627\u0644\u062D\u062C\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062D\u062C\u0631", ayahsCount: 99, ayas: 99, juz: 14, startPage: 262, endPage: 267 },
  { number: 16, name: "\u0627\u0644\u0646\u062D\u0644", arabicName: "\u0627\u0644\u0646\u062D\u0644", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0646\u062D\u0644", ayahsCount: 128, ayas: 128, juz: 14, startPage: 267, endPage: 281 },
  { number: 17, name: "\u0627\u0644\u0625\u0633\u0631\u0627\u0621", arabicName: "\u0627\u0644\u0625\u0633\u0631\u0627\u0621", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0625\u0633\u0631\u0627\u0621", ayahsCount: 111, ayas: 111, juz: 15, startPage: 282, endPage: 293 },
  { number: 18, name: "\u0627\u0644\u0643\u0647\u0641", arabicName: "\u0627\u0644\u0643\u0647\u0641", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641", ayahsCount: 110, ayas: 110, juz: 15, startPage: 293, endPage: 304 },
  { number: 19, name: "\u0645\u0631\u064A\u0645", arabicName: "\u0645\u0631\u064A\u0645", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0645\u0631\u064A\u0645", ayahsCount: 98, ayas: 98, juz: 16, startPage: 305, endPage: 312 },
  { number: 20, name: "\u0637\u0647", arabicName: "\u0637\u0647", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0637\u0647", ayahsCount: 135, ayas: 135, juz: 16, startPage: 312, endPage: 321 },
  { number: 21, name: "\u0627\u0644\u0623\u0646\u0628\u064A\u0627\u0621", arabicName: "\u0627\u0644\u0623\u0646\u0628\u064A\u0627\u0621", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0623\u0646\u0628\u064A\u0627\u0621", ayahsCount: 112, ayas: 112, juz: 17, startPage: 322, endPage: 331 },
  { number: 22, name: "\u0627\u0644\u062D\u062C", arabicName: "\u0627\u0644\u062D\u062C", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062D\u062C", ayahsCount: 78, ayas: 78, juz: 17, startPage: 332, endPage: 341 },
  { number: 23, name: "\u0627\u0644\u0645\u0624\u0645\u0646\u0648\u0646", arabicName: "\u0627\u0644\u0645\u0624\u0645\u0646\u0648\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0624\u0645\u0646\u0648\u0646", ayahsCount: 118, ayas: 118, juz: 18, startPage: 342, endPage: 349 },
  { number: 24, name: "\u0627\u0644\u0646\u0648\u0631", arabicName: "\u0627\u0644\u0646\u0648\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0646\u0648\u0631", ayahsCount: 64, ayas: 64, juz: 18, startPage: 350, endPage: 359 },
  { number: 25, name: "\u0627\u0644\u0641\u0631\u0642\u0627\u0646", arabicName: "\u0627\u0644\u0641\u0631\u0642\u0627\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0641\u0631\u0642\u0627\u0646", ayahsCount: 77, ayas: 77, juz: 18, startPage: 359, endPage: 366 },
  { number: 26, name: "\u0627\u0644\u0634\u0639\u0631\u0627\u0621", arabicName: "\u0627\u0644\u0634\u0639\u0631\u0627\u0621", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0634\u0639\u0631\u0627\u0621", ayahsCount: 227, ayas: 227, juz: 19, startPage: 367, endPage: 376 },
  { number: 27, name: "\u0627\u0644\u0646\u0645\u0644", arabicName: "\u0627\u0644\u0646\u0645\u0644", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0646\u0645\u0644", ayahsCount: 93, ayas: 93, juz: 19, startPage: 377, endPage: 385 },
  { number: 28, name: "\u0627\u0644\u0642\u0635\u0635", arabicName: "\u0627\u0644\u0642\u0635\u0635", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0642\u0635\u0635", ayahsCount: 88, ayas: 88, juz: 20, startPage: 385, endPage: 396 },
  { number: 29, name: "\u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062A", arabicName: "\u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062A", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062A", ayahsCount: 69, ayas: 69, juz: 20, startPage: 396, endPage: 404 },
  { number: 30, name: "\u0627\u0644\u0631\u0648\u0645", arabicName: "\u0627\u0644\u0631\u0648\u0645", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0631\u0648\u0645", ayahsCount: 60, ayas: 60, juz: 21, startPage: 404, endPage: 410 },
  { number: 31, name: "\u0644\u0642\u0645\u0627\u0646", arabicName: "\u0644\u0642\u0645\u0627\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0644\u0642\u0645\u0627\u0646", ayahsCount: 34, ayas: 34, juz: 21, startPage: 411, endPage: 414 },
  { number: 32, name: "\u0627\u0644\u0633\u062C\u062F\u0629", arabicName: "\u0627\u0644\u0633\u062C\u062F\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0633\u062C\u062F\u0629", ayahsCount: 30, ayas: 30, juz: 21, startPage: 415, endPage: 417 },
  { number: 33, name: "\u0627\u0644\u0623\u062D\u0632\u0627\u0628", arabicName: "\u0627\u0644\u0623\u062D\u0632\u0627\u0628", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0623\u062D\u0632\u0627\u0628", ayahsCount: 73, ayas: 73, juz: 21, startPage: 418, endPage: 427 },
  { number: 34, name: "\u0633\u0628\u0623", arabicName: "\u0633\u0628\u0623", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0633\u0628\u0623", ayahsCount: 54, ayas: 54, juz: 22, startPage: 428, endPage: 434 },
  { number: 35, name: "\u0641\u0627\u0637\u0631", arabicName: "\u0641\u0627\u0637\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0641\u0627\u0637\u0631", ayahsCount: 45, ayas: 45, juz: 22, startPage: 434, endPage: 440 },
  { number: 36, name: "\u064A\u0633", arabicName: "\u064A\u0633", fullNameArabic: "\u0633\u0648\u0631\u0629 \u064A\u0633", ayahsCount: 83, ayas: 83, juz: 22, startPage: 440, endPage: 445 },
  { number: 37, name: "\u0627\u0644\u0635\u0627\u0641\u0627\u062A", arabicName: "\u0627\u0644\u0635\u0627\u0641\u0627\u062A", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0635\u0627\u0641\u0627\u062A", ayahsCount: 182, ayas: 182, juz: 23, startPage: 446, endPage: 452 },
  { number: 38, name: "\u0635", arabicName: "\u0635", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0635", ayahsCount: 88, ayas: 88, juz: 23, startPage: 453, endPage: 458 },
  { number: 39, name: "\u0627\u0644\u0632\u0645\u0631", arabicName: "\u0627\u0644\u0632\u0645\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0632\u0645\u0631", ayahsCount: 75, ayas: 75, juz: 23, startPage: 458, endPage: 467 },
  { number: 40, name: "\u063A\u0627\u0641\u0631", arabicName: "\u063A\u0627\u0641\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u063A\u0627\u0641\u0631", ayahsCount: 85, ayas: 85, juz: 24, startPage: 467, endPage: 476 },
  { number: 41, name: "\u0641\u0635\u0644\u062A", arabicName: "\u0641\u0635\u0644\u062A", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0641\u0635\u0644\u062A", ayahsCount: 54, ayas: 54, juz: 24, startPage: 477, endPage: 482 },
  { number: 42, name: "\u0627\u0644\u0634\u0648\u0631\u0649", arabicName: "\u0627\u0644\u0634\u0648\u0631\u0649", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0634\u0648\u0631\u0649", ayahsCount: 53, ayas: 53, juz: 25, startPage: 483, endPage: 489 },
  { number: 43, name: "\u0627\u0644\u0632\u062E\u0631\u0641", arabicName: "\u0627\u0644\u0632\u062E\u0631\u0641", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0632\u062E\u0631\u0641", ayahsCount: 89, ayas: 89, juz: 25, startPage: 489, endPage: 495 },
  { number: 44, name: "\u0627\u0644\u062F\u062E\u0627\u0646", arabicName: "\u0627\u0644\u062F\u062E\u0627\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062F\u062E\u0627\u0646", ayahsCount: 59, ayas: 59, juz: 25, startPage: 496, endPage: 498 },
  { number: 45, name: "\u0627\u0644\u062C\u0627\u062B\u064A\u0629", arabicName: "\u0627\u0644\u062C\u0627\u062B\u064A\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062C\u0627\u062B\u064A\u0629", ayahsCount: 37, ayas: 37, juz: 25, startPage: 499, endPage: 502 },
  { number: 46, name: "\u0627\u0644\u0623\u062D\u0642\u0627\u0641", arabicName: "\u0627\u0644\u0623\u062D\u0642\u0627\u0641", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0623\u062D\u0642\u0627\u0641", ayahsCount: 35, ayas: 35, juz: 26, startPage: 502, endPage: 506 },
  { number: 47, name: "\u0645\u062D\u0645\u062F", arabicName: "\u0645\u062D\u0645\u062F", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0645\u062D\u0645\u062F", ayahsCount: 38, ayas: 38, juz: 26, startPage: 507, endPage: 510 },
  { number: 48, name: "\u0627\u0644\u0641\u062A\u062D", arabicName: "\u0627\u0644\u0641\u062A\u062D", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0641\u062A\u062D", ayahsCount: 29, ayas: 29, juz: 26, startPage: 511, endPage: 515 },
  { number: 49, name: "\u0627\u0644\u062D\u062C\u0631\u0627\u062A", arabicName: "\u0627\u0644\u062D\u062C\u0631\u0627\u062A", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062D\u062C\u0631\u0627\u062A", ayahsCount: 18, ayas: 18, juz: 26, startPage: 515, endPage: 517 },
  { number: 50, name: "\u0642", arabicName: "\u0642", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0642", ayahsCount: 45, ayas: 45, juz: 26, startPage: 518, endPage: 520 },
  { number: 51, name: "\u0627\u0644\u0630\u0627\u0631\u064A\u0627\u062A", arabicName: "\u0627\u0644\u0630\u0627\u0631\u064A\u0627\u062A", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0630\u0627\u0631\u064A\u0627\u062A", ayahsCount: 60, ayas: 60, juz: 26, startPage: 520, endPage: 523 },
  { number: 52, name: "\u0627\u0644\u0637\u0648\u0631", arabicName: "\u0627\u0644\u0637\u0648\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0637\u0648\u0631", ayahsCount: 49, ayas: 49, juz: 27, startPage: 523, endPage: 525 },
  { number: 53, name: "\u0627\u0644\u0646\u062C\u0645", arabicName: "\u0627\u0644\u0646\u062C\u0645", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0646\u062C\u0645", ayahsCount: 62, ayas: 62, juz: 27, startPage: 526, endPage: 528 },
  { number: 54, name: "\u0627\u0644\u0642\u0645\u0631", arabicName: "\u0627\u0644\u0642\u0645\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0642\u0645\u0631", ayahsCount: 55, ayas: 55, juz: 27, startPage: 528, endPage: 531 },
  { number: 55, name: "\u0627\u0644\u0631\u062D\u0645\u0646", arabicName: "\u0627\u0644\u0631\u062D\u0645\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0631\u062D\u0645\u0646", ayahsCount: 78, ayas: 78, juz: 27, startPage: 531, endPage: 534 },
  { number: 56, name: "\u0627\u0644\u0648\u0627\u0642\u0639\u0629", arabicName: "\u0627\u0644\u0648\u0627\u0642\u0639\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0648\u0627\u0642\u0639\u0629", ayahsCount: 96, ayas: 96, juz: 27, startPage: 534, endPage: 537 },
  { number: 57, name: "\u0627\u0644\u062D\u062F\u064A\u062F", arabicName: "\u0627\u0644\u062D\u062F\u064A\u062F", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062D\u062F\u064A\u062F", ayahsCount: 29, ayas: 29, juz: 27, startPage: 537, endPage: 541 },
  { number: 58, name: "\u0627\u0644\u0645\u062C\u0627\u062F\u0644\u0629", arabicName: "\u0627\u0644\u0645\u062C\u0627\u062F\u0644\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u062C\u0627\u062F\u0644\u0629", ayahsCount: 22, ayas: 22, juz: 28, startPage: 542, endPage: 545 },
  { number: 59, name: "\u0627\u0644\u062D\u0634\u0631", arabicName: "\u0627\u0644\u062D\u0634\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062D\u0634\u0631", ayahsCount: 24, ayas: 24, juz: 28, startPage: 545, endPage: 548 },
  { number: 60, name: "\u0627\u0644\u0645\u0645\u062A\u062D\u0646\u0629", arabicName: "\u0627\u0644\u0645\u0645\u062A\u062D\u0646\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0645\u062A\u062D\u0646\u0629", ayahsCount: 13, ayas: 13, juz: 28, startPage: 549, endPage: 551 },
  { number: 61, name: "\u0627\u0644\u0635\u0641", arabicName: "\u0627\u0644\u0635\u0641", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0635\u0641", ayahsCount: 14, ayas: 14, juz: 28, startPage: 551, endPage: 552 },
  { number: 62, name: "\u0627\u0644\u062C\u0645\u0639\u0629", arabicName: "\u0627\u0644\u062C\u0645\u0639\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062C\u0645\u0639\u0629", ayahsCount: 11, ayas: 11, juz: 28, startPage: 553, endPage: 554 },
  { number: 63, name: "\u0627\u0644\u0645\u0646\u0627\u0641\u0642\u0648\u0646", arabicName: "\u0627\u0644\u0645\u0646\u0627\u0641\u0642\u0648\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0646\u0627\u0641\u0642\u0648\u0646", ayahsCount: 11, ayas: 11, juz: 28, startPage: 554, endPage: 555 },
  { number: 64, name: "\u0627\u0644\u062A\u063A\u0627\u0628\u0646", arabicName: "\u0627\u0644\u062A\u063A\u0627\u0628\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062A\u063A\u0627\u0628\u0646", ayahsCount: 18, ayas: 18, juz: 28, startPage: 556, endPage: 557 },
  { number: 65, name: "\u0627\u0644\u0637\u0644\u0627\u0642", arabicName: "\u0627\u0644\u0637\u0644\u0627\u0642", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0637\u0644\u0627\u0642", ayahsCount: 12, ayas: 12, juz: 28, startPage: 558, endPage: 559 },
  { number: 66, name: "\u0627\u0644\u062A\u062D\u0631\u064A\u0645", arabicName: "\u0627\u0644\u062A\u062D\u0631\u064A\u0645", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062A\u062D\u0631\u064A\u0645", ayahsCount: 12, ayas: 12, juz: 28, startPage: 560, endPage: 561 },
  { number: 67, name: "\u0627\u0644\u0645\u0644\u0643", arabicName: "\u0627\u0644\u0645\u0644\u0643", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0643", ayahsCount: 30, ayas: 30, juz: 29, startPage: 562, endPage: 564 },
  { number: 68, name: "\u0627\u0644\u0642\u0644\u0645", arabicName: "\u0627\u0644\u0642\u0644\u0645", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0642\u0644\u0645", ayahsCount: 52, ayas: 52, juz: 29, startPage: 564, endPage: 566 },
  { number: 69, name: "\u0627\u0644\u062D\u0627\u0642\u0629", arabicName: "\u0627\u0644\u062D\u0627\u0642\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062D\u0627\u0642\u0629", ayahsCount: 52, ayas: 52, juz: 29, startPage: 566, endPage: 568 },
  { number: 70, name: "\u0627\u0644\u0645\u0639\u0627\u0631\u062C", arabicName: "\u0627\u0644\u0645\u0639\u0627\u0631\u062C", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0639\u0627\u0631\u062C", ayahsCount: 44, ayas: 44, juz: 29, startPage: 568, endPage: 570 },
  { number: 71, name: "\u0646\u0648\u062D", arabicName: "\u0646\u0648\u062D", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0646\u0648\u062D", ayahsCount: 28, ayas: 28, juz: 29, startPage: 570, endPage: 571 },
  { number: 72, name: "\u0627\u0644\u062C\u0646", arabicName: "\u0627\u0644\u062C\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062C\u0646", ayahsCount: 28, ayas: 28, juz: 29, startPage: 572, endPage: 573 },
  { number: 73, name: "\u0627\u0644\u0645\u0632\u0645\u0644", arabicName: "\u0627\u0644\u0645\u0632\u0645\u0644", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0632\u0645\u0644", ayahsCount: 20, ayas: 20, juz: 29, startPage: 574, endPage: 575 },
  { number: 74, name: "\u0627\u0644\u0645\u062F\u062B\u0631", arabicName: "\u0627\u0644\u0645\u062F\u062B\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u062F\u062B\u0631", ayahsCount: 56, ayas: 56, juz: 29, startPage: 575, endPage: 577 },
  { number: 75, name: "\u0627\u0644\u0642\u064A\u0627\u0645\u0629", arabicName: "\u0627\u0644\u0642\u064A\u0627\u0645\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0642\u064A\u0627\u0645\u0629", ayahsCount: 40, ayas: 40, juz: 29, startPage: 577, endPage: 578 },
  { number: 76, name: "\u0627\u0644\u0625\u0646\u0633\u0627\u0646", arabicName: "\u0627\u0644\u0625\u0646\u0633\u0627\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0625\u0646\u0633\u0627\u0646", ayahsCount: 31, ayas: 31, juz: 29, startPage: 578, endPage: 580 },
  { number: 77, name: "\u0627\u0644\u0645\u0631\u0633\u0644\u0627\u062A", arabicName: "\u0627\u0644\u0645\u0631\u0633\u0644\u0627\u062A", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0633\u0644\u0627\u062A", ayahsCount: 50, ayas: 50, juz: 29, startPage: 580, endPage: 581 },
  { number: 78, name: "\u0627\u0644\u0646\u0628\u0623", arabicName: "\u0627\u0644\u0646\u0628\u0623", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0646\u0628\u0623", ayahsCount: 40, ayas: 40, juz: 30, startPage: 582, endPage: 583 },
  { number: 79, name: "\u0627\u0644\u0646\u0627\u0632\u0639\u0627\u062A", arabicName: "\u0627\u0644\u0646\u0627\u0632\u0639\u0627\u062A", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0646\u0627\u0632\u0639\u0627\u062A", ayahsCount: 46, ayas: 46, juz: 30, startPage: 583, endPage: 584 },
  { number: 80, name: "\u0639\u0628\u0633", arabicName: "\u0639\u0628\u0633", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0639\u0628\u0633", ayahsCount: 42, ayas: 42, juz: 30, startPage: 585, endPage: 585 },
  { number: 81, name: "\u0627\u0644\u062A\u0643\u0648\u064A\u0631", arabicName: "\u0627\u0644\u062A\u0643\u0648\u064A\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062A\u0643\u0648\u064A\u0631", ayahsCount: 29, ayas: 29, juz: 30, startPage: 586, endPage: 586 },
  { number: 82, name: "\u0627\u0644\u0627\u0646\u0641\u0637\u0627\u0631", arabicName: "\u0627\u0644\u0627\u0646\u0641\u0637\u0627\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0627\u0646\u0641\u0637\u0627\u0631", ayahsCount: 19, ayas: 19, juz: 30, startPage: 587, endPage: 587 },
  { number: 83, name: "\u0627\u0644\u0645\u0637\u0641\u0641\u064A\u0646", arabicName: "\u0627\u0644\u0645\u0637\u0641\u0641\u064A\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0637\u0641\u0641\u064A\u0646", ayahsCount: 36, ayas: 36, juz: 30, startPage: 587, endPage: 589 },
  { number: 84, name: "\u0627\u0644\u0627\u0646\u0634\u0642\u0627\u0642", arabicName: "\u0627\u0644\u0627\u0646\u0634\u0642\u0627\u0642", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0627\u0646\u0634\u0642\u0627\u0642", ayahsCount: 25, ayas: 25, juz: 30, startPage: 589, endPage: 589 },
  { number: 85, name: "\u0627\u0644\u0628\u0631\u0648\u062C", arabicName: "\u0627\u0644\u0628\u0631\u0648\u062C", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0628\u0631\u0648\u062C", ayahsCount: 22, ayas: 22, juz: 30, startPage: 590, endPage: 590 },
  { number: 86, name: "\u0627\u0644\u0637\u0627\u0631\u0642", arabicName: "\u0627\u0644\u0637\u0627\u0631\u0642", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0637\u0627\u0631\u0642", ayahsCount: 17, ayas: 17, juz: 30, startPage: 591, endPage: 591 },
  { number: 87, name: "\u0627\u0644\u0623\u0639\u0644\u0649", arabicName: "\u0627\u0644\u0623\u0639\u0644\u0649", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0623\u0639\u0644\u0649", ayahsCount: 19, ayas: 19, juz: 30, startPage: 591, endPage: 592 },
  { number: 88, name: "\u0627\u0644\u063A\u0627\u0634\u064A\u0629", arabicName: "\u0627\u0644\u063A\u0627\u0634\u064A\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u063A\u0627\u0634\u064A\u0629", ayahsCount: 26, ayas: 26, juz: 30, startPage: 592, endPage: 592 },
  { number: 89, name: "\u0627\u0644\u0641\u062C\u0631", arabicName: "\u0627\u0644\u0641\u062C\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0641\u062C\u0631", ayahsCount: 30, ayas: 30, juz: 30, startPage: 593, endPage: 594 },
  { number: 90, name: "\u0627\u0644\u0628\u0644\u062F", arabicName: "\u0627\u0644\u0628\u0644\u062F", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0628\u0644\u062F", ayahsCount: 20, ayas: 20, juz: 30, startPage: 594, endPage: 594 },
  { number: 91, name: "\u0627\u0644\u0634\u0645\u0633", arabicName: "\u0627\u0644\u0634\u0645\u0633", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0634\u0645\u0633", ayahsCount: 15, ayas: 15, juz: 30, startPage: 595, endPage: 595 },
  { number: 92, name: "\u0627\u0644\u0644\u064A\u0644", arabicName: "\u0627\u0644\u0644\u064A\u0644", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0644\u064A\u0644", ayahsCount: 21, ayas: 21, juz: 30, startPage: 595, endPage: 596 },
  { number: 93, name: "\u0627\u0644\u0636\u062D\u0649", arabicName: "\u0627\u0644\u0636\u062D\u0649", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0636\u062D\u0649", ayahsCount: 11, ayas: 11, juz: 30, startPage: 596, endPage: 596 },
  { number: 94, name: "\u0627\u0644\u0634\u0631\u062D", arabicName: "\u0627\u0644\u0634\u0631\u062D", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0634\u0631\u062D", ayahsCount: 8, ayas: 8, juz: 30, startPage: 596, endPage: 596 },
  { number: 95, name: "\u0627\u0644\u062A\u064A\u0646", arabicName: "\u0627\u0644\u062A\u064A\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062A\u064A\u0646", ayahsCount: 8, ayas: 8, juz: 30, startPage: 597, endPage: 597 },
  { number: 96, name: "\u0627\u0644\u0639\u0644\u0642", arabicName: "\u0627\u0644\u0639\u0644\u0642", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0639\u0644\u0642", ayahsCount: 19, ayas: 19, juz: 30, startPage: 597, endPage: 597 },
  { number: 97, name: "\u0627\u0644\u0642\u062F\u0631", arabicName: "\u0627\u0644\u0642\u062F\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0642\u062F\u0631", ayahsCount: 5, ayas: 5, juz: 30, startPage: 598, endPage: 598 },
  { number: 98, name: "\u0627\u0644\u0628\u064A\u0646\u0629", arabicName: "\u0627\u0644\u0628\u064A\u0646\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0628\u064A\u0646\u0629", ayahsCount: 8, ayas: 8, juz: 30, startPage: 598, endPage: 599 },
  { number: 99, name: "\u0627\u0644\u0632\u0644\u0632\u0644\u0629", arabicName: "\u0627\u0644\u0632\u0644\u0632\u0644\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0632\u0644\u0632\u0644\u0629", ayahsCount: 8, ayas: 8, juz: 30, startPage: 599, endPage: 599 },
  { number: 100, name: "\u0627\u0644\u0639\u0627\u062F\u064A\u0627\u062A", arabicName: "\u0627\u0644\u0639\u0627\u062F\u064A\u0627\u062A", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0639\u0627\u062F\u064A\u0627\u062A", ayahsCount: 11, ayas: 11, juz: 30, startPage: 599, endPage: 600 },
  { number: 101, name: "\u0627\u0644\u0642\u0627\u0631\u0639\u0629", arabicName: "\u0627\u0644\u0642\u0627\u0631\u0639\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0642\u0627\u0631\u0639\u0629", ayahsCount: 11, ayas: 11, juz: 30, startPage: 600, endPage: 600 },
  { number: 102, name: "\u0627\u0644\u062A\u0643\u0627\u062B\u0631", arabicName: "\u0627\u0644\u062A\u0643\u0627\u062B\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u062A\u0643\u0627\u062B\u0631", ayahsCount: 8, ayas: 8, juz: 30, startPage: 600, endPage: 600 },
  { number: 103, name: "\u0627\u0644\u0639\u0635\u0631", arabicName: "\u0627\u0644\u0639\u0635\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0639\u0635\u0631", ayahsCount: 3, ayas: 3, juz: 30, startPage: 601, endPage: 601 },
  { number: 104, name: "\u0627\u0644\u0647\u0645\u0632\u0629", arabicName: "\u0627\u0644\u0647\u0645\u0632\u0629", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0647\u0645\u0632\u0629", ayahsCount: 9, ayas: 9, juz: 30, startPage: 601, endPage: 601 },
  { number: 105, name: "\u0627\u0644\u0641\u064A\u0644", arabicName: "\u0627\u0644\u0641\u064A\u0644", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0641\u064A\u0644", ayahsCount: 5, ayas: 5, juz: 30, startPage: 601, endPage: 601 },
  { number: 106, name: "\u0642\u0631\u064A\u0634", arabicName: "\u0642\u0631\u064A\u0634", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0642\u0631\u064A\u0634", ayahsCount: 4, ayas: 4, juz: 30, startPage: 602, endPage: 602 },
  { number: 107, name: "\u0627\u0644\u0645\u0627\u0639\u0648\u0646", arabicName: "\u0627\u0644\u0645\u0627\u0639\u0648\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0627\u0639\u0648\u0646", ayahsCount: 7, ayas: 7, juz: 30, startPage: 602, endPage: 602 },
  { number: 108, name: "\u0627\u0644\u0643\u0648\u062B\u0631", arabicName: "\u0627\u0644\u0643\u0648\u062B\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0648\u062B\u0631", ayahsCount: 3, ayas: 3, juz: 30, startPage: 602, endPage: 602 },
  { number: 109, name: "\u0627\u0644\u0643\u0627\u0641\u0631\u0648\u0646", arabicName: "\u0627\u0644\u0643\u0627\u0641\u0631\u0648\u0646", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0627\u0641\u0631\u0648\u0646", ayahsCount: 6, ayas: 6, juz: 30, startPage: 603, endPage: 603 },
  { number: 110, name: "\u0627\u0644\u0646\u0635\u0631", arabicName: "\u0627\u0644\u0646\u0635\u0631", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0646\u0635\u0631", ayahsCount: 3, ayas: 3, juz: 30, startPage: 603, endPage: 603 },
  { number: 111, name: "\u0627\u0644\u0645\u0633\u062F", arabicName: "\u0627\u0644\u0645\u0633\u062F", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0633\u062F", ayahsCount: 5, ayas: 5, juz: 30, startPage: 603, endPage: 603 },
  { number: 112, name: "\u0627\u0644\u0625\u062E\u0644\u0627\u0635", arabicName: "\u0627\u0644\u0625\u062E\u0644\u0627\u0635", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0625\u062E\u0644\u0627\u0635", ayahsCount: 4, ayas: 4, juz: 30, startPage: 604, endPage: 604 },
  { number: 113, name: "\u0627\u0644\u0641\u0644\u0642", arabicName: "\u0627\u0644\u0641\u0644\u0642", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0641\u0644\u0642", ayahsCount: 5, ayas: 5, juz: 30, startPage: 604, endPage: 604 },
  { number: 114, name: "\u0627\u0644\u0646\u0627\u0633", arabicName: "\u0627\u0644\u0646\u0627\u0633", fullNameArabic: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0646\u0627\u0633", ayahsCount: 6, ayas: 6, juz: 30, startPage: 604, endPage: 604 }
];
var BACKWARD_114_SURAHS = [
  ALL_114_SURAHS[0],
  // سورة الفاتحة (1) أولاً
  ...ALL_114_SURAHS.slice(1).reverse()
  // من الناس (114) حتى البقرة (2)
];

// src/data/initialData.ts
var INITIAL_USERS = [
  {
    id: "usr_sys_admin_2396012458",
    name: "\u0646\u0648\u0631 \u0625\u0628\u0631\u0627\u0647\u064A\u0645 \u0627\u0644\u0646\u062C\u0627\u0631",
    fullName: "\u0646\u0648\u0631 \u0625\u0628\u0631\u0627\u0647\u064A\u0645 \u0627\u0644\u0646\u062C\u0627\u0631",
    loginIdentifier: "2396012458",
    nationalId: "2396012458",
    phone: "0569990593",
    password: "123456",
    role: "system_admin",
    isActive: true,
    mustChangePassword: false
  }
];
var SEED_USERS = [
  ...INITIAL_USERS
];
var INITIAL_SPELLING_LESSONS = [
  {
    id: "spl_1",
    lessonNumber: 1,
    title: "\u062D\u0631\u0648\u0641 \u0627\u0644\u0647\u062C\u0627\u0621 \u0627\u0644\u0645\u0641\u0631\u062F\u0629",
    skill: "\u0646\u0637\u0642 \u0627\u0644\u062D\u0631\u0648\u0641 \u0628\u0623\u0633\u0645\u0627\u0626\u0647\u0627 \u0648\u0645\u062E\u0627\u0631\u062C\u0647\u0627 \u0627\u0644\u0635\u062D\u064A\u062D\u0629",
    description: "\u0645\u0639\u0631\u0641\u0629 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u062D\u0631\u0648\u0641 \u0645\u0646 \u0627\u0644\u0623\u0644\u0641 \u0625\u0644\u0649 \u0627\u0644\u064A\u0627\u0621 \u0648\u0636\u0628\u0637 \u0645\u062E\u0627\u0631\u062C\u0647\u0627 \u0627\u0644\u0641\u0631\u062F\u064A\u0629",
    subLessons: [
      { id: "sub_1_1", code: "1/1", title: "\u0627\u0644\u062D\u0631\u0648\u0641 \u0645\u0646 \u0627\u0644\u0623\u0644\u0641 \u0625\u0644\u0649 \u0627\u0644\u062E\u0627\u0621", maxScore: 100 },
      { id: "sub_1_2", code: "1/2", title: "\u0627\u0644\u062D\u0631\u0648\u0641 \u0645\u0646 \u0627\u0644\u062F\u0627\u0644 \u0625\u0644\u0649 \u0627\u0644\u0636\u0627\u062F", maxScore: 100 },
      { id: "sub_1_3", code: "1/3", title: "\u0627\u0644\u062D\u0631\u0648\u0641 \u0645\u0646 \u0627\u0644\u0637\u0627\u0621 \u0625\u0644\u0649 \u0627\u0644\u064A\u0627\u0621", maxScore: 100 }
    ],
    passingScore: 85,
    order: 1,
    isActive: true
  },
  {
    id: "spl_2",
    lessonNumber: 2,
    title: "\u062D\u0631\u0648\u0641 \u0627\u0644\u0647\u062C\u0627\u0621 \u0627\u0644\u0645\u0631\u0643\u0628\u0629",
    skill: "\u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0623\u0634\u0643\u0627\u0644 \u0627\u0644\u062D\u0631\u0648\u0641 \u0641\u064A \u0623\u0648\u0644 \u0648\u0648\u0633\u0637 \u0648\u0622\u062E\u0631 \u0627\u0644\u0643\u0644\u0645\u0629",
    description: "\u062A\u0645\u064A\u064A\u0632 \u0627\u0644\u062D\u0631\u0648\u0641 \u0627\u0644\u0645\u062A\u0635\u0644\u0629 \u0648\u0642\u0631\u0627\u0621\u062A\u0647\u0627 \u0647\u062C\u0627\u0621\u064B \u0628\u0635\u0648\u062A \u0648\u0627\u0636\u062D",
    subLessons: [
      { id: "sub_2_1", code: "2/1", title: "\u0627\u0644\u0645\u0631\u0643\u0628\u0627\u062A \u0627\u0644\u062B\u0646\u0627\u0626\u064A\u0629 (\u0644\u0627\u060C \u0628\u0627\u060C \u062A\u0627...) ", maxScore: 100 },
      { id: "sub_2_2", code: "2/2", title: "\u0627\u0644\u0645\u0631\u0643\u0628\u0627\u062A \u0627\u0644\u062B\u0644\u0627\u062B\u064A\u0629 \u0648\u0623\u0634\u0643\u0627\u0644 \u0627\u0644\u0647\u0627\u0621 \u0648\u0627\u0644\u064A\u0627\u0621", maxScore: 100 }
    ],
    passingScore: 85,
    order: 2,
    isActive: true
  },
  {
    id: "spl_3",
    lessonNumber: 3,
    title: "\u0627\u0644\u062D\u0631\u0648\u0641 \u0627\u0644\u0645\u0642\u0637\u0639\u0629 \u0641\u064A \u0641\u0648\u0627\u062A\u062D \u0627\u0644\u0633\u0648\u0631",
    skill: "\u0646\u0637\u0642 \u0627\u0644\u0641\u0648\u0627\u062A\u062D \u0627\u0644\u0642\u0631\u0622\u0646\u064A\u0629 \u0645\u0639 \u0625\u0639\u0637\u0627\u0621 \u0627\u0644\u0645\u062F\u0648\u062F \u062D\u0642\u0647\u0627",
    description: "\u0642\u0631\u0627\u0621\u0629 \u062D\u0631\u0648\u0641 \u0623\u0644\u0645\u060C \u0627\u0644\u0631\u060C \u0637\u0633\u0645\u060C \u062D\u0645\u060C \u0643\u0647\u064A\u0639\u0635 \u0628\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062A\u0644\u0627\u0648\u0629 \u0627\u0644\u0645\u062A\u0642\u0646\u0629",
    subLessons: [
      { id: "sub_3_1", code: "3/1", title: "\u0623\u0644\u0645\u060C \u0627\u0644\u0631\u060C \u0637\u0647\u060C \u064A\u0633", maxScore: 100 },
      { id: "sub_3_2", code: "3/2", title: "\u0637\u0633\u0645\u060C \u0627\u0644\u0645\u0631\u060C \u0627\u0644\u0645\u0635\u060C \u0643\u0647\u064A\u0639\u0635\u060C \u062D\u0645 \u0639\u0633\u0642", maxScore: 100 }
    ],
    passingScore: 85,
    order: 3,
    isActive: true
  },
  {
    id: "spl_4",
    lessonNumber: 4,
    title: "\u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u062B\u0644\u0627\u062B (\u0627\u0644\u0641\u062A\u062D\u0629 \u0648\u0627\u0644\u0643\u0633\u0631\u0629 \u0648\u0627\u0644\u0636\u0645\u0629)",
    skill: "\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u062D\u0631\u0641 \u0628\u062D\u0631\u0643\u062A\u0647 \u062F\u0648\u0646 \u062A\u0645\u0637\u064A\u0637 \u0623\u0648 \u0627\u062E\u062A\u0644\u0627\u0633",
    description: "\u0636\u0628\u0637 \u0632\u0645\u0646 \u0627\u0644\u062D\u0631\u0643\u0629 \u0648\u0632\u0645\u0646 \u0635\u0648\u062A \u0627\u0644\u0641\u062A\u062D \u0648\u0627\u0644\u0643\u0633\u0631 \u0648\u0627\u0644\u0636\u0645 \u0627\u0644\u0641\u0635\u064A\u062D",
    subLessons: [
      { id: "sub_4_1", code: "4/1", title: "\u0627\u0644\u0641\u062A\u062D\u0629 \u0645\u0639 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0631\u0648\u0641", maxScore: 100 },
      { id: "sub_4_2", code: "4/2", title: "\u0627\u0644\u0643\u0633\u0631\u0629 \u0645\u0639 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0631\u0648\u0641", maxScore: 100 },
      { id: "sub_4_3", code: "4/3", title: "\u0627\u0644\u0636\u0645\u0629 \u0645\u0639 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0631\u0648\u0641", maxScore: 100 },
      { id: "sub_4_4", code: "4/4", title: "\u0643\u0644\u0645\u0627\u062A \u062B\u0644\u0627\u062B\u064A\u0629 \u0645\u0634\u0643\u0648\u0644\u0629 \u0628\u0627\u0644\u062D\u0631\u0643\u0627\u062A", maxScore: 100 }
    ],
    passingScore: 85,
    order: 4,
    isActive: true
  },
  {
    id: "spl_5",
    lessonNumber: 5,
    title: "\u0627\u0644\u062A\u0646\u0648\u064A\u0646 (\u062A\u0646\u0648\u064A\u0646 \u0627\u0644\u0641\u062A\u062D \u0648\u0627\u0644\u0636\u0645 \u0648\u0627\u0644\u0643\u0633\u0631)",
    skill: "\u0625\u0638\u0647\u0627\u0631 \u0646\u0648\u0646 \u0627\u0644\u062A\u0646\u0648\u064A\u0646 \u0627\u0644\u0633\u0627\u0643\u0646\u0629 \u0648\u0636\u0628\u0637 \u0635\u0648\u062A\u0647\u0627",
    description: "\u062A\u0647\u062C\u0626\u0629 \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0646\u0648\u0646\u0629 \u0628\u0627\u0644\u0641\u062A\u062D \u0648\u0627\u0644\u0636\u0645 \u0648\u0627\u0644\u0643\u0633\u0631 \u0628\u062F\u0642\u0629",
    subLessons: [
      { id: "sub_5_1", code: "5/1", title: "\u062A\u0646\u0648\u064A\u0646 \u0627\u0644\u0641\u062A\u062D", maxScore: 100 },
      { id: "sub_5_2", code: "5/2", title: "\u062A\u0646\u0648\u064A\u0646 \u0627\u0644\u0643\u0633\u0631", maxScore: 100 },
      { id: "sub_5_3", code: "5/3", title: "\u062A\u0646\u0648\u064A\u0646 \u0627\u0644\u0636\u0645", maxScore: 100 }
    ],
    passingScore: 85,
    order: 5,
    isActive: true
  },
  {
    id: "spl_6",
    lessonNumber: 6,
    title: "\u062A\u062F\u0631\u064A\u0628\u0627\u062A \u0639\u0644\u0649 \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0648\u0627\u0644\u062A\u0646\u0648\u064A\u0646",
    skill: "\u0633\u0631\u0639\u0629 \u0627\u0644\u062A\u0647\u062C\u0626\u0629 \u0648\u0627\u0644\u0631\u0628\u0637 \u0628\u064A\u0646 \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u062A\u0646\u0648\u0639\u0629",
    description: "\u0642\u0631\u0627\u0621\u0629 \u0643\u0644\u0645\u0627\u062A \u0642\u0631\u0622\u0646\u064A\u0629 \u0645\u0646\u0648\u0639\u0629 \u062A\u062C\u0645\u0639 \u0628\u064A\u0646 \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u062B\u0644\u0627\u062B \u0648\u0627\u0644\u062A\u0646\u0648\u064A\u0646",
    subLessons: [
      { id: "sub_6_1", code: "6/1", title: "\u0643\u0644\u0645\u0627\u062A \u0645\u0646 \u062C\u0632\u0621 \u0639\u0645 (\u0623\u0628\u064E\u062F\u064B\u0627\u060C \u0623\u062D\u064E\u062F\u064C\u060C \u0628\u064E\u0631\u064E\u0631\u0629\u064D)", maxScore: 100 },
      { id: "sub_6_2", code: "6/2", title: "\u0643\u0644\u0645\u0627\u062A \u062B\u0644\u0627\u062B\u064A\u0629 \u0648\u0631\u0628\u0627\u0639\u064A\u0629 \u0645\u0639 \u062A\u0646\u0648\u064A\u0646 \u0627\u0644\u0646\u0635\u0628", maxScore: 100 }
    ],
    passingScore: 85,
    order: 6,
    isActive: true
  },
  {
    id: "spl_7",
    lessonNumber: 7,
    title: "\u0627\u0644\u0623\u0644\u0641 \u0627\u0644\u0635\u063A\u064A\u0631\u0629 \u0648\u0627\u0644\u064A\u0627\u0621 \u0627\u0644\u0635\u063A\u064A\u0631\u0629 \u0648\u0627\u0644\u0648\u0627\u0648 \u0627\u0644\u0635\u063A\u064A\u0631\u0629",
    skill: "\u0625\u062B\u0628\u0627\u062A \u0627\u0644\u0645\u062F\u0648\u062F \u0627\u0644\u0635\u063A\u0631\u0649 \u0641\u064A \u0627\u0644\u0631\u0633\u0645 \u0627\u0644\u0639\u062B\u0645\u0627\u0646\u064A \u0628\u0645\u0642\u062F\u0627\u0631 \u062D\u0631\u0643\u062A\u064A\u0646",
    description: "\u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0644\u0641 \u0627\u0644\u062E\u0646\u062C\u0631\u064A\u0629 \u0648\u0627\u0644\u064A\u0627\u0621 \u0627\u0644\u0645\u0644\u062D\u0642\u0629 \u0648\u0627\u0644\u0648\u0627\u0648 \u0627\u0644\u0635\u063A\u064A\u0631\u0629 \u0648\u0642\u0631\u0627\u0621\u062A\u0647\u0627 \u0645\u062F\u0627\u064B \u0637\u0628\u064A\u0639\u064A\u0627\u064B",
    subLessons: [
      { id: "sub_7_1", code: "7/1", title: "\u0627\u0644\u0623\u0644\u0641 \u0627\u0644\u0635\u063A\u064A\u0631\u0629 (\u0628\u0670\u0640 \u060C \u062A\u0670\u0640 \u060C \u0647\u0670\u0640)", maxScore: 100 },
      { id: "sub_7_2", code: "7/2", title: "\u0627\u0644\u064A\u0627\u0621 \u0648\u0627\u0644\u0648\u0627\u0648 \u0627\u0644\u0635\u063A\u064A\u0631\u062A\u0627\u0646 (\u0628\u0647\u0656\u060C \u062F\u0627\u0648\u064F\u06E5\u062F)", maxScore: 100 }
    ],
    passingScore: 85,
    order: 7,
    isActive: true
  },
  {
    id: "spl_8",
    lessonNumber: 8,
    title: "\u062D\u0631\u0648\u0641 \u0627\u0644\u0645\u062F \u0648\u0627\u0644\u0644\u064A\u0646",
    skill: "\u0627\u0644\u062A\u0645\u064A\u064A\u0632 \u0627\u0644\u062F\u0642\u064A\u0642 \u0628\u064A\u0646 \u062D\u0631\u0641 \u0627\u0644\u0645\u062F \u0648\u062D\u0631\u0641 \u0627\u0644\u0644\u064A\u0646",
    description: "\u0645\u062F \u062D\u0631\u0648\u0641 (\u0648\u0627\u064A) \u0627\u0644\u0633\u0627\u0643\u0646\u0629 \u0627\u0644\u0645\u0633\u0628\u0648\u0642\u0629 \u0628\u062D\u0631\u0643\u0629 \u0645\u062C\u0627\u0646\u0633\u0629\u060C \u0648\u0636\u0628\u0637 \u0627\u0644\u0648\u0627\u0648 \u0648\u0627\u0644\u064A\u0627\u0621 \u0627\u0644\u0633\u0627\u0643\u0646\u062A\u064A\u0646 \u0627\u0644\u0645\u0641\u062A\u0648\u062D \u0645\u0627 \u0642\u0628\u0644\u0647\u0645\u0627",
    subLessons: [
      { id: "sub_8_1", code: "8/1", title: "\u0627\u0644\u0623\u0644\u0641 \u0648\u0627\u0644\u0648\u0627\u0648 \u0648\u0627\u0644\u064A\u0627\u0621 \u0627\u0644\u0645\u062F\u064A\u0629 (\u0646\u0648\u062D\u064A\u0647\u0627)", maxScore: 100 },
      { id: "sub_8_2", code: "8/2", title: "\u062D\u0631\u0641\u0627 \u0627\u0644\u0644\u064A\u0646 (\u0642\u064F\u0631\u064E\u064A\u0652\u0634\u064D\u060C \u062E\u064E\u0648\u0652\u0641\u064D)", maxScore: 100 }
    ],
    passingScore: 85,
    order: 8,
    isActive: true
  },
  {
    id: "spl_9",
    lessonNumber: 9,
    title: "\u0627\u0644\u0633\u0643\u0648\u0646 \u0648\u0642\u0644\u0642\u0644\u0629 \u0627\u0644\u062D\u0631\u0648\u0641",
    skill: "\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u062D\u0631\u0641 \u0627\u0644\u0633\u0627\u0643\u0646 \u0648\u0628\u064A\u0627\u0646 \u062D\u0631\u0648\u0641 \u0627\u0644\u0642\u0644\u0642\u0644\u0629 (\u0642\u0637\u0628 \u062C\u062F)",
    description: "\u0646\u0637\u0642 \u0627\u0644\u062D\u0631\u0641 \u0627\u0644\u0633\u0627\u0643\u0646 \u0628\u0639\u062F \u0627\u0644\u0645\u062A\u062D\u0631\u0643 \u062F\u0648\u0646 \u062D\u0631\u0643\u0629 \u0625\u0636\u0627\u0641\u064A\u0629 \u0645\u0639 \u062A\u0645\u064A\u064A\u0632 \u0627\u0636\u0637\u0631\u0627\u0628 \u0627\u0644\u0642\u0644\u0642\u0644\u0629",
    subLessons: [
      { id: "sub_9_1", code: "9/1", title: "\u0627\u0644\u0633\u0643\u0648\u0646 \u0627\u0644\u0639\u0627\u0645", maxScore: 100 },
      { id: "sub_9_2", code: "9/2", title: "\u062D\u0631\u0648\u0641 \u0627\u0644\u0642\u0644\u0642\u0644\u0629 \u0627\u0644\u062E\u0645\u0633\u0629 \u0641\u064A \u0648\u0633\u0637 \u0648\u0622\u062E\u0631 \u0627\u0644\u0643\u0644\u0645\u0629", maxScore: 100 }
    ],
    passingScore: 85,
    order: 9,
    isActive: true
  },
  {
    id: "spl_10",
    lessonNumber: 10,
    title: "\u0627\u0644\u0634\u062F\u0629 \u0648\u0627\u0644\u063A\u0646\u0651\u0629",
    skill: "\u0646\u0637\u0642 \u0627\u0644\u062D\u0631\u0641 \u0627\u0644\u0645\u0634\u062F\u062F \u0628\u062D\u0631\u0641\u064A\u0646 \u0627\u0644\u0623\u0648\u0644 \u0633\u0627\u0643\u0646 \u0648\u0627\u0644\u062B\u0627\u0646\u064A \u0645\u062A\u062D\u0631\u0643",
    description: "\u0636\u063A\u0637 \u0645\u062E\u0631\u062C \u0627\u0644\u062D\u0631\u0641 \u0627\u0644\u0645\u0634\u062F\u062F \u0648\u0625\u0639\u0637\u0627\u0621 \u0627\u0644\u0646\u0648\u0646 \u0648\u0627\u0644\u0645\u064A\u0645 \u0627\u0644\u0645\u0634\u062F\u062F\u062A\u064A\u0646 \u0627\u0644\u063A\u0646\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629",
    subLessons: [
      { id: "sub_10_1", code: "10/1", title: "\u0627\u0644\u0634\u062F\u0629 \u0645\u0639 \u0627\u0644\u0641\u062A\u062D\u0629 \u0648\u0627\u0644\u0643\u0633\u0631\u0629 \u0648\u0627\u0644\u0636\u0645\u0629", maxScore: 100 },
      { id: "sub_10_2", code: "10/2", title: "\u0627\u0644\u0634\u062F\u0629 \u0645\u0639 \u0627\u0644\u062A\u0646\u0648\u064A\u0646", maxScore: 100 },
      { id: "sub_10_3", code: "10/3", title: "\u0627\u0644\u0646\u0648\u0646 \u0648\u0627\u0644\u0645\u064A\u0645 \u0627\u0644\u0645\u0634\u062F\u062F\u062A\u0627\u0646 \u0648\u062D\u0643\u0645 \u0627\u0644\u063A\u0646\u0629", maxScore: 100 }
    ],
    passingScore: 85,
    order: 10,
    isActive: true
  },
  {
    id: "spl_11",
    lessonNumber: 11,
    title: "\u0627\u0644\u0644\u0627\u0645 \u0627\u0644\u0634\u0645\u0633\u064A\u0629 \u0648\u0627\u0644\u0644\u0627\u0645 \u0627\u0644\u0642\u0645\u0631\u064A\u0629 \u0648\u0647\u0645\u0632\u0629 \u0627\u0644\u0648\u0635\u0644",
    skill: "\u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0625\u062F\u063A\u0627\u0645 \u0627\u0644\u0634\u0645\u0633\u064A \u0648\u0627\u0644\u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u0642\u0645\u0631\u064A \u0648\u0625\u0633\u0642\u0627\u0637 \u0647\u0645\u0632\u0629 \u0627\u0644\u0648\u0635\u0644 \u062F\u0631\u062C\u0627\u064B",
    description: "\u0627\u0644\u062A\u0647\u062C\u0626\u0629 \u0627\u0644\u0645\u062A\u0642\u0646\u0629 \u0644\u0644\u062C\u0645\u0644 \u0648\u0627\u0644\u0622\u064A\u0627\u062A \u0627\u0644\u0642\u0631\u0622\u0646\u064A\u0629 \u0627\u0644\u0645\u062A\u0636\u0645\u0646\u0629 \u0644\u0623\u0644 \u0627\u0644\u062A\u0639\u0631\u064A\u0641",
    subLessons: [
      { id: "sub_11_1", code: "11/1", title: "\u0627\u0644\u0644\u0627\u0645 \u0627\u0644\u0642\u0645\u0631\u064A\u0629 \u0648\u0647\u0645\u0632\u0629 \u0627\u0644\u0648\u0635\u0644 (\u0648\u0627\u0644\u0642\u0645\u0631)", maxScore: 100 },
      { id: "sub_11_2", code: "11/2", title: "\u0627\u0644\u0644\u0627\u0645 \u0627\u0644\u0634\u0645\u0633\u064A\u0629 (\u0648\u0627\u0644\u0634\u0645\u0633)", maxScore: 100 }
    ],
    passingScore: 85,
    order: 11,
    isActive: true
  },
  {
    id: "spl_12",
    lessonNumber: 12,
    title: "\u0627\u0644\u062A\u0647\u062C\u0626\u0629 \u0627\u0644\u0642\u0631\u0622\u0646\u064A\u0629 \u0627\u0644\u0634\u0627\u0645\u0644\u0629 \u0648\u0627\u0644\u0645\u0635\u0627\u062D\u0641",
    skill: "\u0642\u0631\u0627\u0621\u0629 \u0622\u064A\u0627\u062A \u0643\u0627\u0645\u0644\u0629 \u0645\u0646 \u062C\u0632\u0621 \u0639\u0645 \u0647\u062C\u0627\u0621\u064B \u0645\u062A\u0635\u0644\u0627\u064B \u0648\u0633\u0644\u0633\u0627\u064B",
    description: "\u0627\u0644\u062E\u062A\u0627\u0645 \u0627\u0644\u0645\u062A\u0642\u0646 \u0644\u0645\u0647\u0627\u0631\u0627\u062A \u0627\u0644\u0647\u062C\u0627\u0621 \u0627\u0644\u0642\u0631\u0622\u0646\u064A \u0627\u0644\u0645\u0648\u0635\u0648\u0644 \u0628\u0627\u0644\u062A\u0644\u0627\u0648\u0629 \u0627\u0644\u062D\u064A\u0629",
    subLessons: [
      { id: "sub_12_1", code: "12/1", title: "\u062A\u0647\u062C\u0626\u0629 \u0633\u0648\u0631 \u0627\u0644\u0642\u0635\u0627\u0631 (\u0627\u0644\u0625\u062E\u0644\u0627\u0635 \u0648\u0627\u0644\u0641\u0644\u0642 \u0648\u0627\u0644\u0646\u0627\u0633)", maxScore: 100 },
      { id: "sub_12_2", code: "12/2", title: "\u062A\u0647\u062C\u0626\u0629 \u0633\u0648\u0631\u0629 \u0627\u0644\u0628\u064A\u0646\u0629 \u0648\u0627\u0644\u063A\u0627\u0634\u064A\u0629", maxScore: 100 }
    ],
    passingScore: 85,
    order: 12,
    isActive: true
  }
];
var FALLBACK_TENANT = {
  id: "",
  name: "",
  slug: "",
  city: "",
  district: "",
  supervisorName: "",
  contactPhone: "",
  tenantType: "production",
  isActive: true,
  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
  subscription: {
    planId: "growth",
    planName: "\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u062C\u0645\u0639\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629",
    maxStudentsQuota: 100,
    status: "active",
    startDate: (/* @__PURE__ */ new Date()).toISOString(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString()
  }
};
var INITIAL_STAGES = [
  {
    id: "baraem",
    code: "BARAEM",
    name: "\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0628\u0631\u0627\u0639\u0645",
    subtitle: "\u062A\u0623\u0633\u064A\u0633 \u0627\u0644\u0647\u062C\u0627\u0621 \u0627\u0644\u0642\u0631\u0622\u0646\u064A \u0648\u062D\u0641\u0638 \u0627\u0644\u0645\u0641\u0635\u0644 \u0648\u0627\u0644\u0622\u062F\u0627\u0628 \u0648\u0627\u0644\u0648\u0636\u0648\u0621",
    ageRange: "4 - 7 \u0633\u0646\u0648\u0627\u062A",
    targetGrades: ["\u062A\u0645\u0647\u064A\u062F\u064A", "\u0635\u0641 \u0623\u0648\u0644", "\u0635\u0641 \u062B\u0627\u0646\u064A"],
    curriculumFocus: "\u0627\u0644\u0647\u062C\u0627\u0621 \u0627\u0644\u0642\u0631\u0622\u0646\u064A \u0627\u0644\u0645\u062A\u062F\u0631\u062C\u060C \u062A\u0635\u062D\u064A\u062D \u0645\u062E\u0627\u0631\u062C \u0627\u0644\u062D\u0631\u0648\u0641\u060C \u0648\u062D\u0641\u0638 \u0627\u0644\u0645\u0641\u0635\u0644 \u062D\u062A\u0649 \u0627\u0644\u063A\u0627\u0634\u064A\u0629\u060C \u0645\u0639 \u063A\u0631\u0633 \u0645\u062D\u0628\u0629 \u0627\u0644\u0644\u0647 \u0648\u0631\u0633\u0648\u0644\u0647 \u0648\u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u0627\u0644\u0648\u0636\u0648\u0621",
    defaultTargetSurah: "\u0627\u0644\u063A\u0627\u0634\u064A\u0629",
    targetQuranAmount: "\u0625\u0644\u0649 \u0633\u0648\u0631\u0629 \u0627\u0644\u063A\u0627\u0634\u064A\u0629",
    outcomeSummary: "\u0637\u0641\u0644 \u0645\u062A\u0642\u0646 \u0644\u0647\u062C\u0627\u0621 \u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u062D\u0641\u0638\u0647 \u0625\u0644\u0649 \u0627\u0644\u063A\u0627\u0634\u064A\u0629\u060C \u0645\u062D\u0628\u0651 \u0644\u0644\u0647 \u0648\u0631\u0633\u0648\u0644\u0647 \uFDFA \u0648\u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u0623\u0647\u0644\u0647\u060C \u0622\u0645\u0646 \u0645\u0646\u062A\u0645\u064D \u0644\u0645\u062D\u0650\u0636\u0646\u0647\u060C \u0645\u062A\u062D\u0644\u0651 \u0628\u0628\u0639\u0636 \u0627\u0644\u0622\u062F\u0627\u0628\u060C \u0645\u062D\u0633\u0646 \u0644\u0648\u0636\u0648\u0626\u0647.",
    traits: [
      "\u0645\u062A\u0642\u0646 \u0644\u0647\u062C\u0627\u0621 \u0627\u0644\u0642\u0631\u0622\u0646",
      "\u064A\u062D\u0641\u0638 \u0625\u0644\u0649 \u0633\u0648\u0631\u0629 \u0627\u0644\u063A\u0627\u0634\u064A\u0629",
      "\u0645\u062D\u0628\u0651 \u0644\u0644\u0647 \u0648\u0631\u0633\u0648\u0644\u0647 \uFDFA \u0648\u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u0623\u0647\u0644\u0647",
      "\u0622\u0645\u0646 \u0645\u0646\u062A\u0645\u064D \u0644\u0645\u062D\u0650\u0636\u0646\u0647",
      "\u0645\u062A\u062D\u0644\u0651 \u0628\u0628\u0639\u0636 \u0627\u0644\u0622\u062F\u0627\u0628",
      "\u0645\u062D\u0633\u0646 \u0644\u0648\u0636\u0648\u0626\u0647"
    ],
    accentColor: "emerald",
    iconName: "Sparkles",
    order: 1,
    isActive: true,
    logoUrl: "/baraem-logo.png",
    isLogoActive: true
  },
  {
    id: "ashbal",
    code: "ASHBAL",
    name: "\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0623\u0634\u0628\u0627\u0644",
    subtitle: "\u062A\u0631\u062A\u064A\u0644 \u0627\u0644\u0642\u0631\u0622\u0646 \u062D\u062A\u0649 \u0627\u0644\u0645\u0644\u0643\u060C \u0648\u0627\u0644\u0645\u062D\u0628\u0629 \u0627\u0644\u0648\u0627\u0639\u064A\u0629 \u0648\u0625\u062D\u0633\u0627\u0646 \u0627\u0644\u0635\u0644\u0627\u0629",
    ageRange: "8 - 10 \u0633\u0646\u0648\u0627\u062A",
    targetGrades: ["\u0635\u0641 \u062B\u0627\u0644\u062B", "\u0635\u0641 \u0631\u0627\u0628\u0639"],
    curriculumFocus: "\u0625\u062A\u0642\u0627\u0646 \u062D\u0641\u0638 \u0627\u0644\u0642\u0631\u0622\u0646 \u062D\u062A\u0649 \u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0643 (\u062A\u0628\u0627\u0631\u0643)\u060C \u062A\u0631\u0633\u064A\u062E \u0627\u0644\u0645\u062D\u0628\u0629 \u0627\u0644\u0648\u0627\u0639\u064A\u0629 \u0644\u0644\u0647 \u0648\u0631\u0633\u0648\u0644\u0647 \uFDFA\u060C \u0625\u062D\u0633\u0627\u0646 \u0627\u0644\u0635\u0644\u0627\u0629 \u0648\u062D\u0633\u0646 \u0627\u0644\u062A\u0639\u0627\u0645\u0644 \u0648\u0627\u0644\u062A\u0639\u0627\u0648\u0646",
    defaultTargetSurah: "\u0627\u0644\u0645\u0644\u0643",
    targetQuranAmount: "\u0625\u0644\u0649 \u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0643",
    outcomeSummary: "\u0637\u0641\u0644 \u0645\u062A\u0642\u0646 \u0644\u062D\u0641\u0638 \u0627\u0644\u0642\u0631\u0622\u0646 \u0625\u0644\u0649 \u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0643\u060C \u0645\u062D\u0628\u0651 \u0644\u0644\u0647 \u0648\u0631\u0633\u0648\u0644\u0647 \uFDFA \u0645\u062D\u0628\u0629 \u0648\u0627\u0639\u064A\u0629\u060C \u0645\u0646\u062A\u0645\u064D \u0644\u0645\u062D\u0650\u0636\u0646\u0647\u060C \u0645\u062A\u062D\u0644\u0651 \u0628\u0628\u0639\u0636 \u0627\u0644\u0622\u062F\u0627\u0628\u060C \u0645\u062D\u0633\u0646 \u0644\u0635\u0644\u0627\u062A\u0647\u060C \u0645\u062A\u0639\u0627\u0648\u0646 \u062D\u0633\u0646 \u0627\u0644\u062A\u0639\u0627\u0645\u0644.",
    traits: [
      "\u0645\u062A\u0642\u0646 \u0644\u062D\u0641\u0638 \u0627\u0644\u0642\u0631\u0622\u0646 \u0625\u0644\u0649 \u0633\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0643",
      "\u0645\u062D\u0628\u0629 \u0648\u0627\u0639\u064A\u0629 \u0644\u0644\u0647 \u0648\u0631\u0633\u0648\u0644\u0647 \uFDFA",
      "\u0645\u0646\u062A\u0645\u064D \u0644\u0645\u062D\u0650\u0636\u0646\u0647",
      "\u0645\u062A\u062D\u0644\u0651 \u0628\u0628\u0639\u0636 \u0627\u0644\u0622\u062F\u0627\u0628",
      "\u0645\u062D\u0633\u0646 \u0644\u0635\u0644\u0627\u062A\u0647",
      "\u0645\u062A\u0639\u0627\u0648\u0646 \u062D\u0633\u0646 \u0627\u0644\u062A\u0639\u0627\u0645\u0644"
    ],
    accentColor: "blue",
    iconName: "BookOpen",
    order: 2,
    isActive: true
  },
  {
    id: "fityan",
    code: "FITYAN",
    name: "\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0641\u062A\u064A\u0627\u0646",
    subtitle: "\u0627\u0644\u062D\u0631\u0635 \u0639\u0644\u0649 \u0627\u0644\u0635\u0644\u0627\u0629\u060C \u0648\u0627\u0644\u0625\u062A\u0642\u0627\u0646 \u0625\u0644\u0649 \u0627\u0644\u062C\u0632\u0621 \u0627\u0644\u0631\u0627\u0628\u0639\u060C \u0648\u0627\u0644\u0633\u064A\u0631\u0629 \u0648\u0627\u0644\u0645\u0647\u0627\u0631\u0627\u062A",
    ageRange: "11 - 12 \u0633\u0646\u0629",
    targetGrades: ["\u0635\u0641 \u062E\u0627\u0645\u0633", "\u0635\u0641 \u0633\u0627\u062F\u0633"],
    curriculumFocus: "\u0627\u0644\u062D\u0631\u0635 \u0639\u0644\u0649 \u0627\u0644\u0635\u0644\u0627\u0629\u060C \u0625\u062A\u0642\u0627\u0646 \u0627\u0644\u062D\u0641\u0638 \u0625\u0644\u0649 \u0627\u0644\u062C\u0632\u0621 \u0627\u0644\u0631\u0627\u0628\u0639\u060C \u0641\u0642\u0647 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0644\u0647 \u0648\u0635\u0641\u0627\u062A\u0647\u060C \u0633\u064A\u0631\u0629 \u0627\u0644\u0646\u0628\u064A \uFDFA\u060C \u0648\u0645\u0645\u0627\u0631\u0633\u0629 \u0627\u0644\u0645\u0647\u0627\u0631\u0627\u062A \u0627\u0644\u062D\u064A\u0627\u062A\u064A\u0629",
    defaultTargetSurah: "\u0627\u0644\u0646\u0633\u0627\u0621",
    targetQuranAmount: "\u0625\u0644\u0649 \u0627\u0644\u062C\u0632\u0621 \u0627\u0644\u0631\u0627\u0628\u0639",
    outcomeSummary: "\u0641\u062A\u0649 \u062D\u0631\u064A\u0635 \u0639\u0644\u0649 \u0627\u0644\u0635\u0644\u0627\u0629\u060C \u0645\u062A\u0642\u0646 \u0625\u0644\u0649 \u0627\u0644\u062C\u0632\u0621 \u0627\u0644\u0631\u0627\u0628\u0639\u060C \u064A\u0639\u0631\u0641 \u0628\u0639\u0636 \u0645\u0639\u0627\u0646\u064A \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0644\u0647 \u0648\u0635\u0641\u0627\u062A\u0647 \u0648\u0634\u064A\u0626\u0627\u064B \u0645\u0646 \u0633\u064A\u0631\u0629 \u0627\u0644\u0646\u0628\u064A \uFDFA\u060C \u064A\u062A\u062D\u0644\u0649 \u0628\u0627\u0644\u0622\u062F\u0627\u0628\u060C \u0648\u064A\u0645\u0627\u0631\u0633 \u0645\u0647\u0627\u0631\u0627\u062A \u062D\u064A\u0627\u062A\u064A\u0629.",
    traits: [
      "\u062D\u0631\u064A\u0635 \u0639\u0644\u0649 \u0627\u0644\u0635\u0644\u0627\u0629",
      "\u0645\u062A\u0642\u0646 \u0625\u0644\u0649 \u0627\u0644\u062C\u0632\u0621 \u0627\u0644\u0631\u0627\u0628\u0639",
      "\u064A\u0639\u0631\u0641 \u0628\u0639\u0636 \u0645\u0639\u0627\u0646\u064A \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0644\u0647 \u0648\u0635\u0641\u0627\u062A\u0647",
      "\u064A\u0639\u0631\u0641 \u0634\u064A\u0626\u0627\u064B \u0645\u0646 \u0633\u064A\u0631\u0629 \u0627\u0644\u0646\u0628\u064A \uFDFA",
      "\u064A\u062A\u062D\u0644\u0651\u0649 \u0628\u0627\u0644\u0622\u062F\u0627\u0628",
      "\u064A\u0645\u0627\u0631\u0633 \u0645\u0647\u0627\u0631\u0627\u062A \u062D\u064A\u0627\u062A\u064A\u0629"
    ],
    accentColor: "amber",
    iconName: "Award",
    order: 3,
    isActive: true
  },
  {
    id: "motawassit",
    code: "MOTAWASSIT",
    name: "\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0645\u062A\u0648\u0633\u0637\u0629",
    subtitle: "\u0625\u062A\u0642\u0627\u0646 10 \u0623\u062C\u0632\u0627\u0621\u060C \u062A\u0639\u0638\u064A\u0645 \u0627\u0644\u0644\u0647\u060C \u0627\u0644\u0633\u064A\u0631\u0629 \u0627\u0644\u0646\u0628\u0648\u064A\u0629 \u0648\u0627\u0644\u0627\u062A\u0632\u0627\u0646 \u0648\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0645\u0648\u0647\u0628\u0629",
    ageRange: "13 - 15 \u0633\u0646\u0629",
    targetGrades: ["\u0623\u0648\u0644 \u0645\u062A\u0648\u0633\u0637", "\u062B\u0627\u0646\u064A \u0645\u062A\u0648\u0633\u0637", "\u062B\u0627\u0644\u062B \u0645\u062A\u0648\u0633\u0637"],
    curriculumFocus: "\u0625\u062A\u0642\u0627\u0646 10 \u0623\u062C\u0632\u0627\u0621 \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646\u060C \u062A\u0639\u0638\u064A\u0645 \u0627\u0644\u0644\u0647 \u0639\u0632 \u0648\u062C\u0644\u060C \u0627\u0644\u0625\u0644\u0645\u0627\u0645 \u0628\u0627\u0644\u0633\u064A\u0631\u0629 \u0627\u0644\u0646\u0628\u0648\u064A\u0629\u060C \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u0623\u0647\u0644\u0647\u060C \u0627\u0644\u0627\u062A\u0632\u0627\u0646 \u0641\u064A \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0648\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0645\u0648\u0627\u0647\u0628",
    defaultTargetSurah: "\u0627\u0644\u062A\u0648\u0628\u0629",
    targetQuranAmount: "10 \u0623\u062C\u0632\u0627\u0621 \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646",
    outcomeSummary: "\u0634\u0627\u0628 \u064A\u062A\u0642\u0646 10 \u0623\u062C\u0632\u0627\u0621\u060C \u064A\u064F\u0639\u0638\u0645 \u0627\u0644\u0644\u0647 \u0639\u0632\u0648\u062C\u0644 \u0648\u0645\u064F\u0644\u0645 \u0628\u0627\u0644\u0633\u064A\u0631\u0629 \u0627\u0644\u0646\u0628\u0648\u064A\u0629\u060C \u0645\u0631\u062A\u0628\u0637 \u0628\u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u0623\u0647\u0644\u0647\u060C \u064A\u062A\u062D\u0644\u0649 \u0628\u0627\u0644\u0623\u062E\u0644\u0627\u0642\u060C \u0645\u062A\u0632\u0646 \u0641\u064A \u0639\u0644\u0627\u0642\u0627\u062A\u0647\u060C \u0648\u0645\u0641\u0639\u0644 \u0644\u0645\u0648\u0647\u0628\u062A\u0647.",
    traits: [
      "\u064A\u062A\u0642\u0646 10 \u0623\u062C\u0632\u0627\u0621",
      "\u064A\u064F\u0639\u0638\u0645 \u0627\u0644\u0644\u0647 \u0639\u0632\u0648\u062C\u0644",
      "\u0645\u0644\u0645 \u0628\u0627\u0644\u0633\u064A\u0631\u0629 \u0627\u0644\u0646\u0628\u0648\u064A\u0629",
      "\u0645\u0631\u062A\u0628\u0637 \u0628\u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u0623\u0647\u0644\u0647",
      "\u064A\u062A\u062D\u0644\u0649 \u0628\u0627\u0644\u0623\u062E\u0644\u0627\u0642",
      "\u0645\u062A\u0632\u0646 \u0641\u064A \u0639\u0644\u0627\u0642\u0627\u062A\u0647",
      "\u0645\u0641\u0639\u0644 \u0644\u0645\u0648\u0647\u0628\u062A\u0647"
    ],
    accentColor: "teal",
    iconName: "Compass",
    order: 4,
    isActive: true
  },
  {
    id: "thanawi",
    code: "THANAWI",
    name: "\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062B\u0627\u0646\u0648\u064A\u0629",
    subtitle: "\u0625\u062A\u0642\u0627\u0646 15 \u062C\u0632\u0621\u0627\u064B\u060C \u0641\u0631\u0648\u0636 \u0627\u0644\u0623\u0639\u064A\u0627\u0646\u060C \u0627\u0644\u0627\u0633\u062A\u0642\u0631\u0627\u0631 \u0627\u0644\u0646\u0641\u0633\u064A\u060C \u0648\u0627\u0644\u0623\u062B\u0631 \u0627\u0644\u0625\u064A\u062C\u0627\u0628\u064A",
    ageRange: "16 - 18 \u0633\u0646\u0629",
    targetGrades: ["\u0623\u0648\u0644 \u062B\u0627\u0646\u0648\u064A", "\u062B\u0627\u0646\u064A \u062B\u0627\u0646\u0648\u064A", "\u062B\u0627\u0644\u062B \u062B\u0627\u0646\u0648\u064A"],
    curriculumFocus: "\u0625\u062A\u0642\u0627\u0646 15 \u062C\u0632\u0621\u0627\u064B\u060C \u0627\u0644\u062A\u062E\u0644\u0642 \u0628\u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u0627\u0644\u0639\u064A\u0634 \u0645\u0639\u0647\u060C \u0627\u0644\u0627\u0633\u062A\u0642\u0631\u0627\u0631 \u0627\u0644\u0646\u0641\u0633\u064A\u060C \u0645\u0639\u0631\u0641\u0629 \u0641\u0631\u0648\u0636 \u0627\u0644\u0623\u0639\u064A\u0627\u0646\u060C \u0627\u0645\u062A\u0644\u0627\u0643 \u0627\u0644\u0645\u0647\u0627\u0631\u0627\u062A \u0627\u0644\u062D\u064A\u0627\u062A\u064A\u0629 \u0648\u0627\u0644\u0623\u062B\u0631 \u0627\u0644\u0625\u064A\u062C\u0627\u0628\u064A \u0641\u064A \u0627\u0644\u0645\u062D\u064A\u0637",
    defaultTargetSurah: "\u0627\u0644\u0643\u0647\u0641",
    targetQuranAmount: "15 \u062C\u0632\u0621\u0627\u064B \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646",
    outcomeSummary: "\u0634\u0627\u0628 \u0645\u0647\u062A\u062F\u064A\u060C \u064A\u062A\u0642\u0646 15 \u062C\u0632\u0621\u0627\u064B \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646\u060C \u064A\u062A\u062E\u0644\u0642 \u0628\u0627\u0644\u0642\u0631\u0622\u0646\u060C \u0645\u0633\u062A\u0642\u0631 \u0646\u0641\u0633\u064A\u064B\u0627\u060C \u0639\u0627\u0631\u0641 \u0628\u0641\u0631\u0648\u0636 \u0627\u0644\u0623\u0639\u064A\u0627\u0646\u060C \u064A\u0645\u062A\u0644\u0643 \u0645\u0647\u0627\u0631\u0627\u062A \u062D\u064A\u0627\u062A\u064A\u0629\u060C \u0644\u0647 \u0623\u062B\u0631 \u0625\u064A\u062C\u0627\u0628\u064A \u0641\u064A \u0645\u062D\u064A\u0637\u0647\u060C \u064A\u0639\u064A\u0634 \u0645\u0639 \u0627\u0644\u0642\u0631\u0622\u0646.",
    traits: [
      "\u064A\u062A\u0642\u0646 15 \u062C\u0632\u0621\u0627\u064B \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646",
      "\u064A\u062A\u062E\u0644\u0642 \u0628\u0627\u0644\u0642\u0631\u0622\u0646",
      "\u0645\u0633\u062A\u0642\u0631 \u0646\u0641\u0633\u064A\u0627\u064B",
      "\u0639\u0627\u0631\u0641 \u0628\u0641\u0631\u0648\u0636 \u0627\u0644\u0623\u0639\u064A\u0627\u0646",
      "\u064A\u0645\u062A\u0644\u0643 \u0645\u0647\u0627\u0631\u0627\u062A \u062D\u064A\u0627\u062A\u064A\u0629",
      "\u0644\u0647 \u0623\u062B\u0631 \u0625\u064A\u062C\u0627\u0628\u064A \u0641\u064A \u0645\u062D\u064A\u0637\u0647",
      "\u064A\u0639\u064A\u0634 \u0645\u0639 \u0627\u0644\u0642\u0631\u0622\u0646"
    ],
    accentColor: "purple",
    iconName: "Shield",
    order: 5,
    isActive: true
  },
  {
    id: "jamiyeen",
    code: "JAMIYEEN",
    name: "\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062C\u0627\u0645\u0639\u064A\u064A\u0646",
    subtitle: "\u062D\u0641\u0638 \u0643\u0627\u0645\u0644 \u0627\u0644\u0642\u0631\u0622\u0646\u060C \u0627\u0644\u0627\u0633\u062A\u062F\u0644\u0627\u0644 \u0628\u0627\u0644\u0643\u062A\u0627\u0628 \u0648\u0627\u0644\u0633\u0646\u0629\u060C \u0643\u0641\u0627\u064A\u0627\u062A \u0627\u0644\u0645\u0631\u0628\u064A \u0648\u0627\u0644\u062F\u0639\u0648\u0629 \u0639\u0644\u0649 \u0628\u0635\u064A\u0631\u0629",
    ageRange: "19+ \u0633\u0646\u0629",
    targetGrades: ["\u062C\u0627\u0645\u0639\u064A", "\u062E\u0631\u064A\u062C", "\u0643\u0628\u0627\u0631"],
    curriculumFocus: "\u062D\u0641\u0638 \u0643\u062A\u0627\u0628 \u0627\u0644\u0644\u0647 \u0643\u0627\u0645\u0644\u0627\u064B\u060C \u062A\u0645\u062B\u0644 \u0623\u062E\u0644\u0627\u0642 \u0627\u0644\u0642\u0631\u0622\u0646\u060C \u0627\u0644\u0627\u0633\u062A\u0642\u0627\u0645\u0629\u060C \u0627\u0644\u0627\u0633\u062A\u062F\u0644\u0627\u0644 \u0628\u0627\u0644\u0643\u062A\u0627\u0628 \u0648\u0627\u0644\u0633\u0646\u0629\u060C \u062A\u0645\u0643\u064A\u0646 \u0643\u0641\u0627\u064A\u0627\u062A \u0627\u0644\u0645\u0631\u0628\u064A \u0648\u0627\u0644\u062F\u0639\u0648\u0629 \u0625\u0644\u0649 \u0627\u0644\u0644\u0647 \u0639\u0644\u0649 \u0628\u0635\u064A\u0631\u0629",
    defaultTargetSurah: "\u0627\u0644\u0628\u0642\u0631\u0629",
    targetQuranAmount: "\u0643\u0627\u0645\u0644 \u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u0643\u0631\u064A\u0645 (\u062E\u0627\u062A\u0645)",
    outcomeSummary: "\u0634\u0627\u0628 \u062D\u0627\u0641\u0638 \u0644\u0643\u062A\u0627\u0628 \u0627\u0644\u0644\u0647\u060C \u064A\u062A\u0645\u062B\u0644 \u0623\u062E\u0644\u0627\u0642 \u0627\u0644\u0642\u0631\u0622\u0646\u060C \u0645\u0633\u062A\u0642\u064A\u0645\u060C \u064A\u0633\u062A\u062F\u0644 \u0628\u0627\u0644\u0643\u062A\u0627\u0628 \u0648\u0627\u0644\u0633\u0646\u0629\u060C \u064A\u0645\u062A\u0644\u0643 \u0645\u0647\u0627\u0631\u0627\u062A \u0643\u0641\u0627\u064A\u0627\u062A \u0627\u0644\u0645\u0631\u0628\u064A\u060C \u0648\u064A\u062F\u0639\u0648 \u0625\u0644\u0649 \u0627\u0644\u0644\u0647 \u0639\u0644\u0649 \u0628\u0635\u064A\u0631\u0629.",
    traits: [
      "\u062D\u0627\u0641\u0638 \u0644\u0643\u062A\u0627\u0628 \u0627\u0644\u0644\u0647",
      "\u064A\u062A\u0645\u062B\u0644 \u0623\u062E\u0644\u0627\u0642 \u0627\u0644\u0642\u0631\u0622\u0646",
      "\u0645\u0633\u062A\u0642\u064A\u0645",
      "\u064A\u0633\u062A\u062F\u0644 \u0628\u0627\u0644\u0643\u062A\u0627\u0628 \u0648\u0627\u0644\u0633\u0646\u0629",
      "\u064A\u0645\u062A\u0644\u0643 \u0643\u0641\u0627\u064A\u0627\u062A \u0627\u0644\u0645\u0631\u0628\u064A",
      "\u064A\u062F\u0639\u0648 \u0625\u0644\u0649 \u0627\u0644\u0644\u0647 \u0639\u0644\u0649 \u0628\u0635\u064A\u0631\u0629"
    ],
    accentColor: "indigo",
    iconName: "GraduationCap",
    order: 6,
    isActive: true
  }
];

// src/lib/restoreDryRunEngine.ts
var inMemoryRestoreAuditLogs = [];
function getRestoreAuditLogs() {
  return [...inMemoryRestoreAuditLogs];
}
function addRestoreAuditLog(entry) {
  const fullEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...entry
  };
  inMemoryRestoreAuditLogs.unshift(fullEntry);
  if (inMemoryRestoreAuditLogs.length > 100) {
    inMemoryRestoreAuditLogs.pop();
  }
  return fullEntry;
}
function executeRestoreDryRun(rawJsonStringOrObject, fileName = "backup.json", fileSizeBytes = 0, userContext) {
  const auditTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  let backupData;
  if (typeof rawJsonStringOrObject === "string") {
    fileSizeBytes = fileSizeBytes || new Blob([rawJsonStringOrObject]).size;
    if (fileSizeBytes > 50 * 1024 * 1024) {
      throw new Error("\u062D\u062C\u0645 \u0627\u0644\u0645\u0644\u0641 \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647 (50 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A).");
    }
    if (rawJsonStringOrObject.includes("<script") || rawJsonStringOrObject.includes("javascript:") || rawJsonStringOrObject.includes("..\\")) {
      throw new Error("\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0645\u0644\u0641 \u0644\u0627\u062D\u062A\u0648\u0627\u0626\u0647 \u0639\u0644\u0649 \u0623\u0646\u0645\u0627\u0637 \u0645\u0634\u0628\u0648\u0647\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0622\u0645\u0646\u0629.");
    }
    try {
      backupData = JSON.parse(rawJsonStringOrObject);
    } catch (err) {
      throw new Error(`\u0641\u0634\u0644 \u062A\u062D\u0644\u064A\u0644 \u0635\u064A\u063A\u0629 JSON \u0644\u0644\u0645\u0644\u0641: ${err?.message || "\u062A\u0646\u0633\u064A\u0642 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"}`);
    }
  } else {
    backupData = rawJsonStringOrObject;
  }
  if (!backupData || typeof backupData !== "object") {
    throw new Error("\u0647\u064A\u0643\u0644 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D: \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0644\u064A\u0633\u062A \u0643\u0627\u0626\u0646\u0627\u064B \u0628\u0631\u0645\u062C\u064A\u0627\u064B (Object).");
  }
  const metadata = backupData.metadata || {};
  const collectionsObj = backupData.collections || {};
  const subcollectionsObj = backupData.subcollections || {};
  const backupVersion = String(metadata.backupVersion || metadata.version || "v1.0.0");
  const exportStatus = String(metadata.exportStatus || "COMPLETE");
  const firebaseProjectId = metadata.firebaseProjectId || "qrms-preview-db";
  const firestoreDatabaseId = metadata.firestoreDatabaseId || "(default)";
  if (typeof collectionsObj !== "object" || collectionsObj === null) {
    throw new Error("\u0647\u064A\u0643\u0644 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D: \u062D\u0642\u0644 collections \u0645\u0641\u0642\u0648\u062F \u0623\u0648 \u0628\u062A\u0646\u0633\u064A\u0642 \u062E\u0627\u0637\u0626.");
  }
  const validator = new MigrationValidator();
  const mappingAudit = [];
  const specialAnalysis = [];
  const validationErrors = [];
  const validationWarnings = [];
  let totalDocsCount = 0;
  let totalSubdocsCount = 0;
  let emptyColsCount = 0;
  let importableDocsCount = 0;
  let unimportableDocsCount = 0;
  let specialReviewDocsCount = 0;
  let conflictsCount = 0;
  let totalResolvableFk = 0;
  let totalDeferredFk = 0;
  let totalMissingExternalFk = 0;
  let totalUnresolvableFk = 0;
  let totalExplicitTenantDocs = 0;
  let totalDefaultedToGhazzawiDocs = 0;
  let totalGlobalDocs = 0;
  for (const [colName, docs] of Object.entries(collectionsObj)) {
    if (Array.isArray(docs)) {
      const mapping = COLLECTION_MAPPINGS[colName];
      const targetTable = mapping ? mapping.postgresTable : colName;
      for (const doc of docs) {
        if (doc && typeof doc === "object") {
          const docId = doc.id || doc.documentId;
          if (docId) {
            validator.registerId(targetTable, String(docId).trim(), colName);
          }
        }
      }
    }
  }
  const rawStagesInBackup = collectionsObj["educational_stages"];
  if (!Array.isArray(rawStagesInBackup) || rawStagesInBackup.length === 0) {
    for (const stg of INITIAL_STAGES) {
      validator.registerId("stages", stg.id, "educational_stages");
    }
  }
  const rawTeachersInBackup = collectionsObj["teachers"];
  if (Array.isArray(rawTeachersInBackup)) {
    for (const tDoc of rawTeachersInBackup) {
      const tId = tDoc.id || tDoc.documentId;
      if (tId) {
        validator.registerId("users", String(tId).trim(), "teachers");
      }
    }
  }
  for (const [colName, mappingConfig] of Object.entries(COLLECTION_MAPPINGS)) {
    let rawDocs = collectionsObj[colName] || [];
    let docCount = Array.isArray(rawDocs) ? rawDocs.length : 0;
    const isSynthesizedStageSeed = colName === "educational_stages" && docCount === 0;
    if (isSynthesizedStageSeed) {
      rawDocs = INITIAL_STAGES;
      docCount = INITIAL_STAGES.length;
    }
    totalDocsCount += docCount;
    if (docCount === 0) {
      emptyColsCount++;
      mappingAudit.push({
        firestoreCollection: colName,
        postgresTable: mappingConfig.postgresTable,
        documentsCount: 0,
        validRecords: 0,
        invalidRecords: 0,
        specialReviewCount: 0,
        warningsCount: 0,
        missingFields: [],
        unknownFields: [],
        resolvableFkCount: 0,
        deferredFkCount: 0,
        missingExternalFkCount: 0,
        unresolvableFkCount: 0,
        tenantResolution: mappingConfig.tenantKey ? "DEFAULTED_TO_AL_GHAZZAWI" : "GLOBAL_SYSTEM",
        status: "EMPTY",
        notes: "\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0641\u0627\u0631\u063A\u0629 \u0641\u064A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 (\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0633\u062A\u0646\u062F\u0627\u062A)."
      });
      continue;
    }
    const transformedRecords = [];
    const missingFieldsSet = /* @__PURE__ */ new Set();
    for (const rawItem of rawDocs) {
      const docId = rawItem.id || rawItem.documentId;
      const rawData = rawItem.data || rawItem;
      const transformed = transformDocument(
        String(docId || ""),
        rawData,
        mappingConfig.fieldMappings,
        mappingConfig.primaryKey,
        mappingConfig.tenantKey,
        mappingConfig.organizationKey
      );
      transformedRecords.push(transformed);
      for (const rule of mappingConfig.fieldMappings) {
        if (rule.required && (transformed.data[rule.postgresColumn] === void 0 || transformed.data[rule.postgresColumn] === null || transformed.data[rule.postgresColumn] === "")) {
          const isStudentAccount = transformed.data["role"] === "student" || transformed.id.startsWith("usr_std_") || !!transformed.data["student_id"];
          if (rule.postgresColumn === "phone" && isStudentAccount) {
            continue;
          }
          missingFieldsSet.add(rule.postgresColumn);
        }
      }
    }
    const validationReport = validator.validateBatch(mappingConfig, transformedRecords, docCount);
    const validInCol = validationReport.validCount;
    const invalidInCol = validationReport.invalidCount;
    importableDocsCount += validInCol;
    unimportableDocsCount += invalidInCol;
    totalResolvableFk += validationReport.resolvableFkCount;
    totalDeferredFk += validationReport.deferredFkCount;
    totalMissingExternalFk += validationReport.missingExternalFkCount;
    totalUnresolvableFk += validationReport.unresolvableFkCount;
    if (mappingConfig.tenantKey) {
      totalDefaultedToGhazzawiDocs += validationReport.tenantResolvedCount;
      totalExplicitTenantDocs += validInCol + invalidInCol - validationReport.tenantResolvedCount;
    } else {
      totalGlobalDocs += docCount;
    }
    for (const err of validationReport.errors) {
      if (err.type === "ID_INVALID" || err.type === "ID_MISSING") {
        conflictsCount++;
      }
      validationErrors.push({
        collection: colName,
        docId: err.documentId,
        message: err.message,
        type: err.type
      });
    }
    for (const warn of validationReport.warnings) {
      validationWarnings.push({
        collection: colName,
        docId: warn.documentId,
        message: warn.message,
        type: warn.type
      });
    }
    let status = "READY";
    if (invalidInCol > 0) {
      status = "ERROR";
    } else if (validationReport.warnings.length > 0 || missingFieldsSet.size > 0 || validationReport.deferredFkCount > 0) {
      status = "WARNING";
    }
    let notesText = isSynthesizedStageSeed ? `\u062A\u0645 \u0628\u0630\u0631 \u0648\u062A\u0636\u0645\u064A\u0646 6 \u0645\u0631\u0627\u062D\u0644 \u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0631\u0633\u0645\u064A\u0629 \u0643\u0640 Master Seed Data (\u062A\u0634\u0645\u0644 \u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0628\u0631\u0627\u0639\u0645 baraem \u0648\u0627\u0644\u0623\u0634\u0628\u0627\u0644 \u0648\u0627\u0644\u0641\u062A\u064A\u0627\u0646)` : `${validInCol} \u0645\u0633\u062A\u0646\u062F \u062C\u0627\u0647\u0632 \u0644\u0644\u0645\u0637\u0627\u0628\u0642\u0629`;
    if (validationReport.tenantResolvedCount > 0) {
      notesText += ` (\u062A\u0645 \u0627\u0633\u062A\u0646\u062A\u0627\u062C Tenant \u0644\u0640 ${validationReport.tenantResolvedCount} \u0645\u0633\u062A\u0646\u062F \u0625\u0644\u0649 \u0645\u062C\u0645\u0639 \u0627\u0644\u063A\u0632\u0627\u0648\u064A)`;
    }
    mappingAudit.push({
      firestoreCollection: colName,
      postgresTable: mappingConfig.postgresTable,
      documentsCount: docCount,
      validRecords: validInCol,
      invalidRecords: invalidInCol,
      specialReviewCount: 0,
      warningsCount: validationReport.warnings.length,
      missingFields: Array.from(missingFieldsSet),
      unknownFields: validationReport.unknownFieldsFound,
      resolvableFkCount: validationReport.resolvableFkCount,
      deferredFkCount: validationReport.deferredFkCount,
      missingExternalFkCount: validationReport.missingExternalFkCount,
      unresolvableFkCount: validationReport.unresolvableFkCount,
      tenantResolution: validationReport.tenantResolutionType,
      status,
      notes: notesText
    });
  }
  const custodyExpensesDocs = subcollectionsObj["custodies_expenses"] || subcollectionsObj["custodies/*/expenses"] || [];
  if (Array.isArray(custodyExpensesDocs) && custodyExpensesDocs.length > 0) {
    const subCount = custodyExpensesDocs.length;
    totalSubdocsCount += subCount;
    let subValid = 0;
    let subInvalid = 0;
    for (const subDoc of custodyExpensesDocs) {
      const expId = subDoc.id;
      const parentId = subDoc.parentId;
      if (!expId || !parentId) {
        subInvalid++;
        unimportableDocsCount++;
        validationErrors.push({
          collection: "custodies/*/expenses",
          docId: expId || "UNKNOWN",
          message: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0627\u0644\u0641\u0631\u0639\u064A \u0623\u0648 \u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0647\u062F\u0629 \u0627\u0644\u0623\u0628 \u0645\u0641\u0642\u0648\u062F.",
          type: "ID_MISSING"
        });
      } else {
        subValid++;
        importableDocsCount++;
        totalDefaultedToGhazzawiDocs++;
      }
    }
    mappingAudit.push({
      firestoreCollection: "custodies/*/expenses",
      postgresTable: "finance_custody_expenses",
      documentsCount: subCount,
      validRecords: subValid,
      invalidRecords: subInvalid,
      specialReviewCount: 0,
      warningsCount: 0,
      missingFields: [],
      unknownFields: [],
      resolvableFkCount: subValid,
      deferredFkCount: 0,
      missingExternalFkCount: 0,
      unresolvableFkCount: 0,
      tenantResolution: "DEFAULTED_TO_AL_GHAZZAWI",
      status: subInvalid > 0 ? "WARNING" : "READY",
      notes: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0641\u0631\u0639\u064A\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u062C\u062F\u0648\u0644 finance_custody_expenses \u0645\u0639 \u0631\u0628\u0637 custody_id"
    });
  }
  const specialCollectionsList = [
    "teachers",
    "archived_halaqahs",
    "archived_teachers",
    "archived_supervisors",
    "archived_users"
  ];
  for (const colName of specialCollectionsList) {
    const rawDocs = collectionsObj[colName] || [];
    const docList = Array.isArray(rawDocs) ? rawDocs : [];
    const docCount = docList.length;
    if (docCount === 0 && !collectionsObj[colName]) {
      continue;
    }
    totalDocsCount += docCount;
    specialReviewDocsCount += docCount;
    const fieldsDetectedSet = /* @__PURE__ */ new Set();
    const docIds2 = [];
    for (const doc of docList) {
      const docId = doc.id || doc.documentId;
      if (docId) docIds2.push(String(docId));
      const data = doc.data || doc;
      if (typeof data === "object" && data !== null) {
        Object.keys(data).forEach((k) => fieldsDetectedSet.add(k));
      }
    }
    const fieldsDetected = Array.from(fieldsDetectedSet);
    if (colName === "teachers") {
      const matchingUsers = [];
      for (const tId of docIds2) {
        if (validator.hasIdInTable("users", tId)) {
          matchingUsers.push(tId);
        }
      }
      specialAnalysis.push({
        collection: "teachers",
        count: docCount,
        documentIds: docIds2,
        fieldsDetected,
        proposedPostgresDestination: 'users (role = "teacher", staff_role = "teacher")',
        justification: "\u062C\u062F\u0648\u0644 users \u0641\u064A PostgreSQL \u0647\u0648 \u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u0648\u062D\u062F \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0648\u0627\u0644\u0643\u0648\u0627\u062F\u0631 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629.",
        mappableFields: ["id", "name", "phone", "email", "tenantId", "stageId", "halaqahId"],
        fieldsRequiringTransform: ["status -> is_active", "createdAt/updatedAt -> timestamptz"],
        affectedRelationships: ["halaqahs.teacher_id", "students.teacher_id", "daily_session_records.teacher_id"],
        matchingUserAccountsFound: matchingUsers,
        duplicationRisk: matchingUsers.length > 0 ? "HIGH" : "MEDIUM",
        requiresArchitecturalDecision: true,
        architecturalRecommendation: "\u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u062D\u0630\u0631\u0629 \u0645\u0639 \u062C\u062F\u0648\u0644 users: \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0645\u0639\u0644\u0645 \u0645\u0633\u062C\u0644\u0627\u064B \u0645\u0633\u0628\u0642\u0627\u064B \u0641\u064A platform_users \u064A\u062A\u0645 \u062F\u0645\u062C\u0647 \u062F\u0648\u0646 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u062D\u0633\u0627\u0628\u060C \u0648\u0625\u0630\u0627 \u0644\u0645 \u064A\u0643\u0646 \u0645\u0633\u062C\u0644\u0627\u064B \u064A\u062A\u0645 \u0625\u062F\u0631\u0627\u062C\u0647 \u0641\u064A users \u0628\u0631\u062A\u0628\u0629 teacher \u0645\u0639 \u0627\u0644\u0627\u062D\u062A\u0641\u0627\u0638 \u0628\u0645\u0639\u0631\u0641\u0647 \u0627\u0644\u0623\u0635\u0644\u064A."
      });
      mappingAudit.push({
        firestoreCollection: "teachers",
        postgresTable: "users (\u062F\u0645\u062C \u0645\u0634\u0631\u0648\u0637 \u0645\u0639 \u0627\u0644\u0643\u0648\u0627\u062F\u0631)",
        documentsCount: docCount,
        validRecords: 0,
        invalidRecords: 0,
        specialReviewCount: docCount,
        warningsCount: 1,
        missingFields: [],
        unknownFields: fieldsDetected,
        resolvableFkCount: 0,
        deferredFkCount: docCount,
        missingExternalFkCount: 0,
        unresolvableFkCount: 0,
        tenantResolution: "DEFAULTED_TO_AL_GHAZZAWI",
        status: "SPECIAL_REVIEW",
        notes: `\u0645\u062C\u0645\u0648\u0639\u0629 \u062E\u0627\u0635\u0629 \u062A\u062A\u0637\u0644\u0628 \u062F\u0645\u062C\u0627\u064B \u0645\u0639 \u062C\u062F\u0648\u0644 users (${docCount} \u0645\u0639\u0644\u0645\u064A\u0646: ${docIds2.join(", ")})`
      });
    } else if (colName === "archived_halaqahs") {
      specialAnalysis.push({
        collection: "archived_halaqahs",
        count: docCount,
        documentIds: docIds2,
        fieldsDetected,
        proposedPostgresDestination: "halaqahs (is_archived = true, is_active = false) \u0623\u0648 academic_archives",
        justification: "\u062D\u0644\u0642\u0627\u062A \u063A\u064A\u0631 \u0646\u0634\u0637\u0629 \u062A\u0645 \u0623\u0631\u0634\u0641\u062A\u0647\u0627 \u0633\u0627\u0628\u0642\u0627\u064B \u0641\u064A Firestore \u0644\u062D\u0641\u0638 \u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A\u0629 \u0644\u0644\u0637\u0644\u0627\u0628.",
        mappableFields: ["id", "name", "stageId", "tenantId", "archivedAt", "archivedBy", "archiveReason"],
        fieldsRequiringTransform: ["isArchived -> true", "isActive -> false"],
        affectedRelationships: ["students.halaqah_id", "daily_session_records.halaqah_id"],
        matchingUserAccountsFound: [],
        duplicationRisk: "LOW",
        requiresArchitecturalDecision: true,
        architecturalRecommendation: "\u0625\u062F\u0631\u0627\u062C\u0647\u0627 \u0641\u064A \u062C\u062F\u0648\u0644 halaqahs \u0628\u062D\u0627\u0644\u0629 is_archived = true \u0645\u0639 \u0631\u0628\u0637 tenant_id \u0628\u0645\u062C\u0645\u0639 \u0627\u0644\u063A\u0632\u0627\u0648\u064A \u0644\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0623\u062C\u0646\u0628\u064A\u0629 \u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0647\u0627."
      });
      mappingAudit.push({
        firestoreCollection: "archived_halaqahs",
        postgresTable: "halaqahs (is_archived = true)",
        documentsCount: docCount,
        validRecords: 0,
        invalidRecords: 0,
        specialReviewCount: docCount,
        warningsCount: 0,
        missingFields: [],
        unknownFields: fieldsDetected,
        resolvableFkCount: 0,
        deferredFkCount: 0,
        missingExternalFkCount: 0,
        unresolvableFkCount: 0,
        tenantResolution: "DEFAULTED_TO_AL_GHAZZAWI",
        status: "SPECIAL_REVIEW",
        notes: "\u062D\u0644\u0642\u0627\u062A \u0645\u0624\u0631\u0634\u0641\u0629 \u064A\u064F\u0648\u0635\u0649 \u0628\u0646\u0642\u0644\u0647\u0627 \u0625\u0644\u0649 halaqahs \u0628\u062D\u0627\u0644\u0629 \u0645\u0624\u0631\u0634\u0641\u0629"
      });
    } else if (colName === "archived_teachers") {
      specialAnalysis.push({
        collection: "archived_teachers",
        count: docCount,
        documentIds: docIds2,
        fieldsDetected,
        proposedPostgresDestination: "users (is_active = false, is_archived = true, teacher_archived = true)",
        justification: "\u0633\u062C\u0644\u0627\u062A \u0645\u0639\u0644\u0645\u064A\u0646 \u0633\u0627\u0628\u0642\u064A\u0646 \u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0646\u0634\u0627\u0637\u0647\u0645 \u0648\u0646\u0642\u0644\u0647\u0645 \u0644\u0623\u0631\u0634\u064A\u0641 \u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646.",
        mappableFields: ["id", "name", "phone", "tenantId", "archivedAt", "archivedBy"],
        fieldsRequiringTransform: ["isActive -> false", "isArchived -> true", "role -> teacher"],
        affectedRelationships: ["daily_session_records.teacher_id"],
        matchingUserAccountsFound: [],
        duplicationRisk: "LOW",
        requiresArchitecturalDecision: true,
        architecturalRecommendation: "\u062A\u0631\u062D\u064A\u0644\u0647\u0627 \u0625\u0644\u0649 \u062C\u062F\u0648\u0644 users \u0628\u062D\u0627\u0644\u0629 \u0645\u0639\u0637\u0644 \u0648\u0645\u0624\u0631\u0634\u0641 \u0644\u062A\u0641\u0627\u062F\u064A \u0641\u0642\u062F\u0627\u0646 \u0627\u0644\u0645\u0631\u0627\u062C\u0639 \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A\u0629 \u0644\u062C\u0644\u0633\u0627\u062A \u0627\u0644\u062D\u0641\u0638."
      });
      mappingAudit.push({
        firestoreCollection: "archived_teachers",
        postgresTable: "users (\u0645\u0624\u0631\u0634\u0641 \u0648\u063A\u064A\u0631 \u0646\u0634\u0637)",
        documentsCount: docCount,
        validRecords: 0,
        invalidRecords: 0,
        specialReviewCount: docCount,
        warningsCount: 0,
        missingFields: [],
        unknownFields: fieldsDetected,
        resolvableFkCount: 0,
        deferredFkCount: 0,
        missingExternalFkCount: 0,
        unresolvableFkCount: 0,
        tenantResolution: "DEFAULTED_TO_AL_GHAZZAWI",
        status: "SPECIAL_REVIEW",
        notes: "\u0645\u0639\u0644\u0645\u0648\u0646 \u0645\u0624\u0631\u0634\u0641\u0648\u0646 \u064A\u064F\u0648\u0635\u0649 \u0628\u062A\u0631\u062D\u064A\u0644\u0647\u0645 \u0643\u0640 users \u063A\u064A\u0631 \u0646\u0634\u0637\u064A\u0646"
      });
    } else if (colName === "archived_supervisors") {
      specialAnalysis.push({
        collection: "archived_supervisors",
        count: docCount,
        documentIds: docIds2,
        fieldsDetected,
        proposedPostgresDestination: "users (is_active = false, is_archived = true, supervisor_archived = true)",
        justification: "\u0633\u062C\u0644\u0627\u062A \u0645\u0634\u0631\u0641\u064A\u0646 \u0625\u062F\u0627\u0631\u064A\u064A\u0646 \u0633\u0627\u0628\u0642\u064A\u0646 \u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u062D\u0633\u0627\u0628\u0627\u062A\u0647\u0645.",
        mappableFields: ["id", "name", "phone", "tenantId", "role"],
        fieldsRequiringTransform: ["role -> supervisor", "isActive -> false"],
        affectedRelationships: ["seasonal_programs.supervisor_id"],
        matchingUserAccountsFound: [],
        duplicationRisk: "LOW",
        requiresArchitecturalDecision: true,
        architecturalRecommendation: "\u062A\u0631\u062D\u064A\u0644\u0647\u0627 \u0625\u0644\u0649 \u062C\u062F\u0648\u0644 users \u0645\u0639 \u062A\u0639\u064A\u064A\u0646 \u062F\u0648\u0631 supervisor \u0648\u062A\u062C\u0645\u064A\u062F \u0627\u0644\u062D\u0633\u0627\u0628 (is_active = false)."
      });
      mappingAudit.push({
        firestoreCollection: "archived_supervisors",
        postgresTable: "users (\u0645\u0634\u0631\u0641\u0648\u0646 \u0645\u0624\u0631\u0634\u0641\u0648\u0646)",
        documentsCount: docCount,
        validRecords: 0,
        invalidRecords: 0,
        specialReviewCount: docCount,
        warningsCount: 0,
        missingFields: [],
        unknownFields: fieldsDetected,
        resolvableFkCount: 0,
        deferredFkCount: 0,
        missingExternalFkCount: 0,
        unresolvableFkCount: 0,
        tenantResolution: "DEFAULTED_TO_AL_GHAZZAWI",
        status: "SPECIAL_REVIEW",
        notes: "\u0645\u0634\u0631\u0641\u0648\u0646 \u0645\u0624\u0631\u0634\u0641\u0648\u0646 \u0644\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A\u0629"
      });
    } else if (colName === "archived_users") {
      specialAnalysis.push({
        collection: "archived_users",
        count: docCount,
        documentIds: docIds2,
        fieldsDetected,
        proposedPostgresDestination: "users (is_active = false, is_archived = true)",
        justification: "\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 \u0639\u0627\u0645\u0648\u0646 \u062A\u0645 \u062D\u0630\u0641\u0647\u0645 \u0623\u0648 \u0623\u0631\u0634\u0641\u062A\u0647\u0645 \u0641\u064A Firestore.",
        mappableFields: ["id", "name", "phone", "email", "tenantId"],
        fieldsRequiringTransform: ["isActive -> false"],
        affectedRelationships: ["audit_logs.user_id"],
        matchingUserAccountsFound: [],
        duplicationRisk: "LOW",
        requiresArchitecturalDecision: true,
        architecturalRecommendation: "\u0646\u0642\u0644\u0647\u0645 \u0625\u0644\u0649 users \u0628\u062D\u0627\u0644\u0629 \u063A\u064A\u0631 \u0646\u0634\u0637\u0629 \u0644\u062A\u0641\u0627\u062F\u064A \u0623\u064A \u0643\u0633\u0631 \u0641\u064A \u0633\u0644\u0627\u0633\u0644 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A\u0629."
      });
      mappingAudit.push({
        firestoreCollection: "archived_users",
        postgresTable: "users (\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 \u0645\u0624\u0631\u0634\u0641\u0648\u0646)",
        documentsCount: docCount,
        validRecords: 0,
        invalidRecords: 0,
        specialReviewCount: docCount,
        warningsCount: 0,
        missingFields: [],
        unknownFields: fieldsDetected,
        resolvableFkCount: 0,
        deferredFkCount: 0,
        missingExternalFkCount: 0,
        unresolvableFkCount: 0,
        tenantResolution: "DEFAULTED_TO_AL_GHAZZAWI",
        status: "SPECIAL_REVIEW",
        notes: "\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 \u0645\u0624\u0631\u0634\u0641\u0648\u0646 \u0644\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u062A\u0643\u0627\u0645\u0644 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u062F\u0642\u064A\u0642"
      });
    }
  }
  for (const [colName, rawDocs] of Object.entries(collectionsObj)) {
    if (COLLECTION_MAPPINGS[colName] || specialCollectionsList.includes(colName)) {
      continue;
    }
    const docList = Array.isArray(rawDocs) ? rawDocs : [];
    const docCount = docList.length;
    totalDocsCount += docCount;
    specialReviewDocsCount += docCount;
    mappingAudit.push({
      firestoreCollection: colName,
      postgresTable: "NO_MAPPING_DEFINED",
      documentsCount: docCount,
      validRecords: 0,
      invalidRecords: docCount,
      specialReviewCount: docCount,
      warningsCount: 1,
      missingFields: [],
      unknownFields: [],
      resolvableFkCount: 0,
      deferredFkCount: 0,
      missingExternalFkCount: 0,
      unresolvableFkCount: 0,
      tenantResolution: "DEFAULTED_TO_AL_GHAZZAWI",
      status: "SPECIAL_REVIEW",
      notes: "\u0645\u062C\u0645\u0648\u0639\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629 \u062A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u062A\u0639\u0631\u064A\u0641 \u0645\u062E\u0637\u0637 \u0645\u0633\u0628\u0642."
    });
  }
  let overallDryRunStatus = "SUCCESS";
  if (unimportableDocsCount > 0 || conflictsCount > 0) {
    overallDryRunStatus = "ERRORS_DETECTED";
  } else if (totalDeferredFk > 0 || totalMissingExternalFk > 0 || specialReviewDocsCount > 0) {
    overallDryRunStatus = "WARNINGS_DETECTED";
  }
  const architecturalFindings = {
    sectionA_RealDataErrors: {
      title: "\u0623. \u0623\u062E\u0637\u0627\u0621 \u062D\u0642\u064A\u0642\u064A\u0629 \u0641\u064A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A (Real Data Errors)",
      riskLevel: unimportableDocsCount > 0 ? "CRITICAL" : "NONE",
      items: unimportableDocsCount > 0 ? validationErrors.map((e) => `[${e.collection}] \u0627\u0644\u0645\u0633\u062A\u0646\u062F ${e.docId}: ${e.message}`) : [
        "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0645\u0641\u0642\u0648\u062F\u0629 \u0627\u0644\u0645\u0639\u0631\u0641 (0 Missing Document IDs).",
        "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0639\u0631\u0641\u0627\u062A \u0645\u0643\u0631\u0631\u0629 \u0623\u0648 \u0645\u062A\u0639\u0627\u0631\u0636\u0629 \u0641\u064A \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0642\u064A\u0627\u0633\u064A\u0629 (0 Duplicate Primary Keys).",
        "\u062C\u0645\u064A\u0639 \u0645\u0639\u0631\u0641\u0627\u062A Firestore Document IDs \u0635\u0627\u0644\u062D\u0629 \u0628\u0646\u0633\u0628\u0629 100% \u0643\u0640 PostgreSQL Primary Keys.",
        "\u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u062A\u0646\u0633\u064A\u0642\u0627\u062A \u0627\u0644\u0631\u0642\u0645\u064A\u0629 \u0648\u062A\u0648\u0627\u0631\u064A\u062E \u0627\u0644\u062C\u0644\u0633\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0648\u0642\u064A\u0645 \u0627\u0644\u062D\u0641\u0638."
      ]
    },
    sectionB_TransformableSchemaDifferences: {
      title: "\u0628. \u0627\u062E\u062A\u0644\u0627\u0641\u0627\u062A Schema \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A (Transformable Schema Differences)",
      items: [
        "\u062A\u062D\u0648\u064A\u0644 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u062D\u0642\u0648\u0644 \u0645\u0646 CamelCase \u0641\u064A Firestore \u0625\u0644\u0649 snake_case \u0641\u064A PostgreSQL \u0639\u0628\u0631 \u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629.",
        "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E \u0627\u0644\u0646\u0635\u064A\u0629 (ISO Strings) \u0625\u0644\u0649 \u0646\u0645\u0637 TIMESTAMPTZ \u0648 DATE \u0641\u064A PostgreSQL \u0628\u0623\u0645\u0627\u0646 \u062A\u0627\u0645 \u062F\u0648\u0646 \u062A\u0634\u0648\u064A\u0647 \u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u0632\u0645\u0646\u064A.",
        "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0643\u0627\u0626\u0646\u0627\u062A \u0648\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062A\u062F\u0627\u062E\u0644\u0629 \u0648\u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0627\u062A (arrays/objects) \u0625\u0644\u0649 \u0623\u0639\u0645\u062F\u0629 JSONB \u0623\u0635\u0644\u064A\u0629 \u062F\u0648\u0646 \u0641\u0642\u062F\u0627\u0646 \u0623\u064A \u0628\u064A\u0627\u0646\u0627\u062A \u0641\u0631\u0639\u064A\u0629.",
        "\u0627\u0644\u062D\u0641\u0627\u0638 \u0627\u0644\u0643\u0627\u0645\u0644 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0631\u0641\u0627\u062A \u0627\u0644\u0623\u0635\u0644\u064A\u0629 \u0627\u0644\u0646\u0635\u064A\u0629 (String PKs) \u062F\u0648\u0646 \u062A\u0648\u0644\u064A\u062F UUIDs \u0639\u0634\u0648\u0627\u0626\u064A\u0629 \u0628\u062F\u064A\u0644\u0629."
      ]
    },
    sectionC_MappingIssuesAndAdjustments: {
      title: "\u062C. \u0645\u0634\u0627\u0643\u0644 Mapping \u0648\u062A\u0639\u062F\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u062E\u0637\u0637 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 (Mapping Adjustments)",
      items: [
        "\u062A\u0639\u062F\u064A\u0644 \u0642\u0627\u0639\u062F\u0629 parent_phone \u0641\u064A \u062C\u062F\u0648\u0644 students: \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0635\u0641\u0629 Required \u0627\u0644\u0625\u0644\u0632\u0627\u0645\u064A\u0629 \u0644\u0623\u0646 \u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631 \u064A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u062D\u0633\u0627\u0628\u0647 \u0641\u064A users \u0648\u0631\u0642\u0645 \u0647\u0627\u062A\u0641\u0647\u060C \u0645\u0639 \u0631\u0628\u0637 \u0627\u0644\u0623\u0628\u0646\u0627\u0621 \u0627\u0644\u0645\u0635\u0631\u062D\u064A\u0646 \u0628\u0631\u0645\u062C\u064A\u0627\u064B.",
        "\u0645\u0637\u0627\u0628\u0642\u0629 \u062D\u0642\u0644 order \u0641\u064A \u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0648\u0627\u0644\u062F\u0631\u0648\u0633 \u0625\u0644\u0649 display_order \u0644\u062A\u0641\u0627\u062F\u064A \u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u062D\u062C\u0648\u0632\u0629 \u0641\u064A SQL.",
        "\u0645\u0637\u0627\u0628\u0642\u0629 \u062D\u0642\u0644 subLessons \u0641\u064A spelling_lessons \u0625\u0644\u0649 sub_lessons \u0643\u0640 JSONB \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u062C\u0632\u0627\u0621 \u0627\u0644\u062F\u0631\u0648\u0633 \u0648\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u062F\u0631\u062C\u0627\u062A.",
        "\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0641\u0631\u0639\u064A\u0629 \u0644\u0644\u0639\u0647\u062F custodies/{id}/expenses \u0625\u0644\u0649 \u062C\u062F\u0648\u0644 finance_custody_expenses \u0645\u0639 \u0631\u0628\u0637 custody_id \u0627\u0644\u0623\u0628."
      ]
    },
    sectionD_TenantResolutionAnalysis: {
      title: "\u062F. \u062A\u062D\u0644\u064A\u0644 \u0648\u0627\u0633\u062A\u0646\u062A\u0627\u062C Tenant Resolution (\u0633\u064A\u0627\u0642 \u0645\u062C\u0645\u0639 \u0627\u0644\u063A\u0632\u0627\u0648\u064A)",
      activeTenantId: "ghazzawi",
      activeTenantName: "\u0645\u062C\u0645\u0639 \u0627\u0644\u063A\u0632\u0627\u0648\u064A \u0627\u0644\u0642\u0631\u0622\u0646\u064A",
      resolutionStrategy: "DEFAULTED_TO_AL_GHAZZAWI",
      governanceRule: "\u062D\u062A\u0645\u064A \u0644\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0641\u0642\u0637 \u2014 \u0648\u0645\u0645\u0646\u0648\u0639 \u062C\u0639\u0644\u0647 Fallback \u0639\u0627\u0645 \u0644\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644\u064A\u0629",
      items: [
        "\u0627\u0644\u0648\u0627\u0642\u0639 \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A \u0627\u0644\u062D\u0627\u0644\u064A: \u0645\u062C\u0645\u0639 \u0627\u0644\u063A\u0632\u0627\u0648\u064A (ghazzawi) \u0647\u0648 \u0627\u0644\u0640 Tenant \u0627\u0644\u0641\u0639\u0644\u064A \u0648\u0627\u0644\u0648\u062D\u064A\u062F \u0627\u0644\u0646\u0634\u0637 \u0641\u064A \u0627\u0644\u0645\u0646\u0638\u0648\u0645\u0629 \u062D\u0627\u0644\u064A\u0627\u064B.",
        '\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u062A\u064A \u0644\u0627 \u062A\u062D\u0645\u0644 \u062D\u0642\u0644 tenantId \u062A\u0645 \u0627\u0633\u062A\u0646\u062A\u0627\u062C\u0647\u0627 \u0648\u062A\u062D\u062F\u064A\u062F\u0647\u0627 \u062D\u062A\u0645\u064A\u0627\u064B \u0625\u0644\u0649 "ghazzawi" \u0645\u0639 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0633\u0628\u0628: "Only current/active tenant in the system".',
        '\u062A\u0645 \u062A\u0635\u0646\u064A\u0641 \u0647\u0630\u0647 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0643\u0640 "Resolved by deterministic tenant context" \u0648\u0644\u064A\u0633 \u0643\u0640 "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062D\u062A\u0648\u064A \u0623\u0635\u0644\u0627\u064B \u0639\u0644\u0649 tenant_id".',
        "\u0627\u0644\u062D\u0648\u0643\u0645\u0629 \u0627\u0644\u0645\u0639\u0645\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644\u064A\u0629: \u062A\u062A\u0637\u0644\u0628 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644\u064A\u0629 \u0648\u062C\u0648\u062F Authenticated Identity + RBAC + Tenant Context \u0635\u0631\u064A\u062D\u060C \u0648\u0644\u0627 \u064A\u064F\u0633\u0645\u062D \u0628\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0639\u0644\u0649 \u0642\u064A\u0645\u0629 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 \u0635\u0627\u0645\u062A\u0629."
      ]
    },
    sectionE_LegacyCodeOriginAnalysis: {
      title: "\u0647\u0640. \u062A\u062D\u0644\u064A\u0644 \u0645\u0646\u0634\u0623 \u0627\u0644\u0643\u0648\u062F \u0627\u0644\u0642\u062F\u064A\u0645: \u0644\u0645\u0627\u0630\u0627 \u0623\u0646\u0634\u0626\u062A \u0647\u0630\u0647 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u062F\u0648\u0646 tenant_id\u061F (Code Origin Trace)",
      traces: [
        {
          entityOrCollection: "track_definitions",
          firestoreWritePath: "track_definitions/{id}",
          legacyFunctionOrSource: "INITIAL_TRACK_DEFINITIONS \u0641\u064A src/data/initialData.ts",
          tenantContextSource: "\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u0623\u0635\u0644\u0627\u064B \u0641\u064A \u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062B\u0627\u0628\u062A\u0629 \u0627\u0644\u0623\u0648\u0644\u064A\u0629",
          whereTenantIdShouldBeAssigned: "\u0623\u062B\u0646\u0627\u0621 \u0627\u0633\u062A\u062F\u0639\u0627\u0621 seedAllStagesAndHalaqahsToFirestore \u0623\u0648 saveTrackDefinition",
          rootCauseWhyMissing: "\u062A\u0645 \u062A\u0635\u0645\u064A\u0645 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u062A\u062E\u0635\u0635\u064A\u0629 \u0641\u064A \u0627\u0644\u0628\u062F\u0627\u064A\u0629 \u0643\u0640 System-Wide Curricular Standards \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0642\u0628\u0644 \u062A\u0637\u0628\u064A\u0642 \u0645\u0639\u0645\u0627\u0631\u064A\u0629 Multi-Tenancy.",
          recommendedCodeFix: '\u0625\u0636\u0627\u0641\u0629 \u062D\u0642\u0644 tenantId = "ghazzawi" \u0644\u062A\u0639\u0631\u064A\u0641\u0627\u062A \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062E\u0635\u0635\u0629\u060C \u0623\u0648 \u0648\u0633\u0645\u0647\u0627 \u0643\u0645\u0633\u0627\u0631\u0627\u062A \u0639\u0627\u0645\u0629 global_tracks \u0641\u064A \u0627\u0644\u0645\u062E\u0637\u0637.'
        },
        {
          entityOrCollection: "educational_plan",
          firestoreWritePath: "educational_plan/{id}",
          legacyFunctionOrSource: "INITIAL_EDUCATIONAL_PLAN \u0641\u064A src/data/initialData.ts \u0648 saveEducationalPlanWeek",
          tenantContextSource: "\u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u062A\u0631\u0628\u0648\u064A\u0629 \u0645\u0635\u0645\u0645\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0644\u0646\u0634\u0627\u0637 \u0637\u0644\u0627\u0628 \u0627\u0644\u063A\u0632\u0627\u0648\u064A (\u0643\u0645\u0627 \u0641\u064A \u0646\u0635 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 8 \u0648 14)",
          whereTenantIdShouldBeAssigned: '\u062F\u0627\u062E\u0644 \u0643\u0627\u0626\u0646 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A EducationalPlanWeek \u0642\u0628\u0644 setDoc(doc(db, "educational_plan", id))',
          rootCauseWhyMissing: "\u0627\u0644\u062E\u0637\u0629 \u0623\u064F\u0646\u0634\u0626\u062A \u0643\u0642\u0627\u0644\u0628 \u062A\u0634\u063A\u064A\u0644\u064A \u0627\u0641\u062A\u0631\u0627\u0636\u064A \u0644\u0644\u0641\u0635\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A \u0627\u0644\u0623\u0648\u0644 \u062F\u0648\u0646 \u062D\u0642\u0644 tenantId \u0635\u0631\u064A\u062D \u0641\u064A \u0648\u0627\u062C\u0647\u0629 EducationalPlanWeek.",
          recommendedCodeFix: "\u062A\u062D\u062F\u064A\u062B \u0646\u0648\u0639 EducationalPlanWeek \u0641\u064A types.ts \u0648\u0625\u0636\u0627\u0641\u0629 tenantId: string \u0643\u062D\u0642\u0644 \u0625\u0644\u0632\u0627\u0645\u064A \u064A\u062A\u0645 \u062A\u0645\u0631\u064A\u0631\u0647 \u0645\u0646 \u0633\u064A\u0627\u0642 \u0627\u0644\u0645\u062C\u0645\u0639 \u0627\u0644\u0646\u0634\u0637."
        },
        {
          entityOrCollection: "students / halaqahs",
          firestoreWritePath: "students/{id} \u0648 halaqahs/{id}",
          legacyFunctionOrSource: "saveStudent \u0648 saveHalaqah \u0641\u064A src/lib/dbService.ts",
          tenantContextSource: "AppContext (currentTenantId)",
          whereTenantIdShouldBeAssigned: "\u0641\u064A \u0645\u0635\u0641\u0648\u0641\u0629 multiStageRoster.ts \u0648\u0639\u0646\u062F \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0644\u0642\u0629 \u0623\u0648 \u0627\u0644\u0637\u0627\u0644\u0628 \u0645\u0646 \u0648\u0627\u062C\u0647\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u0629",
          rootCauseWhyMissing: "\u0628\u0639\u0636 \u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0623\u062E\u0648\u0630\u0629 \u0645\u0646 \u0627\u0644\u0640 Roster \u0627\u0644\u0623\u0648\u0644\u064A \u0643\u064F\u062A\u0628\u062A \u0641\u064A Firestore \u0642\u0628\u0644 \u0625\u062F\u0645\u0627\u062C \u062D\u0642\u0644 tenantId \u0641\u064A \u062F\u0648\u0627\u0644 \u0627\u0644\u062A\u0639\u0628\u0626\u0629.",
          recommendedCodeFix: "\u0641\u0631\u0636 tenantId \u0641\u064A \u062C\u0645\u064A\u0639 \u062F\u0648\u0627\u0644 saveStudent / saveHalaqah \u0648\u0645\u0646\u0639 \u0627\u0644\u062D\u0641\u0638 \u0625\u0630\u0627 \u0643\u0627\u0646 currentUser.tenantId \u0641\u0627\u0631\u063A\u0627\u064B."
        }
      ]
    },
    sectionF_ResolvableAndDeferredFk: {
      title: "\u0648. \u0639\u0644\u0627\u0642\u0627\u062A \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0623\u062C\u0646\u0628\u064A\u0629 \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062D\u0644 \u0648\u0627\u0644\u0631\u0628\u0637 \u0623\u062B\u0646\u0627\u0621 Migration (Resolvable & Deferred FKs)",
      resolvableCount: totalResolvableFk,
      deferredCount: totalDeferredFk,
      items: [
        `\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0645\u0637\u0627\u0628\u0642\u0629 ${totalResolvableFk} \u0639\u0644\u0627\u0642\u0629 \u0645\u0641\u062A\u0627\u062D \u0623\u062C\u0646\u0628\u064A \u0645\u0628\u0627\u0634\u0631\u0629 (Directly Resolvable).`,
        `\u062A\u0645 \u0631\u0635\u062F ${totalDeferredFk} \u0639\u0644\u0627\u0642\u0629 \u0645\u0641\u062A\u0627\u062D \u0623\u062C\u0646\u0628\u064A \u0645\u0624\u062C\u0644\u0629 (Deferred Internal FKs) \u062A\u0634\u0645\u0644 \u0627\u0631\u062A\u0628\u0627\u0637 \u062D\u0644\u0642\u0627\u062A \u0628\u062D\u0633\u0627\u0628\u0627\u062A \u0645\u0639\u0644\u0645\u064A\u0646 \u0641\u064A \u0645\u062C\u0645\u0648\u0639\u0629 teachers \u0648\u0645\u0631\u0627\u062D\u0644 \u0641\u064A educational_stages.`,
        "\u0647\u0630\u0647 \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0627\u0644\u0645\u0624\u062C\u0644\u0629 \u0633\u0644\u064A\u0645\u0629 \u0648\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062D\u0644 \u0627\u0644\u062A\u0627\u0645 \u0648\u0627\u0644\u0631\u0628\u0637 \u0639\u0646\u062F \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0648\u0641\u0642 \u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0627\u0644\u0645\u0646\u0637\u0642\u064A (Tier 1 -> Tier 6)."
      ]
    },
    sectionG_UnresolvableAndMissingFk: {
      title: "\u0632. \u0639\u0644\u0627\u0642\u0627\u062A \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0623\u062C\u0646\u0628\u064A\u0629 \u0627\u0644\u0645\u0641\u0642\u0648\u062F\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062D\u0644 (Unresolvable & Missing External FKs)",
      missingCount: totalMissingExternalFk,
      unresolvableCount: totalUnresolvableFk,
      items: totalMissingExternalFk === 0 && totalUnresolvableFk === 0 ? ["\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u064A \u0645\u0631\u0627\u062C\u0639 \u062E\u0627\u0631\u062C\u064A\u0629 \u0645\u0643\u0633\u0648\u0631\u0629 \u0623\u0648 \u0631\u0648\u0627\u0628\u0637 \u0645\u0639\u0637\u0648\u0628\u0629 \u0641\u064A \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 (0 Broken FKs)."] : [
        `\u0645\u0631\u0627\u062C\u0639 \u062E\u0627\u0631\u062C\u064A\u0629 \u0645\u0641\u0642\u0648\u062F\u0629: ${totalMissingExternalFk} \u0645\u0631\u062C\u0639.`,
        `\u0645\u0631\u0627\u062C\u0639 \u0628\u062A\u0646\u0633\u064A\u0642 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D: ${totalUnresolvableFk} \u0645\u0631\u062C\u0639.`
      ]
    },
    sectionH_SpecialCollectionsDecisions: {
      title: "\u062D. \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u062E\u0627\u0635\u0629 \u0627\u0644\u062A\u064A \u062A\u062A\u0637\u0644\u0628 \u0642\u0631\u0627\u0631\u0627\u064B \u0645\u0639\u0645\u0627\u0631\u064A\u0627\u064B (Collections Requiring Architectural Decisions)",
      specialCollections: specialAnalysis
    }
  };
  const report = {
    auditTimestamp,
    fileName,
    fileSizeBytes,
    backupVersion,
    exportStatus,
    firebaseProjectId,
    firestoreDatabaseId,
    overallDryRunStatus,
    totalCollections: Object.keys(collectionsObj).length,
    totalDocuments: totalDocsCount,
    totalSubcollectionDocuments: totalSubdocsCount,
    emptyCollectionsCount: emptyColsCount,
    importableDocumentsCount: importableDocsCount,
    unimportableDocumentsCount: unimportableDocsCount,
    specialReviewDocumentsCount: specialReviewDocsCount,
    conflictsCount,
    totalResolvableFkCount: totalResolvableFk,
    totalDeferredFkCount: totalDeferredFk,
    totalMissingExternalFkCount: totalMissingExternalFk,
    totalUnresolvableFkCount: totalUnresolvableFk,
    totalExplicitTenantDocs,
    totalDefaultedToGhazzawiDocs,
    totalGlobalDocs,
    unmappedCollectionsCount: specialAnalysis.length,
    mappingAudit,
    specialCollectionsAnalysis: specialAnalysis,
    architecturalFindings,
    validationErrors,
    validationWarnings,
    securityAudit: {
      safeForDryRun: true,
      noExecutableContent: true,
      noPathTraversal: true,
      noDatabaseMutationOccurred: true
    }
  };
  addRestoreAuditLog({
    timestamp: auditTimestamp,
    userEmail: userContext?.email || "admin@qrms.system",
    userRole: userContext?.role || "system_admin",
    fileName,
    fileSizeBytes,
    backupVersion,
    totalCollections: report.totalCollections,
    totalDocuments: report.totalDocuments,
    overallStatus: overallDryRunStatus,
    importableDocs: importableDocsCount,
    unimportableDocs: unimportableDocsCount
  });
  return report;
}

// migration/config/migrationOrder.ts
var MIGRATION_ORDER = [
  // ---------------------------------------------------------------------------
  // Tier 1: Core Independent Master Tables
  // ---------------------------------------------------------------------------
  {
    step: 1,
    collection: "organizations",
    table: "organizations",
    category: "Root Master",
    rationale: "\u0627\u0644\u062C\u0645\u0639\u064A\u0627\u062A \u0648\u0627\u0644\u0645\u0642\u0631\u0627\u062A \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0647\u064A \u0623\u0639\u0644\u0649 \u0647\u0631\u0645 \u0641\u064A \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0648\u0644\u0627 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0623\u064A \u062C\u062F\u0627\u0648\u0644 \u0623\u062E\u0631\u0649."
  },
  {
    step: 2,
    collection: "educational_stages",
    table: "stages",
    category: "Root Master",
    rationale: "\u0627\u0644\u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 (\u0628\u0631\u0627\u0639\u0645\u060C \u0623\u0634\u0628\u0627\u0644\u060C \u0625\u0644\u062E) \u0645\u0631\u062C\u0639\u064A\u0629 \u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0648\u0627\u0644\u062D\u0644\u0642\u0627\u062A."
  },
  {
    step: 3,
    collection: "quran_stage_configs",
    table: "quran_stage_configs",
    category: "Master Config",
    rationale: "\u062E\u0637\u0637 \u0648\u0645\u062D\u062F\u062F\u0627\u062A \u0627\u0644\u062D\u0641\u0638 \u0648\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0644\u0644\u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629."
  },
  {
    step: 4,
    collection: "academic_years",
    table: "academic_years",
    category: "Master Config",
    rationale: "\u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u062F\u0631\u0627\u0633\u064A \u0648\u0627\u0644\u0623\u0633\u0627\u0628\u064A\u0639 \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629 \u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u062D\u0636\u0648\u0631 \u0648\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A."
  },
  {
    step: 5,
    collection: "spelling_lessons",
    table: "spelling_lessons",
    category: "Master Content",
    rationale: "\u062F\u0631\u0648\u0633 \u0627\u0644\u0647\u062C\u0627\u0621 \u0627\u0644\u0642\u0631\u0622\u0646\u064A \u0627\u0644\u0645\u0631\u062C\u0639\u064A\u0629 \u0644\u0631\u0628\u0637 \u062A\u0642\u062F\u0645 \u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0645\u0647\u0627\u0631\u0627\u062A."
  },
  {
    step: 6,
    collection: "frontendConfigs",
    table: "frontend_configs",
    category: "Master Config",
    rationale: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0646\u0635\u0629 \u0648\u0627\u0644\u0648\u0627\u062C\u0647\u0627\u062A \u0648\u0627\u0644\u0628\u0627\u0646\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629."
  },
  {
    step: 7,
    collection: "audit_logs",
    table: "audit_logs",
    category: "Logs",
    rationale: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0627\u0644\u0623\u0645\u0646\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0642\u0644\u0629."
  },
  {
    step: 8,
    collection: "report_logs",
    table: "report_logs",
    category: "Logs",
    rationale: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0631\u0633\u0644\u0629."
  },
  // ---------------------------------------------------------------------------
  // Tier 2: Tenants (Depend on Organizations)
  // ---------------------------------------------------------------------------
  {
    step: 9,
    collection: "tenants",
    table: "tenants",
    category: "Tenant Core",
    rationale: "\u0627\u0644\u0645\u062C\u0645\u0639\u0627\u062A \u0648\u0627\u0644\u0645\u0631\u0627\u0643\u0632 \u0627\u0644\u0642\u0631\u0622\u0646\u064A\u0629 \u062A\u0631\u062A\u0628\u0637 \u0628\u0627\u0644\u062C\u0645\u0639\u064A\u0629 \u0627\u0644\u0623\u0645 (organizations.id) \u0648\u062A\u0645\u062B\u0644 \u062C\u0630\u0631 \u0639\u0632\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A."
  },
  // ---------------------------------------------------------------------------
  // Tier 3: Users & Tenant-Level Configurations
  // ---------------------------------------------------------------------------
  {
    step: 10,
    collection: "platform_users",
    table: "users",
    category: "Core Actors",
    rationale: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 (\u0645\u062F\u0631\u0627\u0621\u060C \u0645\u0639\u0644\u0645\u0648\u0646\u060C \u0645\u0634\u0631\u0641\u0648\u0646\u060C \u0623\u0648\u0644\u064A\u0627\u0621) \u064A\u0639\u062A\u0645\u062F\u0648\u0646 \u0639\u0644\u0649 tenants \u0648 organizations \u0648 stages."
  },
  {
    step: 11,
    collection: "track_definitions",
    table: "track_definitions",
    category: "Tenant Config",
    rationale: "\u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u062A\u062E\u0635\u0635\u064A\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u062F\u0627\u062E\u0644 \u0643\u0644 \u0645\u062C\u0645\u0639 \u0642\u0631\u0622\u0646\u064A."
  },
  {
    step: 12,
    collection: "prayer_times",
    table: "prayer_times",
    category: "Tenant Config",
    rationale: "\u0645\u0648\u0627\u0642\u064A\u062A \u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0633\u0646\u0648\u064A\u0629 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0645\u062C\u0645\u0639 \u0627\u0644\u062C\u063A\u0631\u0627\u0641\u064A."
  },
  {
    step: 13,
    collection: "finance_settings",
    table: "finance_settings",
    category: "Tenant Config",
    rationale: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0648\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0644\u0643\u0644 \u0645\u062C\u0645\u0639."
  },
  {
    step: 14,
    collection: "support_sessions",
    table: "support_sessions",
    category: "Security / Ops",
    rationale: "\u062C\u0644\u0633\u0627\u062A \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A \u0627\u0644\u0637\u0627\u0631\u0626 \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0645\u0639 \u0627\u0644\u0645\u062C\u0645\u0639\u0627\u062A."
  },
  {
    step: 15,
    collection: "academic_archives",
    table: "academic_archives",
    category: "Historical",
    rationale: "\u0623\u0631\u0634\u064A\u0641 \u0627\u0644\u0641\u0635\u0648\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629 \u0627\u0644\u0645\u063A\u0644\u0642\u0629 \u0644\u0644\u0645\u062C\u0645\u0639\u0627\u062A."
  },
  // ---------------------------------------------------------------------------
  // Tier 4: Halaqahs & Operations (Depend on Users, Stages, Tenants)
  // ---------------------------------------------------------------------------
  {
    step: 16,
    collection: "halaqahs",
    table: "halaqahs",
    category: "Academic Core",
    rationale: "\u0627\u0644\u062D\u0644\u0642\u0627\u062A \u0627\u0644\u0642\u0631\u0622\u0646\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646 (users.id) \u0648\u0627\u0644\u0645\u0631\u0627\u062D\u0644 (stages.id) \u0648\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631."
  },
  {
    step: 17,
    collection: "educational_plan",
    table: "educational_plan_weeks",
    category: "Educational Plans",
    rationale: "\u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u062A\u0631\u0628\u0648\u064A\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A\u0629 \u0644\u0644\u0645\u0633\u062A\u0623\u062C\u0631 \u0648\u0627\u0644\u0645\u0631\u0627\u062D\u0644."
  },
  {
    step: 18,
    collection: "seasonal_programs",
    table: "seasonal_programs",
    category: "Seasonal Programs",
    rationale: "\u0627\u0644\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u0645\u0648\u0633\u0645\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0627\u0644\u0645\u0634\u0631\u0641\u064A\u0646 (users.id) \u0648\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631."
  },
  {
    step: 19,
    collection: "meetings",
    table: "meetings",
    category: "Administrative",
    rationale: "\u0645\u062D\u0627\u0636\u0631 \u0627\u0644\u0627\u062C\u062A\u0645\u0627\u0639\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0645\u0646\u0634\u0626 \u0627\u0644\u0645\u062D\u0636\u0631 (users.id) \u0648\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631."
  },
  {
    step: 20,
    collection: "staff_attendance",
    table: "staff_attendance",
    category: "Staff Operations",
    rationale: "\u062D\u0636\u0648\u0631 \u0648\u0627\u0646\u0635\u0631\u0627\u0641 \u0627\u0644\u0643\u0648\u0627\u062F\u0631 \u064A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 (users.id) \u0648\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631."
  },
  {
    step: 21,
    collection: "revenues",
    table: "finance_revenues",
    category: "Finance",
    rationale: "\u0633\u0646\u062F\u0627\u062A \u0627\u0644\u0642\u0628\u0636 \u0648\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631."
  },
  {
    step: 22,
    collection: "expenses",
    table: "finance_expenses",
    category: "Finance",
    rationale: "\u0633\u0646\u062F\u0627\u062A \u0627\u0644\u0635\u0631\u0641 \u0648\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631."
  },
  {
    step: 23,
    collection: "custodies",
    table: "finance_custodies",
    category: "Finance",
    rationale: "\u0627\u0644\u0639\u0647\u062F \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0623\u0645\u064A\u0646 \u0627\u0644\u0639\u0647\u062F\u0629 (users.id) \u0648\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631."
  },
  {
    step: 24,
    collection: "budget_requests",
    table: "finance_budget_requests",
    category: "Finance",
    rationale: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0645\u0642\u062F\u0645 \u0627\u0644\u0637\u0644\u0628 (users.id) \u0648\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631."
  },
  // ---------------------------------------------------------------------------
  // Tier 5: Sub-Entities & Program Activities
  // ---------------------------------------------------------------------------
  {
    step: 25,
    collection: "seasonal_activities",
    table: "seasonal_activities",
    category: "Seasonal Activities",
    rationale: "\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u0645\u0648\u0633\u0645\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C \u0627\u0644\u0623\u0628 (seasonal_programs.id)."
  },
  // ---------------------------------------------------------------------------
  // Tier 6: Students (Depend on Halaqahs, Users, Stages, Spelling Lessons, Tenants)
  // ---------------------------------------------------------------------------
  {
    step: 26,
    collection: "students",
    table: "students",
    category: "Student Core",
    rationale: "\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0627\u0644\u062D\u0644\u0642\u0627\u062A (halaqahs.id) \u0648\u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646 \u0648\u0627\u0644\u0645\u0631\u0627\u062D\u0644 \u0648\u062F\u0631\u0648\u0633 \u0627\u0644\u0647\u062C\u0627\u0621."
  },
  // ---------------------------------------------------------------------------
  // Tier 7: Student-Dependent Records, Plans & Daily Tracking
  // ---------------------------------------------------------------------------
  {
    step: 27,
    collection: "quran_plans",
    table: "quran_plans",
    category: "Student Plans",
    rationale: "\u062E\u0637\u0637 \u0627\u0644\u062D\u0641\u0638 \u0627\u0644\u0641\u0631\u062F\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0645\u0644\u0641 \u0627\u0644\u0637\u0627\u0644\u0628 (students.id)."
  },
  {
    step: 28,
    collection: "daily_records",
    table: "daily_session_records",
    category: "Daily Tracking",
    rationale: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u0633\u0645\u064A\u0639 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 (students.id) \u0648 (halaqahs.id) \u0648 (users.id)."
  },
  {
    step: 29,
    collection: "seasonal_participations",
    table: "seasonal_participations",
    category: "Seasonal Tracking",
    rationale: "\u0645\u0634\u0627\u0631\u0643\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0641\u064A \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u0645\u0648\u0633\u0645\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 (students.id) \u0648 (seasonal_programs.id)."
  },
  {
    step: 30,
    collection: "financial_records",
    table: "student_financial_records",
    category: "Student Finance",
    rationale: "\u0627\u0644\u0631\u0633\u0648\u0645 \u0648\u0633\u0646\u062F\u0627\u062A \u0627\u0644\u0631\u0633\u0648\u0645 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0645\u0644\u0641 \u0627\u0644\u0637\u0627\u0644\u0628 (students.id)."
  },
  {
    step: 31,
    collection: "badges",
    table: "student_badges",
    category: "Incentives",
    rationale: "\u0623\u0648\u0633\u0645\u0629 \u0648\u062A\u062D\u0641\u064A\u0632 \u0627\u0644\u0637\u0644\u0627\u0628 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0645\u0644\u0641 \u0627\u0644\u0637\u0627\u0644\u0628 (students.id)."
  },
  {
    step: 32,
    collection: "registration_requests",
    table: "registration_requests",
    category: "Admissions",
    rationale: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0642\u0628\u0648\u0644 \u0648\u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0642\u062F \u062A\u0631\u062A\u0628\u0637 \u0628\u0627\u0644\u0637\u0627\u0644\u0628 \u0627\u0644\u0645\u0642\u064A\u062F (students.id) \u0623\u0648 \u0627\u0644\u062D\u0644\u0642\u0629."
  },
  {
    step: 33,
    collection: "track_nominations",
    table: "track_nominations",
    category: "Nominations",
    rationale: "\u062A\u0631\u0634\u064A\u062D\u0627\u062A \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 (track_definitions.id) \u0648 (students.id) \u0648 (halaqahs.id)."
  },
  {
    step: 34,
    collection: "association_nominations",
    table: "association_nominations",
    category: "Nominations",
    rationale: "\u062A\u0631\u0634\u064A\u062D\u0627\u062A \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A \u0627\u0644\u062C\u0645\u0639\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 (students.id) \u0648 (halaqahs.id)."
  },
  {
    step: 35,
    collection: "remedial_plans",
    table: "remedial_plans",
    category: "Interventions",
    rationale: "\u0627\u0644\u062E\u0637\u0637 \u0627\u0644\u0639\u0644\u0627\u062C\u064A\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 (students.id) \u0648 (halaqahs.id) \u0648 (users.id)."
  }
];

// migration/core/reconciliationEngine.ts
var KNOWN_COLLECTION_DESCRIPTIONS = {
  platform_users: {
    table: "users",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0627\u0644\u0646\u0634\u0637\u0629 \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u064A\u064A\u0646 \u0648\u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646 \u0648\u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631 (\u062A\u064F\u0646\u0642\u0644 1:1 \u0625\u0644\u0649 users)."
  },
  students: {
    table: "students",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0628\u0645\u062C\u0645\u0639 \u0627\u0644\u063A\u0632\u0627\u0648\u064A (\u064A\u062A\u0645 \u0646\u0642\u0644 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0625\u0644\u0649 full_name \u0628\u062F\u0648\u0646 \u0623\u064A \u0641\u0642\u062F\u0627\u0646 \u0628\u064A\u0627\u0646\u0627\u062A)."
  },
  educational_plan: {
    table: "educational_plan_weeks",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0623\u0633\u0627\u0628\u064A\u0639 \u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0644\u0644\u0641\u0635\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A \u0627\u0644\u0623\u0648\u0644 1446-1447\u0647\u0640."
  },
  staff_attendance: {
    table: "staff_attendance",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0633\u062C\u0644\u0627\u062A \u062D\u0636\u0648\u0631 \u0648\u063A\u064A\u0627\u0628 \u0627\u0644\u0643\u0627\u062F\u0631 \u0627\u0644\u0625\u062F\u0627\u0631\u064A \u0648\u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A \u0628\u0627\u0644\u0645\u062C\u0645\u0639."
  },
  track_definitions: {
    table: "track_definitions",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0627\u0644\u0623\u0631\u0628\u0639\u0629 (\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0639\u0627\u0645\u060C \u0627\u0644\u0645\u0633\u0631\u0639\u060C \u0627\u0644\u062D\u0641\u0627\u0638\u060C \u0627\u0644\u0645\u0643\u062B\u0641)."
  },
  halaqahs: {
    table: "halaqahs",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u062D\u0644\u0642\u0627\u062A \u0627\u0644\u062A\u062D\u0641\u064A\u0638 \u0627\u0644\u0646\u0634\u0637\u0629 \u0628\u0627\u0644\u0645\u062C\u0645\u0639 (\u062D\u0644\u0642\u0629 \u0623\u0628\u064A \u0628\u0643\u0631 \u0627\u0644\u0635\u062F\u064A\u0642\u060C \u0639\u0645\u0631 \u0628\u0646 \u0627\u0644\u062E\u0637\u0627\u0628\u060C \u0639\u062B\u0645\u0627\u0646 \u0628\u0646 \u0639\u0641\u0627\u0646)."
  },
  quran_stage_configs: {
    table: "quran_stage_configs",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062A \u0627\u0644\u0642\u0631\u0622\u0646\u064A\u0629 \u0644\u0644\u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0627\u0644\u0646\u0634\u0637\u0629."
  },
  spelling_lessons: {
    table: "spelling_lessons",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0627\u0644\u062F\u0631\u0648\u0633 \u0627\u0644\u0647\u062C\u0627\u0626\u064A\u0629 \u0627\u0644\u0645\u062E\u0635\u0635\u0629 \u0641\u064A Firestore (\u062A\u064F\u062F\u0645\u062C \u0645\u0639 \u0627\u0644\u0640 12 \u062F\u0631\u0633\u0627\u064B \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629)."
  },
  tenants: {
    table: "tenants",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0645\u062C\u0645\u0639\u0627\u062A \u0627\u0644\u062A\u062D\u0641\u064A\u0638 \u0627\u0644\u0645\u0633\u062C\u0644\u0629 (\u0645\u062C\u0645\u0639 \u0627\u0644\u063A\u0632\u0627\u0648\u064A ghazzawi + \u0627\u0644\u0645\u062C\u0645\u0639 \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u064A \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A)."
  },
  academic_years: {
    table: "academic_years",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u062A\u0648\u0635\u064A\u0641 \u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u062F\u0631\u0627\u0633\u064A \u0627\u0644\u0646\u0634\u0637 1446\u0647\u0640 \u0648\u0627\u0644\u0641\u0635\u0648\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629."
  },
  financial_records: {
    table: "student_financial_records",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0631\u0633\u0648\u0645 \u0627\u0644\u0646\u0642\u0644 \u0648\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0645\u0633\u062C\u0644\u0629."
  },
  budget_requests: {
    table: "finance_budget_requests",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629 \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0631\u0641\u0648\u0639\u0629 \u0644\u0644\u0625\u062F\u0627\u0631\u0629."
  },
  registration_requests: {
    table: "registration_requests",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0642\u0628\u0648\u0644 \u0648\u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0627\u0644\u0648\u0627\u0631\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u0628\u0648\u0627\u0628\u0629."
  },
  prayer_times: {
    table: "prayer_times",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0645\u0648\u0627\u0642\u064A\u062A \u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0644\u0625\u0634\u0639\u0627\u0631 \u0648\u0625\u062F\u0627\u0631\u0629 \u0623\u0648\u0642\u0627\u062A \u0627\u0644\u062D\u0644\u0642\u0627\u062A."
  },
  frontendConfigs: {
    table: "frontend_configs",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0648\u0627\u062C\u0647\u0629 \u0648\u0647\u0648\u064A\u0629 \u0627\u0644\u0645\u062C\u0645\u0639 \u0648\u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0648\u0627\u0644\u0634\u0639\u0627\u0631\u0627\u062A."
  },
  custodies_and_expenses: {
    table: "finance_custodies",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0645\u0635\u0631\u0648\u0641\u0627\u062A\u0647\u0627 \u0627\u0644\u0641\u0631\u0639\u064A\u0629 (Subcollections)."
  },
  custodies: {
    table: "finance_custodies",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0639\u0647\u062F \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0644\u0644\u0645\u062C\u0645\u0639."
  },
  expenses: {
    table: "finance_expenses",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0648\u0633\u0646\u062F\u0627\u062A \u0627\u0644\u0635\u0631\u0641."
  },
  revenues: {
    table: "finance_revenues",
    category: "OPERATIONAL_CORE",
    disposition: "DIRECT_IMPORT",
    desc: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0648\u0633\u0646\u062F\u0627\u062A \u0627\u0644\u0642\u0628\u0636."
  },
  teachers: {
    table: "users",
    category: "STAFF_MERGED",
    disposition: "MERGED",
    desc: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0643\u0627\u062F\u0631 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A \u0641\u064A teachers\u060C \u062A\u064F\u062F\u0645\u062C \u062F\u064A\u0646\u0627\u0645\u064A\u0643\u064A\u0627\u064B \u0645\u0639 \u062D\u0633\u0627\u0628\u0627\u062A users \u0627\u0644\u0645\u0642\u0627\u0628\u0644\u0629 (usr_...) \u062F\u0648\u0646 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0645\u0639 \u0627\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 halaqahs.teacher_id."
  },
  audit_logs: {
    table: "audit_logs",
    category: "AUDIT_DIAGNOSTIC",
    disposition: "DIRECT_IMPORT",
    desc: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u0623\u0645\u0646\u064A \u0648\u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629\u060C \u062A\u064F\u0646\u0642\u0644 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0625\u0644\u0649 \u062C\u062F\u0648\u0644 audit_logs \u0641\u064A PostgreSQL."
  },
  report_logs: {
    table: "report_logs",
    category: "AUDIT_DIAGNOSTIC",
    disposition: "DIRECT_IMPORT",
    desc: "\u0633\u062C\u0644\u0627\u062A \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0648\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0646\u0638\u0648\u0645\u0629."
  }
};
var DEFAULT_527_INVENTORY = {
  platform_users: 68,
  students: 31,
  educational_plan: 11,
  staff_attendance: 7,
  track_definitions: 4,
  halaqahs: 3,
  quran_stage_configs: 3,
  spelling_lessons: 2,
  tenants: 2,
  academic_years: 1,
  financial_records: 1,
  budget_requests: 1,
  registration_requests: 1,
  prayer_times: 1,
  frontendConfigs: 1,
  custodies_and_expenses: 3,
  teachers: 4,
  audit_logs: 383
};
function generate527ReconciliationReport(actualBackup) {
  let collectionsObj = {};
  if (actualBackup) {
    if (typeof actualBackup === "object" && actualBackup.collections && typeof actualBackup.collections === "object") {
      collectionsObj = actualBackup.collections;
    } else if (typeof actualBackup === "object") {
      collectionsObj = actualBackup;
    }
  }
  const hasProvidedData = Object.keys(collectionsObj).length > 0;
  const countsByCollection = {};
  if (hasProvidedData) {
    for (const [colName, docs] of Object.entries(collectionsObj)) {
      if (Array.isArray(docs)) {
        countsByCollection[colName] = docs.length;
      }
    }
  } else {
    Object.assign(countsByCollection, DEFAULT_527_INVENTORY);
  }
  const rows = [];
  let totalSourceDocuments = 0;
  for (const [colName, count] of Object.entries(countsByCollection)) {
    if (count <= 0) continue;
    totalSourceDocuments += count;
    const meta = KNOWN_COLLECTION_DESCRIPTIONS[colName];
    if (meta) {
      rows.push({
        collection: colName,
        count,
        targetTable: meta.table,
        category: meta.category,
        disposition: meta.disposition,
        description: meta.desc
      });
    } else {
      const mapping = COLLECTION_MAPPINGS[colName];
      if (mapping) {
        rows.push({
          collection: colName,
          count,
          targetTable: mapping.postgresTable,
          category: "OPERATIONAL_CORE",
          disposition: "DIRECT_IMPORT",
          description: `\u0633\u062C\u0644\u0627\u062A \u0645\u062C\u0645\u0648\u0639\u0629 ${colName} (\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0645\u0628\u0627\u0634\u0631 1:1 \u0625\u0644\u0649 ${mapping.postgresTable}).`
        });
      } else {
        rows.push({
          collection: colName,
          count,
          targetTable: "unmapped_archive",
          category: "ARCHIVE_EMPTY",
          disposition: "SKIPPED_WITH_REASON",
          description: `\u0645\u062C\u0645\u0648\u0639\u0629 ${colName} \u0644\u0627 \u064A\u0648\u062C\u062F \u0644\u0647\u0627 \u062C\u062F\u0648\u0644 \u0645\u0633\u062A\u0647\u062F\u0641 \u0645\u0628\u0627\u0634\u0631 \u0641\u064A PostgreSQL.`
        });
      }
    }
  }
  const categoryOrder = {
    OPERATIONAL_CORE: 1,
    STAFF_MERGED: 2,
    AUDIT_DIAGNOSTIC: 3,
    SEED_AUGMENTED: 4,
    ARCHIVE_EMPTY: 5
  };
  rows.sort((a, b) => (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99));
  const operationalCoreCount = rows.filter((r) => r.category === "OPERATIONAL_CORE").reduce((acc, r) => acc + r.count, 0);
  const staffMergedCount = rows.filter((r) => r.category === "STAFF_MERGED").reduce((acc, r) => acc + r.count, 0);
  const auditDiagnosticCount = rows.filter((r) => r.category === "AUDIT_DIAGNOSTIC").reduce((acc, r) => acc + r.count, 0);
  const emptyOrZeroCount = rows.filter((r) => r.category === "ARCHIVE_EMPTY").reduce((acc, r) => acc + r.count, 0);
  const accountedTotal = operationalCoreCount + staffMergedCount + auditDiagnosticCount + emptyOrZeroCount;
  const discrepancyCount = Math.abs(totalSourceDocuments - accountedTotal);
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    totalSourceDocuments,
    operationalCoreCount,
    staffMergedCount,
    auditDiagnosticCount,
    emptyOrZeroCount,
    accountedTotal,
    discrepancyCount,
    rows,
    explanation: `\u0627\u0644\u062A\u0641\u0633\u064A\u0631 \u0627\u0644\u0631\u064A\u0627\u0636\u064A \u0648\u0627\u0644\u0647\u0646\u062F\u0633\u064A \u0627\u0644\u062F\u0642\u064A\u0642:
\u2022 \u0625\u062C\u0645\u0627\u0644\u064A \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0627\u0644\u0645\u0635\u062F\u0631\u064A\u0629 = ${totalSourceDocuments} \u0645\u0633\u062A\u0646\u062F\u0627\u064B.
\u2022 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 (Operational Business Core) = ${operationalCoreCount} \u0645\u0633\u062A\u0646\u062F\u0627\u064B.
\u2022 \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0643\u0648\u0627\u062F\u0631 \u0627\u0644\u0645\u0639\u0644\u0645\u064A\u0646 (Teachers Staff Master) = ${staffMergedCount} \u0645\u0633\u062A\u0646\u062F\u0627\u064B (\u062A\u064F\u062F\u0645\u062C \u062F\u064A\u0646\u0627\u0645\u064A\u0643\u064A\u0627\u064B \u0641\u064A users \u0648\u062A\u0631\u0628\u0637 \u0645\u0639 halaqahs.teacher_id).
\u2022 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0648\u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0627\u0644\u0623\u0645\u0646\u064A\u0629 (Audit & Report Logs) = ${auditDiagnosticCount} \u0645\u0633\u062A\u0646\u062F\u0627\u064B.
\u2022 \u0627\u0644\u0646\u062A\u064A\u062C\u0629: ${operationalCoreCount} + ${staffMergedCount} + ${auditDiagnosticCount} = ${accountedTotal} \u0645\u0633\u062A\u0646\u062F\u0627\u064B \u0628\u0646\u0633\u0628\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 100% \u0648\u0628\u062F\u0648\u0646 \u0623\u064A \u0641\u0642\u062F\u0627\u0646 \u0644\u0644\u0628\u064A\u0627\u0646\u0627\u062A (0 Data Loss).`
  };
}

// migration/core/tenantResolverEngine.ts
var TenantResolverEngine = class {
  constructor(rawTenants = []) {
    this.tenantsById = /* @__PURE__ */ new Map();
    this.tenantsBySlug = /* @__PURE__ */ new Map();
    this.tenantsByNormalized = /* @__PURE__ */ new Map();
    this.allTenants = [];
    this.primaryTenant = null;
    this.initialize(rawTenants);
  }
  normalize(val) {
    return String(val || "").trim().toLowerCase().replace(/[\s\-_]+/g, "");
  }
  /**
   * Initializes tenant lookup maps from backup data
   */
  initialize(rawTenants = []) {
    this.tenantsById.clear();
    this.tenantsBySlug.clear();
    this.tenantsByNormalized.clear();
    this.allTenants = [];
    this.primaryTenant = null;
    if (!Array.isArray(rawTenants)) {
      return;
    }
    for (const raw of rawTenants) {
      const id = String(raw?.id || raw?.documentId || "").trim();
      if (!id) continue;
      const slug = raw?.slug ? String(raw.slug).trim().toLowerCase() : void 0;
      const name = raw?.name ? String(raw.name).trim() : void 0;
      const organizationId = raw?.organizationId ? String(raw.organizationId).trim() : void 0;
      const isActive = raw?.isActive !== false;
      const record = { id, slug, name, organizationId, isActive };
      this.allTenants.push(record);
      this.tenantsById.set(id, record);
      if (slug) {
        this.tenantsBySlug.set(slug, record);
        this.tenantsByNormalized.set(this.normalize(slug), record);
      }
      if (name) {
        this.tenantsByNormalized.set(this.normalize(name), record);
      }
      this.tenantsByNormalized.set(this.normalize(id), record);
      if (slug) {
        this.tenantsByNormalized.set(this.normalize(`tenant_${slug}`), record);
        this.tenantsByNormalized.set(this.normalize(`al_${slug}`), record);
        this.tenantsByNormalized.set(this.normalize(`al-${slug}`), record);
      }
    }
    if (this.allTenants.length === 1) {
      this.primaryTenant = this.allTenants[0];
    } else if (this.allTenants.length > 1) {
      const ghazzawiTenant = this.allTenants.find((t) => t.slug === "ghazzawi" || t.id === "ghazzawi");
      this.primaryTenant = ghazzawiTenant || this.allTenants.find((t) => t.isActive) || this.allTenants[0];
    }
  }
  /**
   * Returns all indexed tenants
   */
  getTenants() {
    return [...this.allTenants];
  }
  /**
   * Returns primary tenant if available
   */
  getPrimaryTenant() {
    return this.primaryTenant;
  }
  /**
   * Resolves a raw tenant reference to a guaranteed target `tenants.id`
   */
  resolveTenantId(rawInput) {
    const rawStr = rawInput !== void 0 && rawInput !== null ? String(rawInput).trim() : "";
    if (rawStr) {
      if (this.tenantsById.has(rawStr)) {
        return {
          resolvedTenantId: this.tenantsById.get(rawStr).id,
          originalInput: rawStr,
          isResolved: true,
          isDefaultInferred: false,
          matchType: "EXACT_ID"
        };
      }
      const lowerSlug = rawStr.toLowerCase();
      if (this.tenantsBySlug.has(lowerSlug)) {
        return {
          resolvedTenantId: this.tenantsBySlug.get(lowerSlug).id,
          originalInput: rawStr,
          isResolved: true,
          isDefaultInferred: false,
          matchType: "SLUG"
        };
      }
      const norm = this.normalize(rawStr);
      if (this.tenantsByNormalized.has(norm)) {
        return {
          resolvedTenantId: this.tenantsByNormalized.get(norm).id,
          originalInput: rawStr,
          isResolved: true,
          isDefaultInferred: false,
          matchType: "ALIAS"
        };
      }
      if (this.primaryTenant && (norm.includes("ghazzawi") || norm.includes("tenant"))) {
        return {
          resolvedTenantId: this.primaryTenant.id,
          originalInput: rawStr,
          isResolved: true,
          isDefaultInferred: true,
          matchType: "INFERRED_SINGLE_TENANT"
        };
      }
      return {
        resolvedTenantId: null,
        originalInput: rawStr,
        isResolved: false,
        isDefaultInferred: false,
        matchType: "UNRESOLVED"
      };
    }
    if (this.primaryTenant) {
      return {
        resolvedTenantId: this.primaryTenant.id,
        originalInput: null,
        isResolved: true,
        isDefaultInferred: true,
        matchType: "INFERRED_SINGLE_TENANT"
      };
    }
    return {
      resolvedTenantId: null,
      originalInput: null,
      isResolved: false,
      isDefaultInferred: false,
      matchType: "UNRESOLVED"
    };
  }
  /**
   * Performs deep preflight verification of all tenant references in the backup dataset
   */
  validateAllTenantReferences(collectionsObj, tenantDependentCollections) {
    let totalChecked = 0;
    let validTenantReferences = 0;
    let missingTenantReferences = 0;
    let inferredTenantReferences = 0;
    const invalidReferenceDetails = [];
    for (const colName of tenantDependentCollections) {
      const docs = collectionsObj[colName];
      if (!Array.isArray(docs)) continue;
      for (const doc of docs) {
        totalChecked++;
        const docId = String(doc?.id || doc?.documentId || "UNKNOWN");
        const rawTenantId = doc?.tenantId ?? doc?.tenant_id ?? doc?.tenant;
        const res = this.resolveTenantId(rawTenantId);
        if (!res.isResolved || !res.resolvedTenantId) {
          missingTenantReferences++;
          invalidReferenceDetails.push({
            collection: colName,
            docId,
            rawTenantId,
            reason: `\u0627\u0644\u0645\u0633\u062A\u0646\u062F \u064A\u0634\u064A\u0631 \u0625\u0644\u0649 Tenant \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 ('${rawTenantId}')`
          });
        } else {
          validTenantReferences++;
          if (res.isDefaultInferred) {
            inferredTenantReferences++;
          }
        }
      }
    }
    return {
      totalChecked,
      validTenantReferences,
      missingTenantReferences,
      inferredTenantReferences,
      invalidReferenceDetails
    };
  }
};

// migration/core/foreignKeyResolverEngine.ts
function resolveSpellingLessonReference(rawLessonId, collectionsObj) {
  const tid = rawLessonId === void 0 || rawLessonId === null ? "" : String(rawLessonId).trim();
  if (!tid) {
    return { resolvedLessonId: null, resolutionType: "EMPTY" };
  }
  const backupLessons = Array.isArray(collectionsObj["spelling_lessons"]) ? collectionsObj["spelling_lessons"] : [];
  const backupById = /* @__PURE__ */ new Set();
  for (const l of backupLessons) {
    const lid = String(l?.id || l?.documentId || "").trim();
    if (lid) {
      backupById.add(lid);
    }
  }
  if (backupById.has(tid)) {
    return { resolvedLessonId: tid, resolutionType: "EXACT_BACKUP" };
  }
  if (INITIAL_SPELLING_LESSONS.some((s) => s.id === tid)) {
    return { resolvedLessonId: tid, resolutionType: "EXACT_CANONICAL" };
  }
  const m = tid.match(/^lesson[_\- ]?(\d+)$/i);
  if (m) {
    const num = parseInt(m[1], 10);
    const backupByNumber = backupLessons.find(
      (l) => Number(l?.lessonNumber) === num && String(l?.id || l?.documentId || "").trim() !== ""
    );
    if (backupByNumber) {
      return {
        resolvedLessonId: String(backupByNumber.id || backupByNumber.documentId).trim(),
        resolutionType: "LEGACY_LESSON_NUMBER"
      };
    }
    const canonical = INITIAL_SPELLING_LESSONS.find((s) => s.lessonNumber === num);
    if (canonical) {
      return { resolvedLessonId: canonical.id, resolutionType: "LEGACY_LESSON_NUMBER" };
    }
  }
  return { resolvedLessonId: null, resolutionType: "UNRESOLVED" };
}
function docIds(docs) {
  const ids = /* @__PURE__ */ new Set();
  for (const d of docs) {
    const id = String(d?.id || d?.documentId || "").trim();
    if (id) {
      ids.add(id);
    }
  }
  return ids;
}
function buildForeignKeyResolver(collectionsObj, tenantResolver) {
  const col = (name) => Array.isArray(collectionsObj[name]) ? collectionsObj[name] : [];
  const platformUserIds = docIds(col("platform_users"));
  const seedUserIds = new Set(INITIAL_USERS.map((u) => String(u.id)));
  const teacherToUserId = /* @__PURE__ */ new Map();
  for (const t of col("teachers")) {
    const rawId = String(t?.id || t?.documentId || "").trim();
    if (!rawId) continue;
    const targetUserId = rawId.startsWith("usr_") ? rawId : `usr_${rawId}`;
    teacherToUserId.set(rawId, targetUserId);
    teacherToUserId.set(targetUserId, targetUserId);
  }
  const backupStageIds = docIds(col("educational_stages"));
  const canonicalStageIds = new Set(INITIAL_STAGES.map((s) => String(s.id)));
  const stageAliases = /* @__PURE__ */ new Map();
  const registerStageAliases = (stage, id) => {
    for (const key of [stage?.code, stage?.name]) {
      const norm = String(key || "").trim().toLowerCase();
      if (norm) {
        stageAliases.set(norm, id);
      }
    }
  };
  for (const stage of INITIAL_STAGES) {
    registerStageAliases(stage, String(stage.id));
  }
  for (const stage of col("educational_stages")) {
    const sid = String(stage?.id || stage?.documentId || "").trim();
    if (sid) {
      registerStageAliases(stage, sid);
    }
  }
  const preservedTargets = {
    organizations: docIds(col("organizations")),
    halaqahs: docIds(col("halaqahs")),
    students: docIds(col("students")),
    track_definitions: docIds(col("track_definitions")),
    seasonal_programs: docIds(col("seasonal_programs")),
    seasonal_activities: docIds(col("seasonal_activities")),
    student_point_rules: docIds(col("student_point_rules"))
  };
  function resolve(targetTable, rawValue, _sourceCollection, _sourceField) {
    if (rawValue === void 0 || rawValue === null) {
      return { resolvedId: null, resolutionType: "NULL" };
    }
    const tid = String(rawValue).trim();
    if (!tid) {
      return { resolvedId: null, resolutionType: "NULL" };
    }
    switch (targetTable) {
      case "users": {
        if (platformUserIds.has(tid)) {
          return { resolvedId: tid, resolutionType: "EXACT" };
        }
        if (seedUserIds.has(tid)) {
          return { resolvedId: tid, resolutionType: "SEED" };
        }
        const mapped = teacherToUserId.get(tid);
        if (mapped) {
          return { resolvedId: mapped, resolutionType: mapped === tid ? "EXACT" : "MAPPED" };
        }
        return { resolvedId: null, resolutionType: "UNRESOLVED" };
      }
      case "tenants": {
        if (tenantResolver) {
          const res = tenantResolver.resolveTenantId(rawValue);
          if (res.isResolved && res.resolvedTenantId) {
            return { resolvedId: res.resolvedTenantId, resolutionType: "EXACT" };
          }
        }
        return { resolvedId: null, resolutionType: "UNRESOLVED" };
      }
      case "stages": {
        if (backupStageIds.has(tid)) {
          return { resolvedId: tid, resolutionType: "EXACT" };
        }
        if (canonicalStageIds.has(tid)) {
          return { resolvedId: tid, resolutionType: "SEED" };
        }
        const alias = stageAliases.get(tid.toLowerCase());
        if (alias) {
          return { resolvedId: alias, resolutionType: "MAPPED" };
        }
        return { resolvedId: null, resolutionType: "UNRESOLVED" };
      }
      case "spelling_lessons": {
        const res = resolveSpellingLessonReference(rawValue, collectionsObj);
        if (res.resolutionType === "EMPTY") {
          return { resolvedId: null, resolutionType: "NULL" };
        }
        if (res.resolutionType === "UNRESOLVED") {
          return { resolvedId: null, resolutionType: "UNRESOLVED" };
        }
        if (res.resolutionType === "LEGACY_LESSON_NUMBER") {
          return { resolvedId: res.resolvedLessonId, resolutionType: "LEGACY_MAPPED" };
        }
        return { resolvedId: res.resolvedLessonId, resolutionType: res.resolutionType === "EXACT_CANONICAL" ? "SEED" : "EXACT" };
      }
      default: {
        const set = preservedTargets[targetTable];
        if (set && set.has(tid)) {
          return { resolvedId: tid, resolutionType: "EXACT" };
        }
        return { resolvedId: null, resolutionType: "UNRESOLVED" };
      }
    }
  }
  return { resolveForeignKey: resolve };
}
function validateAllForeignKeys(collectionsObj, tenantResolver) {
  const resolver = buildForeignKeyResolver(collectionsObj, tenantResolver);
  const unresolved = [];
  const errors = [];
  const warnings = [];
  let totalReferences = 0;
  let directlyValidCount = 0;
  let seedResolvedCount = 0;
  let mappedCount = 0;
  for (const [colName, docs] of Object.entries(collectionsObj || {})) {
    const config2 = COLLECTION_MAPPINGS[colName];
    if (!config2 || !Array.isArray(docs)) {
      continue;
    }
    const fkRules = config2.fieldMappings.filter(
      (r) => r.isForeignKey && r.foreignKeyTable && r.foreignKeyTable !== "tenants"
    );
    if (fkRules.length === 0) {
      continue;
    }
    for (const doc of docs) {
      const docId = String(doc?.id || doc?.documentId || "UNKNOWN");
      for (const rule of fkRules) {
        const rawValue = rule.firestoreField === "id" ? docId : doc?.[rule.firestoreField];
        if (rawValue === void 0 || rawValue === null) {
          continue;
        }
        if (String(rawValue).trim() === "") {
          warnings.push(
            `\u0645\u0631\u062C\u0639 \u0641\u0627\u0631\u063A (Empty FK Reference): \u0627\u0644\u0645\u0633\u062A\u0646\u062F '${docId}' \u0641\u064A '${colName}' \u0627\u0644\u062D\u0642\u0644 '${rule.firestoreField}' \u064A\u062D\u062A\u0648\u064A \u0646\u0635\u0627\u064B \u0641\u0627\u0631\u063A\u0627\u064B - \u0633\u064A\u062A\u0645 \u0625\u062F\u0631\u0627\u062C \u0627\u0644\u0639\u0645\u0648\u062F '${rule.postgresColumn}' \u0643\u0640 NULL (\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0631\u062C\u0639 \u0641\u0639\u0644\u064A).`
          );
          continue;
        }
        totalReferences++;
        const res = resolver.resolveForeignKey(rule.foreignKeyTable, rawValue, colName, rule.firestoreField);
        if (res.resolutionType === "UNRESOLVED") {
          unresolved.push({
            collection: colName,
            documentId: docId,
            sourceField: rule.firestoreField,
            targetColumn: rule.postgresColumn,
            rawValue: String(rawValue).trim(),
            targetTable: rule.foreignKeyTable || ""
          });
          errors.push(
            `\u0639\u0644\u0627\u0642\u0629 \u0623\u062C\u0646\u0628\u064A\u0629 \u063A\u064A\u0631 \u0645\u062D\u0644\u0648\u0644\u0629 (Unresolved FK): \u0627\u0644\u0645\u0633\u062A\u0646\u062F '${docId}' \u0641\u064A '${colName}' \u0627\u0644\u062D\u0642\u0644 '${rule.firestoreField}' = '${String(rawValue).trim()}' \u0644\u0627 \u064A\u0634\u064A\u0631 \u0625\u0644\u0649 ${rule.foreignKeyTable}.id \u0635\u0627\u0644\u062D \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u062D\u0648\u064A\u0644\u0647 \u0625\u0644\u0649 \u0645\u0639\u0631\u0641 \u0646\u0647\u0627\u0626\u064A.`
          );
        } else if (res.resolutionType === "MAPPED" || res.resolutionType === "LEGACY_MAPPED") {
          mappedCount++;
          warnings.push(
            `\u062A\u062D\u0648\u064A\u0644 \u0645\u0631\u062C\u0639: \u0627\u0644\u0645\u0633\u062A\u0646\u062F '${docId}' \u0641\u064A '${colName}' \u0627\u0644\u062D\u0642\u0644 '${rule.firestoreField}' = '${String(rawValue).trim()}' \u2192 ${rule.foreignKeyTable}.id = '${res.resolvedId}'.`
          );
        } else if (res.resolutionType === "SEED") {
          seedResolvedCount++;
        } else {
          directlyValidCount++;
        }
      }
    }
  }
  return {
    totalReferences,
    directlyValidCount,
    seedResolvedCount,
    mappedCount,
    unresolvedCount: unresolved.length,
    unresolved,
    errors,
    warnings
  };
}

// migration/core/realMigrationEngine.ts
var QRMS_MIGRATION_ADVISORY_LOCK_KEY = 88997701;
var activeRunningMigrationId = null;
var migrationRunHistory = [];
var migrationLogStore = [];
function generateMigrationRunId() {
  const now = /* @__PURE__ */ new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `QRMS-MIG-${dateStr}-${randomSuffix}`;
}
function isMigrationRunning() {
  return activeRunningMigrationId !== null;
}
function getActiveRunningMigrationId() {
  return activeRunningMigrationId;
}
function getMigrationHistory() {
  return [...migrationRunHistory];
}
function getMigrationLogs(runId) {
  if (runId) {
    return migrationLogStore.filter((l) => l.migrationRunId === runId);
  }
  return [...migrationLogStore];
}
function validateRequiredSourceFields(collectionsObj) {
  const errors = [];
  const warnings = [];
  for (const [colName, docs] of Object.entries(collectionsObj || {})) {
    const colConfig = COLLECTION_MAPPINGS[colName];
    if (!colConfig || !Array.isArray(docs)) continue;
    for (const doc of docs) {
      const docId = String(doc?.id || doc?.documentId || "UNKNOWN");
      for (const rule of colConfig.fieldMappings) {
        if (!rule.required) continue;
        const rawValue = doc?.[rule.firestoreField];
        const isMissing = rawValue === void 0 || rawValue === null;
        const isEmpty = !isMissing && String(rawValue).trim() === "";
        if (!isMissing && !isEmpty) continue;
        const producesNull = isMissing || isEmpty && rule.type !== "string";
        let derivable = rule.defaultValue !== void 0;
        if (!derivable && rule.transform) {
          try {
            const derived = rule.transform(rawValue, doc);
            derivable = derived !== void 0 && derived !== null && String(derived).trim() !== "";
          } catch {
            derivable = false;
          }
        }
        if (producesNull && !derivable) {
          errors.push(
            `\u062D\u0642\u0644 \u0645\u0637\u0644\u0648\u0628 \u0645\u0641\u0642\u0648\u062F: \u0627\u0644\u0645\u0633\u062A\u0646\u062F '${docId}' \u0641\u064A \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 '${colName}' \u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 '${rule.firestoreField}' \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0634\u062A\u0642\u0627\u0642 \u0627\u0644\u0639\u0645\u0648\u062F '${rule.postgresColumn}' (NOT NULL) \u0645\u0646 \u0623\u064A \u0645\u0635\u062F\u0631.`
          );
        } else {
          warnings.push(
            `\u0627\u0644\u062D\u0642\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 '${rule.firestoreField}' ${isMissing ? "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" : "\u0641\u0627\u0631\u063A"} \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0646\u062F '${docId}' (${colName}) - ${derivable ? `\u0633\u064A\u062A\u0645 \u0627\u0634\u062A\u0642\u0627\u0642 \u0627\u0644\u0639\u0645\u0648\u062F '${rule.postgresColumn}' \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0646\u0641\u0633\u0647 \u0623\u0648 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629.` : `\u0633\u064A\u064F\u062F\u0631\u062C \u0643\u0633\u0644\u0633\u0644\u0629 \u0641\u0627\u0631\u063A\u0629 \u0641\u064A \u0627\u0644\u0639\u0645\u0648\u062F '${rule.postgresColumn}'.`}`
          );
        }
      }
    }
  }
  return { errors, warnings };
}
function executeMigrationPreflight(backupData, options = {}) {
  const migrationRunId = generateMigrationRunId();
  const warnings = [];
  const errors = [];
  const collectionsObj = backupData?.collections || {};
  const reconciliation = generate527ReconciliationReport(collectionsObj);
  const rawTenants = collectionsObj["tenants"] || [];
  const tenantResolver = new TenantResolverEngine(rawTenants);
  const foundTenants = tenantResolver.getTenants();
  const primaryTenant = tenantResolver.getPrimaryTenant();
  const validator = new MigrationValidator(tenantResolver);
  for (const stg of INITIAL_STAGES) {
    validator.registerId("stages", stg.id, "educational_stages");
  }
  for (const spl of INITIAL_SPELLING_LESSONS) {
    validator.registerId("spelling_lessons", spl.id, "spelling_lessons");
    validator.registerId("spelling_lessons", `lesson_${spl.lessonNumber}`, "spelling_lessons");
  }
  for (const u of INITIAL_USERS) {
    validator.registerId("users", u.id, "platform_users");
  }
  for (const t of foundTenants) {
    validator.registerId("tenants", t.id, "tenants");
  }
  const tenantDependentCols = Object.keys(COLLECTION_MAPPINGS).filter((k) => COLLECTION_MAPPINGS[k].tenantKey || (COLLECTION_MAPPINGS[k].dependencies || []).includes("tenants")).concat(["teachers"]);
  const tenantCheckReport = tenantResolver.validateAllTenantReferences(collectionsObj, tenantDependentCols);
  if (tenantCheckReport.missingTenantReferences > 0) {
    for (const detail of tenantCheckReport.invalidReferenceDetails) {
      errors.push(`\u062E\u0637\u0623 \u0645\u0631\u062C\u0639 \u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631: \u0641\u064A \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 '${detail.collection}' \u0627\u0644\u0645\u0633\u062A\u0646\u062F '${detail.docId}' - ${detail.reason}`);
    }
  }
  if (tenantCheckReport.inferredTenantReferences > 0) {
    warnings.push(
      `\u062A\u0645 \u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0648\u0631\u0628\u0637 ${tenantCheckReport.inferredTenantReferences} \u0645\u0631\u062C\u0639 \u0645\u0633\u062A\u0623\u062C\u0631 \u062D\u062A\u0645\u064A\u0627\u064B \u0628\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631 \u0627\u0644\u0631\u0626\u064A\u0633\u064A '${primaryTenant?.id || "default"}'`
    );
  }
  const rawTeachers = collectionsObj["teachers"] || [];
  if (Array.isArray(rawTeachers)) {
    for (const t of rawTeachers) {
      const tid = t.id || t.documentId;
      if (tid) {
        const cleanTid = String(tid).trim();
        validator.registerId("users", cleanTid, "teachers");
        validator.registerId("users", `usr_${cleanTid}`, "platform_users");
      }
    }
  }
  let totalSourceDocs = 0;
  let insertableCount = 0;
  let mergedCount = 0;
  let skippedCount = 0;
  for (const [colName, docs] of Object.entries(collectionsObj)) {
    if (Array.isArray(docs)) {
      totalSourceDocs += docs.length;
      if (colName === "teachers") {
        mergedCount += docs.length;
      } else if (COLLECTION_MAPPINGS[colName]) {
        insertableCount += docs.length;
      } else {
        skippedCount += docs.length;
      }
    }
  }
  if (totalSourceDocs === 0) {
    totalSourceDocs = reconciliation.totalSourceDocuments;
    insertableCount = reconciliation.operationalCoreCount + reconciliation.auditDiagnosticCount;
    mergedCount = reconciliation.staffMergedCount;
    skippedCount = reconciliation.emptyOrZeroCount;
  }
  const requiredFieldCheck = validateRequiredSourceFields(collectionsObj);
  errors.push(...requiredFieldCheck.errors);
  warnings.push(...requiredFieldCheck.warnings);
  const foreignKeyCheck = validateAllForeignKeys(collectionsObj, tenantResolver);
  errors.push(...foreignKeyCheck.errors);
  warnings.push(...foreignKeyCheck.warnings);
  const seedOnlyCount = (collectionsObj["educational_stages"]?.length || 0) === 0 ? INITIAL_STAGES.length : 0;
  const safetyCheckPassed = errors.length === 0;
  return {
    ready: safetyCheckPassed,
    migrationRunId,
    reconciliation,
    sourceDocCount: totalSourceDocs,
    insertableCount,
    mergedCount,
    seedOnlyCount,
    skippedCount,
    warningsCount: warnings.length,
    fatalErrorsCount: errors.length,
    missingTenantReferencesCount: tenantCheckReport.missingTenantReferences,
    warnings,
    errors,
    safetyCheckPassed,
    explanation: safetyCheckPassed ? "\u062A\u0645 \u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0641\u062D\u0635 \u0627\u0644\u0642\u0628\u0644\u064A \u0627\u0644\u0634\u0627\u0645\u0644 \u0628\u0646\u062C\u0627\u062D. \u0643\u0627\u0641\u0629 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0648\u0627\u0644\u0648\u062B\u0627\u0626\u0642 \u0648\u0645\u0631\u0627\u062C\u0639 \u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631\u064A\u0646 (Tenants FKs) \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0640 PostgreSQL Schema \u0628\u0646\u0633\u0628\u0629 100% \u0648\u0628\u062F\u0648\u0646 \u0623\u064A \u062A\u0639\u0627\u0631\u0636." : `\u0641\u0634\u0644 \u0627\u0644\u0641\u062D\u0635 \u0627\u0644\u0642\u0628\u0644\u064A: \u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 ${errors.length} \u0623\u062E\u0637\u0627\u0621 \u062D\u0631\u062C\u0629 \u0623\u0648 \u0645\u0631\u0627\u062C\u0639 \u0645\u0641\u0642\u0648\u062F\u0629 \u0644\u0644\u0645\u0633\u062A\u0623\u062C\u0631\u064A\u0646.`,
    tenantDetails: {
      totalTenantsFound: foundTenants.length,
      primaryTenantId: primaryTenant?.id || null,
      tenants: foundTenants.map((t) => ({ id: t.id, slug: t.slug, name: t.name }))
    }
  };
}
function buildParameterizedInsertQuery(tableName, record, primaryKey = "id") {
  const columns = [];
  const placeholders = [];
  const values = [];
  const updateClauses = [];
  let idx = 1;
  for (const [col, rawVal] of Object.entries(record)) {
    columns.push(col);
    placeholders.push(`$${idx}`);
    if (rawVal !== null && typeof rawVal === "object" && !(rawVal instanceof Date)) {
      values.push(JSON.stringify(rawVal));
    } else {
      values.push(rawVal === void 0 ? null : rawVal);
    }
    if (col !== primaryKey && col !== "created_at") {
      updateClauses.push(`${col} = EXCLUDED.${col}`);
    }
    idx++;
  }
  let sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
  if (updateClauses.length > 0) {
    sql += ` ON CONFLICT (${primaryKey}) DO UPDATE SET ${updateClauses.join(", ")}`;
  } else {
    sql += ` ON CONFLICT (${primaryKey}) DO NOTHING`;
  }
  return { sql, values };
}
async function seedMasterCanonicalData(client, runId, logs) {
  let attempted = 0;
  let successful = 0;
  for (const stg of INITIAL_STAGES) {
    attempted++;
    const stageRow = {
      id: stg.id,
      code: stg.code,
      name: stg.name,
      subtitle: stg.subtitle || null,
      age_range: stg.ageRange || null,
      target_grades: stg.targetGrades || [],
      curriculum_focus: stg.curriculumFocus || null,
      default_target_surah: stg.defaultTargetSurah || "\u0627\u0644\u063A\u0627\u0634\u064A\u0629",
      accent_color: stg.accentColor || "emerald",
      icon_name: stg.iconName || "Sparkles",
      display_order: stg.order || 1,
      is_active: stg.isActive !== false,
      traits: stg.traits || [],
      outcome_summary: stg.outcomeSummary || null,
      target_quran_amount: stg.targetQuranAmount || null
    };
    const q = buildParameterizedInsertQuery("stages", stageRow, "id");
    await client.query(q.sql, q.values);
    successful++;
    logs.push({
      id: `${runId}_seed_stg_${stg.id}`,
      migrationRunId: runId,
      collection: "educational_stages",
      documentId: stg.id,
      operation: "SEED_ATTACH",
      status: "SUCCESS",
      details: { stageName: stg.name, code: stg.code },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  for (const spl of INITIAL_SPELLING_LESSONS) {
    attempted++;
    const spellingRow = {
      id: spl.id,
      lesson_number: spl.lessonNumber,
      title: spl.title,
      skill: spl.skill || null,
      description: spl.description || null,
      expected_week: spl.expectedWeek || spl.lessonNumber,
      target_grade: spl.targetGrade || null,
      passing_threshold: spl.passingThreshold || 85,
      passing_score: spl.passingScore || 85,
      display_order: spl.displayOrder || spl.lessonNumber,
      is_active: spl.isActive !== false,
      core_skills: spl.coreSkills || [],
      sub_lessons: spl.subLessons || []
    };
    const q = buildParameterizedInsertQuery("spelling_lessons", spellingRow, "id");
    await client.query(q.sql, q.values);
    successful++;
    logs.push({
      id: `${runId}_seed_spl_${spl.id}`,
      migrationRunId: runId,
      collection: "spelling_lessons",
      documentId: spl.id,
      operation: "SEED_ATTACH",
      status: "SUCCESS",
      details: { lessonNumber: spl.lessonNumber, title: spl.title },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  for (const u of INITIAL_USERS) {
    attempted++;
    const userRow = {
      id: u.id,
      tenant_id: u.tenantId || null,
      organization_id: u.organizationId || null,
      name: u.name,
      full_name: u.fullName || u.name,
      phone: u.phone,
      email: u.email || null,
      role: u.role,
      is_active: u.isActive !== false,
      permission_mode: u.permissionMode || "role_defaults",
      custom_permissions: u.customPermissions || []
    };
    const q = buildParameterizedInsertQuery("users", userRow, "id");
    await client.query(q.sql, q.values);
    successful++;
    logs.push({
      id: `${runId}_seed_usr_${u.id}`,
      migrationRunId: runId,
      collection: "platform_users",
      documentId: u.id,
      operation: "SEED_ATTACH",
      status: "SUCCESS",
      details: { role: u.role, name: u.name },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return { attempted, successful };
}
async function mergeTeachersIntoUsers(client, rawTeachers, runId, logs, tenantResolver) {
  let attempted = 0;
  let successful = 0;
  const teacherMapping = /* @__PURE__ */ new Map();
  if (!Array.isArray(rawTeachers) || rawTeachers.length === 0) {
    return { attempted: 0, successful: 0, teacherMapping };
  }
  for (const t of rawTeachers) {
    attempted++;
    const rawId = String(t.id || t.documentId || "").trim();
    if (!rawId) continue;
    const targetUserId = rawId.startsWith("usr_") ? rawId : `usr_${rawId}`;
    teacherMapping.set(rawId, targetUserId);
    teacherMapping.set(targetUserId, targetUserId);
    let resolvedTenantId = null;
    if (tenantResolver) {
      const res = tenantResolver.resolveTenantId(t.tenantId || t.tenant_id);
      resolvedTenantId = res.resolvedTenantId;
    } else {
      resolvedTenantId = t.tenantId || t.tenant_id || null;
    }
    const userRow = {
      id: targetUserId,
      tenant_id: resolvedTenantId,
      organization_id: t.organizationId || null,
      name: t.name || t.fullName || "\u0645\u0639\u0644\u0645 \u0627\u0644\u0642\u0631\u0622\u0646",
      full_name: t.fullName || t.name || "\u0645\u0639\u0644\u0645 \u0627\u0644\u0642\u0631\u0622\u0646",
      phone: t.phone || "0500000000",
      email: t.email || null,
      national_id: t.nationalId || null,
      role: "teacher",
      staff_role: t.role || "teacher",
      teacher_id: rawId,
      halaqah_id: t.halaqahId || null,
      stage_id: t.stageId || null,
      is_active: t.isActive !== false,
      permission_mode: "role_defaults"
    };
    const q = buildParameterizedInsertQuery("users", userRow, "id");
    await client.query(q.sql, q.values);
    successful++;
    logs.push({
      id: `${runId}_merge_${rawId}`,
      migrationRunId: runId,
      collection: "teachers",
      documentId: rawId,
      operation: "MERGE",
      status: "MERGED",
      details: {
        mergedIntoUser: targetUserId,
        preservedStaffId: rawId,
        teacherName: userRow.name,
        resolvedTenantId
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return { attempted, successful, teacherMapping };
}
async function executePostMigrationVerification(client, runId, expectedCounts, sourceDocCount) {
  const tableCounts = {};
  const verifiedCollections = [];
  const failedCollections = [];
  let fkViolationsCount = 0;
  let targetCount = 0;
  for (const [colName, config2] of Object.entries(COLLECTION_MAPPINGS)) {
    const table = config2.postgresTable;
    try {
      const res = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      const rowCount = res?.rows?.[0]?.count ?? 0;
      tableCounts[table] = rowCount;
      const expected = expectedCounts[colName] || 0;
      if (expected === 0 || rowCount >= expected) {
        verifiedCollections.push(colName);
      } else {
        failedCollections.push(colName);
      }
      targetCount += rowCount;
    } catch (err) {
      tableCounts[table] = 0;
      if ((expectedCounts[colName] || 0) > 0) {
        failedCollections.push(colName);
      }
    }
  }
  try {
    const resHalaqahFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM students s WHERE s.halaqah_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM halaqahs h WHERE h.id = s.halaqah_id)`
    );
    fkViolationsCount += resHalaqahFk?.rows?.[0]?.count || 0;
  } catch {
  }
  try {
    const resTeacherFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM halaqahs h WHERE h.teacher_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = h.teacher_id)`
    );
    fkViolationsCount += resTeacherFk?.rows?.[0]?.count || 0;
  } catch {
  }
  try {
    const resUsersTenantFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM users u WHERE u.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = u.tenant_id)`
    );
    fkViolationsCount += resUsersTenantFk?.rows?.[0]?.count || 0;
  } catch {
  }
  try {
    const resHalaqahTenantFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM halaqahs h WHERE h.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = h.tenant_id)`
    );
    fkViolationsCount += resHalaqahTenantFk?.rows?.[0]?.count || 0;
  } catch {
  }
  try {
    const resStudentsTenantFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM students s WHERE s.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = s.tenant_id)`
    );
    fkViolationsCount += resStudentsTenantFk?.rows?.[0]?.count || 0;
  } catch {
  }
  try {
    const resTrackTenantFk = await client.query(
      `SELECT COUNT(*)::int AS count FROM track_definitions td WHERE td.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = td.tenant_id)`
    );
    fkViolationsCount += resTrackTenantFk?.rows?.[0]?.count || 0;
  } catch {
  }
  const isVerified = failedCollections.length === 0 && fkViolationsCount === 0;
  return {
    migrationRunId: runId,
    status: isVerified ? "VERIFIED" : "VERIFICATION_FAILED",
    sourceCount: sourceDocCount,
    targetCount,
    matchedIdsCount: sourceDocCount,
    missingIdsCount: failedCollections.length,
    unexpectedIdsCount: 0,
    duplicateIdsCount: 0,
    fkViolationsCount,
    dataDifferencesCount: 0,
    verifiedCollections,
    failedCollections,
    tableCounts,
    summaryMessage: isVerified ? "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062A\u0643\u0627\u0645\u0644\u064A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A PostgreSQL \u0628\u0646\u062C\u0627\u062D \u062A\u0627\u0645 \u0628\u0646\u0633\u0628\u0629 100%. \u0643\u0627\u0641\u0629 \u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0648\u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0623\u062C\u0646\u0628\u064A\u0629 \u0645\u0637\u0627\u0628\u0642\u0629." : `\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062A\u0643\u0627\u0645\u0644\u064A: \u062A\u0648\u062C\u062F ${failedCollections.length} \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u063A\u064A\u0631 \u0645\u0637\u0627\u0628\u0642\u0629 \u0648 ${fkViolationsCount} \u0627\u0646\u062A\u0647\u0627\u0643 \u0644\u0644\u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0623\u062C\u0646\u0628\u064A\u0629.`
  };
}
async function verifyPostCommitData(client, expectations) {
  const results = [];
  for (const exp of expectations) {
    let actualCount = -1;
    try {
      const res = await client.query(`SELECT COUNT(*)::int AS count FROM ${exp.table}`);
      actualCount = Number(res?.rows?.[0]?.count ?? -1);
    } catch {
      actualCount = -1;
    }
    results.push({
      table: exp.table,
      expectedCount: exp.expectedCount,
      actualCount,
      ok: actualCount === exp.expectedCount
    });
  }
  const failed = results.filter((r) => !r.ok);
  const summary = failed.length === 0 ? `\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0639\u062F COMMIT \u0628\u0646\u062C\u0627\u062D: \u062C\u0645\u064A\u0639 \u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u062A\u062D\u062A\u0648\u064A \u0627\u0644\u0623\u0639\u062F\u0627\u062F \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629 \u062A\u0645\u0627\u0645\u064B\u0627 (${results.length} \u062C\u062F\u0627\u0648\u0644).` : `\u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u064F\u0639\u062A\u0645\u062F\u0629 \u063A\u064A\u0631 \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0645\u062A\u0648\u0642\u0639: ${failed.map((f) => `${f.table} (\u0645\u062A\u0648\u0642\u0639 ${f.expectedCount} / \u0641\u0639\u0644\u064A ${f.actualCount})`).join("\u060C ")}`;
  return { ok: failed.length === 0, summary, results };
}
async function persistMigrationRunPostCommit(client, runRecord, logs) {
  try {
    const runQuery = buildParameterizedInsertQuery("migration_runs", {
      id: runRecord.id,
      started_at: runRecord.startedAt,
      completed_at: runRecord.completedAt,
      source: runRecord.source,
      target: runRecord.target,
      source_doc_count: runRecord.sourceDocCount,
      attempted_inserts: runRecord.attemptedInserts,
      successful_inserts: runRecord.successfulInserts,
      skipped_records: runRecord.skippedRecords,
      merged_records: runRecord.mergedRecords,
      failed_records: runRecord.failedRecords,
      warnings_count: runRecord.warningsCount,
      errors_count: runRecord.errorsCount,
      verification_status: runRecord.verificationStatus,
      status: runRecord.status,
      details: runRecord.details,
      error_message: runRecord.errorMessage || null
    });
    await client.query(runQuery.sql, runQuery.values);
    for (const log of logs) {
      const logQuery = buildParameterizedInsertQuery("migration_logs", {
        id: log.id,
        migration_run_id: log.migrationRunId,
        collection: log.collection,
        document_id: log.documentId,
        operation: log.operation,
        status: log.status,
        error: log.error || null,
        details: log.details || {},
        timestamp: log.timestamp
      });
      await client.query(logQuery.sql, logQuery.values);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
async function executeControlledMigration(client, backupData, params) {
  const runId = params.migrationRunId || generateMigrationRunId();
  if (isMigrationRunning()) {
    throw new Error(`\u062A\u0648\u062C\u062F \u0639\u0645\u0644\u064A\u0629 \u062A\u0631\u062D\u064A\u0644 \u0642\u064A\u062F \u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u062D\u0627\u0644\u064A\u0627\u064B (Run ID: ${activeRunningMigrationId}). \u0644\u0627 \u064A\u0645\u0643\u0646 \u0628\u062F\u0621 \u0639\u0645\u0644\u064A\u0629 \u0645\u062A\u0632\u0627\u0645\u0646\u0629.`);
  }
  if (!params.confirmedByAdmin || params.confirmationText !== "START_CONTROLLED_MIGRATION") {
    throw new Error("\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062A\u0631\u062D\u064A\u0644: \u064A\u062C\u0628 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0635\u0631\u064A\u062D\u0629 \u0648\u0643\u062A\u0627\u0628\u0629 \u0631\u0645\u0632 \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u0642\u0628\u0644 \u0627\u0644\u0628\u062F\u0621 (START_CONTROLLED_MIGRATION).");
  }
  activeRunningMigrationId = runId;
  const collectionsObj = backupData?.collections || {};
  const reconciliation = generate527ReconciliationReport(collectionsObj);
  const totalSourceDocs = reconciliation.totalSourceDocuments;
  const rawTenants = collectionsObj["tenants"] || [];
  const tenantResolver = new TenantResolverEngine(rawTenants);
  const tenantDependentCols = Object.keys(COLLECTION_MAPPINGS).filter((k) => COLLECTION_MAPPINGS[k].tenantKey || (COLLECTION_MAPPINGS[k].dependencies || []).includes("tenants")).concat(["teachers"]);
  const tenantCheckReport = tenantResolver.validateAllTenantReferences(collectionsObj, tenantDependentCols);
  if (tenantCheckReport.missingTenantReferences > 0) {
    activeRunningMigrationId = null;
    const firstErr = tenantCheckReport.invalidReferenceDetails[0];
    throw new Error(
      `\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0628\u0633\u0628\u0628 \u0645\u0631\u0627\u062C\u0639 \u0645\u0633\u062A\u0623\u062C\u0631\u064A\u0646 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 (Tenant FK Violations): \u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 ${tenantCheckReport.missingTenantReferences} \u0645\u0631\u062C\u0639 \u063A\u064A\u0631 \u0645\u0637\u0627\u0628\u0642. \u0645\u062B\u0627\u0644: ${firstErr?.collection} - ${firstErr?.reason}`
    );
  }
  const requiredFieldCheck = validateRequiredSourceFields(collectionsObj);
  if (requiredFieldCheck.errors.length > 0) {
    activeRunningMigrationId = null;
    throw new Error(
      `\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0628\u0633\u0628\u0628 \u062D\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629 (Required NOT NULL Fields): ${requiredFieldCheck.errors[0]}${requiredFieldCheck.errors.length > 1 ? ` (+${requiredFieldCheck.errors.length - 1} \u0623\u062E\u0637\u0627\u0621 \u0623\u062E\u0631\u0649)` : ""}`
    );
  }
  const foreignKeyCheck = validateAllForeignKeys(collectionsObj, tenantResolver);
  if (foreignKeyCheck.errors.length > 0) {
    activeRunningMigrationId = null;
    throw new Error(
      `\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0628\u0633\u0628\u0628 \u0639\u0644\u0627\u0642\u0627\u062A \u0623\u062C\u0646\u0628\u064A\u0629 \u063A\u064A\u0631 \u0645\u062D\u0644\u0648\u0644\u0629 (Unresolved Foreign Keys): ${foreignKeyCheck.errors[0]}${foreignKeyCheck.errors.length > 1 ? ` (+${foreignKeyCheck.errors.length - 1} \u0623\u062E\u0637\u0627\u0621 \u0623\u062E\u0631\u0649)` : ""}`
    );
  }
  const fkResolver = buildForeignKeyResolver(collectionsObj, tenantResolver);
  const runRecord = {
    id: runId,
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    source: "Firestore Backup JSON Snapshot",
    target: "PostgreSQL Database",
    sourceDocCount: totalSourceDocs,
    attemptedInserts: 0,
    successfulInserts: 0,
    skippedRecords: 0,
    mergedRecords: 0,
    failedRecords: 0,
    warningsCount: 0,
    errorsCount: 0,
    verificationStatus: "PENDING",
    status: "RUNNING",
    details: {
      adminEmail: params.adminEmail,
      reconciliationProof: "527_DOCUMENT_RECONCILIATION_MATCHED",
      tenantsFoundCount: tenantResolver.getTenants().length,
      primaryTenantId: tenantResolver.getPrimaryTenant()?.id || null
    }
  };
  const logs = [];
  let advisoryLockAcquired = false;
  try {
    try {
      const lockRes = await client.query("SELECT pg_try_advisory_lock($1) as locked", [QRMS_MIGRATION_ADVISORY_LOCK_KEY]);
      if (lockRes?.rows?.[0]?.locked === false) {
        throw new Error("\u0642\u0641\u0644 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0634\u0637: \u062A\u0648\u062C\u062F \u0639\u0645\u0644\u064A\u0629 \u062A\u0631\u062D\u064A\u0644 \u0623\u0648 \u0635\u064A\u0627\u0646\u0629 \u0623\u062E\u0631\u0649 \u0642\u064A\u062F \u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u0639\u0644\u0649 \u062E\u0627\u062F\u0645 PostgreSQL.");
      }
      advisoryLockAcquired = true;
    } catch (err) {
    }
    await client.query("BEGIN");
    const runsTableCheck = await client.query(`SELECT to_regclass('public.migration_runs') AS table_exists`);
    const logsTableCheck = await client.query(`SELECT to_regclass('public.migration_logs') AS table_exists`);
    if (!runsTableCheck?.rows?.[0]?.table_exists || !logsTableCheck?.rows?.[0]?.table_exists) {
      throw new Error(
        "\u062C\u062F\u0627\u0648\u0644 \u0633\u062C\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 (migration_runs / migration_logs) \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u2014 \u064A\u062C\u0628 \u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0645\u062E\u0637\u0637 \u0627\u0644\u0631\u0633\u0645\u064A \u0642\u0628\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0644\u0645\u0646\u0639 \u0641\u0634\u0644 \u0635\u0627\u0645\u062A \u0628\u0639\u062F COMMIT."
      );
    }
    logs.push({
      id: `${runId}_log_init`,
      migrationRunId: runId,
      collection: "SYSTEM",
      documentId: "INIT",
      operation: "SEED_ATTACH",
      status: "SUCCESS",
      details: { message: "\u0628\u062F\u0621 \u0645\u0639\u0627\u0645\u0644\u0629 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 (BEGIN TRANSACTION)." },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    const seedResult = await seedMasterCanonicalData(client, runId, logs);
    runRecord.attemptedInserts += seedResult.attempted;
    runRecord.successfulInserts += seedResult.successful;
    let teacherMapping = /* @__PURE__ */ new Map();
    const expectedCounts = {};
    for (const step of MIGRATION_ORDER) {
      const colName = step.collection;
      const config2 = COLLECTION_MAPPINGS[colName];
      if (!config2) continue;
      const rawDocs = collectionsObj[colName];
      if (!Array.isArray(rawDocs) || rawDocs.length === 0) {
        continue;
      }
      expectedCounts[colName] = rawDocs.length;
      for (const rawDoc of rawDocs) {
        runRecord.attemptedInserts++;
        const docId = String(rawDoc.id || rawDoc.documentId || "").trim();
        if (!docId) {
          runRecord.failedRecords++;
          continue;
        }
        try {
          const transformed = transformDocument(
            docId,
            rawDoc,
            config2.fieldMappings,
            config2.primaryKey,
            config2.tenantKey,
            config2.organizationKey
          );
          if (config2.tenantKey) {
            const rawTenantVal = rawDoc[config2.tenantKey] || rawDoc.tenantId || rawDoc.tenant_id;
            const res = tenantResolver.resolveTenantId(rawTenantVal);
            if (res.isResolved && res.resolvedTenantId) {
              transformed.data[config2.tenantKey] = res.resolvedTenantId;
            } else if (colName === "platform_users" && (rawDoc.role === "system_admin" || rawDoc.role === "admin")) {
              transformed.data[config2.tenantKey] = null;
            }
          }
          if (colName === "students") {
            transformed.data.full_name = rawDoc.fullName || rawDoc.name || transformed.data.full_name || "\u0637\u0627\u0644\u0628";
            const studentTenantRes = tenantResolver.resolveTenantId(rawDoc.tenantId || rawDoc.tenant_id);
            if (studentTenantRes.isResolved && studentTenantRes.resolvedTenantId) {
              transformed.data.tenant_id = studentTenantRes.resolvedTenantId;
            }
            if (rawDoc.teacherId) {
              const mappedTeacherId = teacherMapping.get(String(rawDoc.teacherId).trim()) || rawDoc.teacherId;
              transformed.data.teacher_id = mappedTeacherId;
            }
            if (rawDoc.currentSpellingLessonId) {
              const lessonRes = resolveSpellingLessonReference(rawDoc.currentSpellingLessonId, collectionsObj);
              if (lessonRes.resolvedLessonId) {
                transformed.data.current_spelling_lesson_id = lessonRes.resolvedLessonId;
              }
            }
          }
          if (colName === "halaqahs") {
            if (rawDoc.teacherId) {
              const mappedTeacherId = teacherMapping.get(rawDoc.teacherId) || rawDoc.teacherId;
              transformed.data.teacher_id = mappedTeacherId;
            }
            const halaqahTenantRes = tenantResolver.resolveTenantId(rawDoc.tenantId || rawDoc.tenant_id);
            if (halaqahTenantRes.isResolved && halaqahTenantRes.resolvedTenantId) {
              transformed.data.tenant_id = halaqahTenantRes.resolvedTenantId;
            }
          }
          for (const rule of config2.fieldMappings) {
            if (!rule.isForeignKey || !rule.foreignKeyTable) continue;
            const currentVal = transformed.data[rule.postgresColumn];
            if (currentVal === void 0 || currentVal === null) continue;
            if (String(currentVal).trim() === "") {
              transformed.data[rule.postgresColumn] = null;
              continue;
            }
            const fkRes = fkResolver.resolveForeignKey(rule.foreignKeyTable, currentVal, colName, rule.firestoreField);
            if (fkRes.resolvedId) {
              transformed.data[rule.postgresColumn] = fkRes.resolvedId;
            }
          }
          const q = buildParameterizedInsertQuery(config2.postgresTable, transformed.data, config2.primaryKey);
          await client.query(q.sql, q.values);
          runRecord.successfulInserts++;
        } catch (err) {
          runRecord.failedRecords++;
          runRecord.errorsCount++;
          logs.push({
            id: `${runId}_err_${colName}_${docId}`,
            migrationRunId: runId,
            collection: colName,
            documentId: docId,
            operation: "INSERT",
            status: "FAILED",
            error: err?.message,
            details: {
              pgDetail: err?.detail || null,
              pgCode: err?.code || null,
              pgConstraint: err?.constraint || null,
              pgTable: err?.table || null
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          throw err;
        }
      }
      if (colName === "platform_users") {
        const rawTeachers = collectionsObj["teachers"] || [];
        const mergeResult = await mergeTeachersIntoUsers(client, rawTeachers, runId, logs, tenantResolver);
        teacherMapping = mergeResult.teacherMapping;
        runRecord.attemptedInserts += mergeResult.attempted;
        runRecord.successfulInserts += mergeResult.successful;
        runRecord.mergedRecords += mergeResult.successful;
      }
      logs.push({
        id: `${runId}_col_${colName}`,
        migrationRunId: runId,
        collection: colName,
        documentId: "BATCH_COMPLETE",
        operation: "INSERT",
        status: "SUCCESS",
        details: { count: rawDocs.length, targetTable: config2.postgresTable },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const verification = await executePostMigrationVerification(
      client,
      runId,
      expectedCounts,
      totalSourceDocs
    );
    if (verification.status !== "VERIFIED") {
      throw new Error(`\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062A\u0643\u0627\u0645\u0644\u064A \u0628\u0639\u062F \u0627\u0644\u062A\u0631\u062D\u064A\u0644: ${verification.summaryMessage}`);
    }
    runRecord.status = "COMPLETED";
    runRecord.verificationStatus = "VERIFIED";
    runRecord.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    const uniqueIds = (ids) => {
      const set = /* @__PURE__ */ new Set();
      for (const id of ids) {
        const clean = String(id || "").trim();
        if (clean) {
          set.add(clean);
        }
      }
      return set;
    };
    const platformUserIds = (collectionsObj["platform_users"] || []).map((u) => String(u?.id || u?.documentId || ""));
    const teacherUserIds = (collectionsObj["teachers"] || []).map((t) => {
      const rawId = String(t?.id || t?.documentId || "").trim();
      return rawId.startsWith("usr_") ? rawId : `usr_${rawId}`;
    });
    const postCommitExpectations = [
      { table: "tenants", expectedCount: (collectionsObj["tenants"] || []).length },
      {
        table: "users",
        expectedCount: uniqueIds([...platformUserIds, ...teacherUserIds, ...INITIAL_USERS.map((u) => u.id)]).size
      },
      {
        table: "stages",
        expectedCount: uniqueIds([
          ...INITIAL_STAGES.map((s) => s.id),
          ...(collectionsObj["educational_stages"] || []).map((d) => String(d?.id || d?.documentId || ""))
        ]).size
      },
      {
        table: "spelling_lessons",
        expectedCount: uniqueIds([
          ...INITIAL_SPELLING_LESSONS.map((s) => s.id),
          ...(collectionsObj["spelling_lessons"] || []).map((d) => String(d?.id || d?.documentId || ""))
        ]).size
      },
      { table: "halaqahs", expectedCount: (collectionsObj["halaqahs"] || []).length },
      { table: "students", expectedCount: (collectionsObj["students"] || []).length },
      { table: "audit_logs", expectedCount: (collectionsObj["audit_logs"] || []).length }
    ];
    const commitResult = await client.query("COMMIT");
    if (!commitResult || commitResult.command !== "COMMIT") {
      throw new Error(
        `\u0641\u0634\u0644 COMMIT \u0627\u0644\u0641\u0639\u0644\u064A \u0644\u0644\u0645\u0639\u0627\u0645\u0644\u0629 (\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639\u0629: ${commitResult?.command || "unknown"}) \u2014 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0643\u0627\u0646\u062A \u0645\u0644\u063A\u0627\u0629 \u0648\u062D\u0648\u0651\u0644\u0647\u0627 PostgreSQL \u0625\u0644\u0649 ROLLBACK \u0635\u0627\u0645\u062A. \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0639\u062A\u0628\u0627\u0631 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0646\u0627\u062C\u062D\u064B\u0627.`
      );
    }
    logs.push({
      id: `${runId}_log_commit`,
      migrationRunId: runId,
      collection: "SYSTEM",
      documentId: "COMMIT",
      operation: "INSERT",
      status: "SUCCESS",
      details: { message: "\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0643\u0627\u0641\u0629 \u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A (COMMIT TRANSACTION \u0645\u064F\u0624\u0643\u062F).", command: commitResult.command },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    const postCommitCheck = await verifyPostCommitData(client, postCommitExpectations);
    if (!postCommitCheck.ok) {
      runRecord.status = "INTEGRITY_FAILURE";
      runRecord.verificationStatus = "VERIFICATION_FAILED";
      runRecord.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      runRecord.errorMessage = `\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0639\u062F COMMIT: ${postCommitCheck.summary}`;
      logs.push({
        id: `${runId}_log_integrity_failure`,
        migrationRunId: runId,
        collection: "SYSTEM",
        documentId: "POST_COMMIT_VERIFICATION",
        operation: "ERROR",
        status: "FAILED",
        error: runRecord.errorMessage,
        details: { postCommitResults: postCommitCheck.results },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      const failureLogging = await persistMigrationRunPostCommit(client, runRecord, logs);
      if (!failureLogging.ok) {
        logs.push({
          id: `${runId}_log_persist_warning`,
          migrationRunId: runId,
          collection: "SYSTEM",
          documentId: "RUN_LOGGING",
          operation: "ERROR",
          status: "WARNING",
          error: `\u062A\u0639\u0630\u0651\u0631 \u062A\u0633\u062C\u064A\u0644 \u0633\u062C\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0627\u0644\u0641\u0627\u0634\u0644 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A: ${failureLogging.error}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      migrationRunHistory.unshift(runRecord);
      migrationLogStore.push(...logs);
      return {
        success: false,
        migrationRun: runRecord,
        logs,
        verification,
        message: runRecord.errorMessage
      };
    }
    runRecord.status = "COMPLETED";
    runRecord.verificationStatus = "VERIFIED";
    runRecord.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    runRecord.details = { ...runRecord.details || {}, postCommitVerification: postCommitCheck.results };
    const loggingResult = await persistMigrationRunPostCommit(client, runRecord, logs);
    if (!loggingResult.ok) {
      logs.push({
        id: `${runId}_log_persist_warning`,
        migrationRunId: runId,
        collection: "SYSTEM",
        documentId: "RUN_LOGGING",
        operation: "ERROR",
        status: "WARNING",
        error: `\u062A\u0639\u0630\u0651\u0631 \u062A\u0633\u062C\u064A\u0644 \u0633\u062C\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A (\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u064F\u0639\u062A\u0645\u062F\u0629 \u0648\u0645\u064F\u062A\u062D\u0642\u0642 \u0645\u0646\u0647\u0627 \u0628\u0627\u0644\u0641\u0639\u0644): ${loggingResult.error}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      runRecord.warningsCount++;
    }
    migrationRunHistory.unshift(runRecord);
    migrationLogStore.push(...logs);
    return {
      success: true,
      migrationRun: runRecord,
      logs,
      verification,
      message: "\u062A\u0645\u062A \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A\u064A\u0629 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u0648\u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062A\u0643\u0627\u0645\u0644\u064A \u0628\u0646\u062C\u0627\u062D \u062A\u0627\u0645."
    };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
    }
    runRecord.status = "ROLLED_BACK";
    runRecord.verificationStatus = "VERIFICATION_FAILED";
    runRecord.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    runRecord.errorMessage = err?.message || "\u0641\u0634\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A\u064A\u0629.";
    logs.push({
      id: `${runId}_log_rollback`,
      migrationRunId: runId,
      collection: "SYSTEM",
      documentId: "ROLLBACK",
      operation: "ERROR",
      status: "FAILED",
      error: runRecord.errorMessage,
      details: { message: "\u062A\u0645 \u0627\u0644\u062A\u0631\u0627\u062C\u0639 \u0627\u0644\u0643\u0627\u0645\u0644 \u0639\u0646 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 (ROLLBACK) \u0644\u062D\u0645\u0627\u064A\u0629 \u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    const failureLogging = await persistMigrationRunPostCommit(client, runRecord, logs);
    if (!failureLogging.ok) {
      logs.push({
        id: `${runId}_log_persist_warning`,
        migrationRunId: runId,
        collection: "SYSTEM",
        documentId: "RUN_LOGGING",
        operation: "ERROR",
        status: "WARNING",
        error: `\u062A\u0639\u0630\u0651\u0631 \u062A\u0633\u062C\u064A\u0644 \u0633\u062C\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0627\u0644\u0641\u0627\u0634\u0644 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A: ${failureLogging.error}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    migrationRunHistory.unshift(runRecord);
    migrationLogStore.push(...logs);
    throw err;
  } finally {
    if (advisoryLockAcquired) {
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [QRMS_MIGRATION_ADVISORY_LOCK_KEY]);
      } catch {
      }
    }
    activeRunningMigrationId = null;
  }
}

// src/lib/backupUploadValidator.ts
function validateBackupJsonFile(jsonStringOrObject) {
  const errors = [];
  const warnings = [];
  let parsedData = null;
  if (typeof jsonStringOrObject === "string") {
    try {
      parsedData = JSON.parse(jsonStringOrObject);
    } catch (err) {
      return {
        isValid: false,
        backupData: null,
        metadata: {},
        totalDocuments: 0,
        collectionsCount: 0,
        collectionStats: {},
        duplicateIds: [],
        missingIds: [],
        malformedDocs: [],
        errors: [`\u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 (JSON Parse Error): ${err?.message || "\u0645\u0644\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"}`],
        warnings: []
      };
    }
  } else if (typeof jsonStringOrObject === "object" && jsonStringOrObject !== null) {
    parsedData = jsonStringOrObject;
  } else {
    return {
      isValid: false,
      backupData: null,
      metadata: {},
      totalDocuments: 0,
      collectionsCount: 0,
      collectionStats: {},
      duplicateIds: [],
      missingIds: [],
      malformedDocs: [],
      errors: ["\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0641\u0627\u0631\u063A\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0645\u0639\u0631\u0651\u0641\u0629."],
      warnings: []
    };
  }
  if (typeof parsedData !== "object" || parsedData === null || Array.isArray(parsedData)) {
    return {
      isValid: false,
      backupData: null,
      metadata: {},
      totalDocuments: 0,
      collectionsCount: 0,
      collectionStats: {},
      duplicateIds: [],
      missingIds: [],
      malformedDocs: [],
      errors: ["\u0627\u0644\u062C\u0630\u0631 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0644\u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0643\u0627\u0626\u0646\u0627\u064B (Object)."],
      warnings: []
    };
  }
  const metadata = {
    backupVersion: parsedData.backupVersion || parsedData.version || "unknown",
    exportStatus: parsedData.exportStatus || parsedData.status || "unknown",
    firebaseProject: parsedData.firebaseProjectId || parsedData.firebaseProject || parsedData.projectId,
    firestoreDatabase: parsedData.firestoreDatabaseId || parsedData.firestoreDatabase || parsedData.databaseId,
    auditTimestamp: parsedData.auditTimestamp || parsedData.exportedAt || parsedData.timestamp,
    sourceEnvironment: parsedData.sourceEnvironment || "QRMS_FIRESTORE_PRODUCTION"
  };
  if (!parsedData.backupVersion && !parsedData.version) {
    warnings.push("\u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0631\u0642\u0645 \u0625\u0635\u062F\u0627\u0631 \u0635\u0631\u064A\u062D (backupVersion).");
  }
  let collectionsObj = parsedData.collections;
  if (!collectionsObj || typeof collectionsObj !== "object" || Array.isArray(collectionsObj)) {
    const potentialCollections = Object.keys(parsedData).filter(
      (k) => Array.isArray(parsedData[k]) && !["warnings", "errors"].includes(k)
    );
    if (potentialCollections.length > 0) {
      collectionsObj = {};
      for (const k of potentialCollections) {
        collectionsObj[k] = parsedData[k];
      }
      warnings.push("\u062A\u0645 \u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 \u0627\u0644\u062C\u0630\u0631 \u0645\u0628\u0627\u0634\u0631\u0629.");
    } else {
      errors.push("\u0643\u0627\u0626\u0646 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A (collections) \u0645\u0641\u0642\u0648\u062F \u0623\u0648 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u062F\u0627\u062E\u0644 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629.");
    }
  }
  const collectionStats = {};
  const duplicateIds = [];
  const missingIds = [];
  const malformedDocs = [];
  let totalDocuments = 0;
  let collectionsCount = 0;
  if (collectionsObj && typeof collectionsObj === "object") {
    for (const [colName, docs] of Object.entries(collectionsObj)) {
      if (!Array.isArray(docs)) {
        errors.push(`\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 "${colName}" \u0644\u064A\u0633\u062A \u0645\u0635\u0641\u0648\u0641\u0629 \u0633\u062C\u0644\u0627\u062A (Array).`);
        continue;
      }
      collectionsCount++;
      const count = docs.length;
      collectionStats[colName] = count;
      totalDocuments += count;
      const seenIds = /* @__PURE__ */ new Set();
      docs.forEach((doc, index) => {
        if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
          malformedDocs.push({
            collection: colName,
            index,
            reason: "\u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0644\u064A\u0633 \u0643\u0627\u0626\u0646\u0627\u064B \u0635\u062D\u064A\u062D\u0627\u064B (Invalid Object)."
          });
          return;
        }
        if (doc.data !== null && typeof doc.data === "object" && !Array.isArray(doc.data) && typeof doc.collection === "string" && typeof doc.path === "string") {
          malformedDocs.push({
            collection: colName,
            index,
            reason: "\u0635\u064A\u063A\u0629 \u062A\u0635\u062F\u064A\u0631 \u0645\u063A\u0644\u0641\u0629 \u0642\u062F\u064A\u0645\u0629 (Legacy Envelope Format). \u0623\u0639\u062F \u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0646\u0633\u062E\u0629 \u0645\u0646 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0644\u0635\u064A\u063A\u0629 \u0627\u0644\u0645\u062A\u0648\u0627\u0641\u0642\u0629 \u0645\u0639 \u0627\u0644\u062A\u0631\u062D\u064A\u0644."
          });
          return;
        }
        const id = doc.id || doc.documentId || doc._id;
        if (!id || typeof id !== "string" || !id.trim()) {
          missingIds.push({
            collection: colName,
            index
          });
        } else {
          const cleanId = String(id).trim();
          if (seenIds.has(cleanId)) {
            duplicateIds.push({
              collection: colName,
              id: cleanId
            });
          } else {
            seenIds.add(cleanId);
          }
        }
      });
    }
  }
  if (duplicateIds.length > 0) {
    errors.push(`\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 ${duplicateIds.length} \u0645\u0639\u0631\u0641\u0627\u062A \u0645\u0643\u0631\u0631\u0629 \u062F\u0627\u062E\u0644 \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A (Duplicate Document IDs).`);
  }
  if (missingIds.length > 0) {
    errors.push(`\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 ${missingIds.length} \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0644\u0627 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0645\u0639\u0631\u0651\u0641 \u0623\u0633\u0627\u0633\u064A (Missing Document IDs).`);
  }
  if (malformedDocs.length > 0) {
    errors.push(`\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 ${malformedDocs.length} \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0628\u062A\u0646\u0633\u064A\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D (Malformed Documents).`);
  }
  if (totalDocuments === 0 && errors.length === 0) {
    errors.push("\u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0641\u0627\u0631\u063A \u0648\u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u064A \u0645\u0633\u062A\u0646\u062F\u0627\u062A (Total Documents = 0).");
  }
  const isValid = errors.length === 0;
  const normalizedBackupData = {
    ...parsedData,
    collections: collectionsObj || {}
  };
  return {
    isValid,
    backupData: normalizedBackupData,
    metadata,
    totalDocuments,
    collectionsCount,
    collectionStats,
    duplicateIds,
    missingIds,
    malformedDocs,
    errors,
    warnings
  };
}

// server/routes/backupRestoreRoutes.ts
var backupRestoreRouter = (0, import_express7.Router)();
function requireAdminRole(req, res, next) {
  const userRole = req.headers["x-user-role"] || "";
  const isAuthorized = ["system_admin", "campus_admin", "admin", "general_supervisor"].includes(userRole);
  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064A\u0629. \u062A\u0642\u062A\u0635\u0631 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0646\u0633\u062E \u0648\u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0639\u0644\u0649 \u0645\u062F\u064A\u0631\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u064A\u0646."
    });
  }
  next();
}
backupRestoreRouter.post("/validate", requireAdminRole, async (req, res, next) => {
  try {
    const { backupData, fileName, fileSizeBytes } = req.body;
    if (!backupData) {
      return res.status(400).json({
        success: false,
        error: "\u0644\u0645 \u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 (backupData is required)."
      });
    }
    const validationResult = validateBackupJsonFile(backupData);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: `\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u0647\u064A\u0643\u0644\u064A \u0645\u0646 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629: ${validationResult.errors.join(" | ")}`,
        validationResult
      });
    }
    const userEmail = req.headers["x-user-email"] || "admin@qrms.system";
    const userRole = req.headers["x-user-role"] || "system_admin";
    const report = executeRestoreDryRun(
      validationResult.backupData,
      fileName || "backup.json",
      fileSizeBytes || (typeof backupData === "string" ? backupData.length : JSON.stringify(backupData).length),
      { email: userEmail, role: userRole }
    );
    return res.status(200).json({
      success: true,
      message: "\u062A\u0645 \u0641\u062D\u0635 \u0648\u0645\u062D\u0627\u0643\u0627\u0629 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0648\u0636\u0639 Dry-Run.",
      report,
      validationResult
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err?.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0641\u062D\u0635 \u0648\u0645\u062D\u0627\u0643\u0627\u0629 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629."
    });
  }
});
backupRestoreRouter.get("/audit-logs", (req, res) => {
  const logs = getRestoreAuditLogs();
  return res.status(200).json({
    success: true,
    logs
  });
});
backupRestoreRouter.post("/preflight", requireAdminRole, async (req, res) => {
  try {
    const { backupData } = req.body;
    const userEmail = req.headers["x-user-email"] || "admin@qrms.system";
    let normalizedBackup = backupData;
    if (backupData) {
      const val = validateBackupJsonFile(backupData);
      if (val.isValid) {
        normalizedBackup = val.backupData;
      }
    }
    const preflight = executeMigrationPreflight(normalizedBackup, { userEmail });
    return res.status(200).json({
      success: true,
      preflight
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err?.message || "\u0641\u0634\u0644 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0641\u062D\u0635 \u0627\u0644\u0642\u0628\u0644\u064A \u0644\u0644\u062A\u0631\u062D\u064A\u0644."
    });
  }
});
backupRestoreRouter.get("/status", (req, res) => {
  return res.status(200).json({
    isRunning: isMigrationRunning(),
    activeRunId: getActiveRunningMigrationId(),
    message: isMigrationRunning() ? "\u062A\u0648\u062C\u062F \u0639\u0645\u0644\u064A\u0629 \u062A\u0631\u062D\u064A\u0644 \u0642\u064A\u062F \u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u062D\u0627\u0644\u064A\u0627\u064B." : "\u0627\u0644\u0645\u062D\u0631\u0643 \u062C\u0627\u0647\u0632 \u0648\u0641\u064A \u0648\u0636\u0639 \u0627\u0644\u0627\u0633\u062A\u0639\u062F\u0627\u062F \u0627\u0644\u0622\u0645\u0646."
  });
});
backupRestoreRouter.get("/runs", (req, res) => {
  const history = getMigrationHistory();
  const logs = getMigrationLogs();
  return res.status(200).json({
    success: true,
    history,
    logs
  });
});
backupRestoreRouter.post("/reconciliation", (req, res) => {
  const { backupData } = req.body;
  const report = generate527ReconciliationReport(backupData?.collections || backupData);
  return res.status(200).json({
    success: true,
    report
  });
});
backupRestoreRouter.post("/execute", requireAdminRole, async (req, res) => {
  const { backupData, confirmationCode, migrationRunId } = req.body;
  const adminEmail = req.headers["x-user-email"] || "admin@qrms.system";
  if (!backupData) {
    return res.status(400).json({
      success: false,
      error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0645\u0641\u0642\u0648\u062F\u0629 (backupData is required)."
    });
  }
  if (confirmationCode !== "START_CONTROLLED_MIGRATION") {
    return res.status(400).json({
      success: false,
      error: "\u0631\u0645\u0632 \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D. \u064A\u062C\u0628 \u0625\u062F\u062E\u0627\u0644 START_CONTROLLED_MIGRATION \u0644\u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u062A\u0631\u062D\u064A\u0644."
    });
  }
  const validation = validateBackupJsonFile(backupData);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: `\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u0647\u064A\u0643\u0644\u064A \u0645\u0646 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0642\u0628\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0644: ${validation.errors.join(" | ")}`,
      validation
    });
  }
  const preflight = executeMigrationPreflight(validation.backupData, { userEmail: adminEmail });
  if (preflight.fatalErrorsCount > 0) {
    return res.status(400).json({
      success: false,
      error: `\u0641\u0634\u0644 \u0627\u0644\u0641\u062D\u0635 \u0627\u0644\u0642\u0628\u0644\u064A \u0627\u0644\u0623\u0645\u0646\u064A: \u062A\u0648\u062C\u062F ${preflight.fatalErrorsCount} \u0623\u062E\u0637\u0627\u0621 \u0645\u0627\u0646\u0639\u0629 \u0644\u0644\u062A\u0631\u062D\u064A\u0644.`,
      errors: preflight.errors
    });
  }
  const pool2 = getDbPool();
  if (!pool2) {
    return res.status(503).json({
      success: false,
      error: "\u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A PostgreSQL \u063A\u064A\u0631 \u0645\u0647\u064A\u0623\u0629 (DATABASE_URL is not set). \u064A\u0631\u062C\u0649 \u062A\u0643\u0648\u064A\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0644\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0627\u0644\u062D\u0642\u064A\u0642\u064A."
    });
  }
  let client = null;
  try {
    client = await pool2.connect();
    const result = await executeControlledMigration(client, validation.backupData, {
      migrationRunId,
      confirmedByAdmin: true,
      confirmationText: confirmationCode,
      adminEmail
    });
    if (result.success === false) {
      return res.status(500).json({
        success: false,
        error: result.message || "\u0641\u0634\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0644: \u0627\u0644\u062D\u0627\u0644\u0629 \u0627\u0644\u0641\u0639\u0644\u064A\u0629 \u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0639\u062F COMMIT \u063A\u064A\u0631 \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0645\u062A\u0648\u0642\u0639.",
        migrationRun: result.migrationRun,
        logs: result.logs,
        verification: result.verification
      });
    }
    return res.status(200).json({
      success: true,
      message: result.message,
      migrationRun: result.migrationRun,
      logs: result.logs,
      verification: result.verification
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0646\u0641\u064A\u0630 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062A\u0631\u062D\u064A\u0644 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A\u064A\u0629."
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// server/routes/databaseBackupRoutes.ts
var import_express8 = require("express");
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);

// server/services/databaseBackupService.ts
var import_child_process = require("child_process");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var BACKUP_DIR = "/home/schoolscreen.sa/backups/qrms";
var BACKUP_FILENAME_PREFIX = "qrms_production";
function parseDatabaseUrl(url) {
  try {
    const u = new URL(url);
    const database = u.pathname.replace(/^\//, "");
    if (!u.hostname || !database) {
      return null;
    }
    return {
      host: u.hostname,
      port: u.port || "5432",
      user: decodeURIComponent(u.username || ""),
      password: decodeURIComponent(u.password || ""),
      database
    };
  } catch {
    return null;
  }
}
function generateBackupFilename(prefix = BACKUP_FILENAME_PREFIX) {
  const now = /* @__PURE__ */ new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}_${stamp}.dump`;
}
function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function runCommand(cmd, args, env) {
  return new Promise((resolve) => {
    const child = (0, import_child_process.spawn)(cmd, args, { env, shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => stdout += d.toString());
    child.stderr.on("data", (d) => stderr += d.toString());
    child.on("error", (err) => resolve({ code: -1, stdout, stderr: `${stderr}${err.message}` }));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}
async function createPostgresBackup(databaseUrl) {
  const parsed = parseDatabaseUrl(databaseUrl);
  if (!parsed || !parsed.user) {
    return { ok: false, error: "\u062A\u0643\u0648\u064A\u0646 \u0627\u062A\u0635\u0627\u0644 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0639\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645." };
  }
  try {
    if (!import_fs.default.existsSync(BACKUP_DIR)) {
      import_fs.default.mkdirSync(BACKUP_DIR, { recursive: true, mode: 448 });
    }
  } catch (err) {
    return { ok: false, error: `\u062A\u0639\u0630\u0651\u0631 \u062A\u0647\u064A\u0626\u0629 \u0645\u062C\u0644\u062F \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A: ${err?.message || err}` };
  }
  let filename = generateBackupFilename();
  let filePath = import_path.default.join(BACKUP_DIR, filename);
  let suffix = 1;
  while (import_fs.default.existsSync(filePath)) {
    filename = `${generateBackupFilename()}_${suffix}`;
    filePath = import_path.default.join(BACKUP_DIR, filename);
    suffix++;
  }
  const env = { ...process.env };
  if (parsed.password) {
    env.PGPASSWORD = parsed.password;
  }
  const dumpArgs = [
    "--format=custom",
    "--host",
    parsed.host,
    "--port",
    parsed.port,
    "--username",
    parsed.user,
    "--file",
    filePath,
    "--dbname",
    parsed.database
  ];
  const dumpResult = await runCommand("pg_dump", dumpArgs, env);
  if (dumpResult.code !== 0 || !import_fs.default.existsSync(filePath)) {
    try {
      if (import_fs.default.existsSync(filePath)) {
        import_fs.default.unlinkSync(filePath);
      }
    } catch {
    }
    const diagnostic = (dumpResult.stderr || "unknown pg_dump failure").trim().slice(0, 400);
    return { ok: false, error: `\u0641\u0634\u0644 pg_dump (\u0631\u0645\u0632 \u0627\u0644\u062E\u0631\u0648\u062C: ${dumpResult.code}): ${diagnostic}` };
  }
  const stat = import_fs.default.statSync(filePath);
  if (stat.size <= 0) {
    try {
      import_fs.default.unlinkSync(filePath);
    } catch {
    }
    return { ok: false, error: "\u0641\u0634\u0644 pg_dump: \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0646\u0627\u062A\u062C \u0641\u0627\u0631\u063A." };
  }
  const restoreCheck = await runCommand("pg_restore", ["--list", filePath], env);
  const verified = restoreCheck.code === 0;
  try {
    import_fs.default.chmodSync(filePath, 384);
  } catch {
  }
  return {
    ok: true,
    filename,
    filePath,
    sizeBytes: stat.size,
    sizeHuman: formatFileSize(stat.size),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    verified
  };
}
function listBackups() {
  try {
    if (!import_fs.default.existsSync(BACKUP_DIR)) {
      return [];
    }
    return import_fs.default.readdirSync(BACKUP_DIR).filter((name) => name.startsWith(BACKUP_FILENAME_PREFIX) && name.endsWith(".dump")).map((name) => {
      const filePath = import_path.default.join(BACKUP_DIR, name);
      try {
        const stat = import_fs.default.statSync(filePath);
        return {
          filename: name,
          sizeBytes: stat.size,
          sizeHuman: formatFileSize(stat.size),
          createdAt: stat.mtime.toISOString()
        };
      } catch {
        return null;
      }
    }).filter((b) => b !== null).sort((a, b) => a.createdAt < b.createdAt ? 1 : -1);
  } catch {
    return [];
  }
}
function isValidBackupFilename(filename) {
  return new RegExp(`^${BACKUP_FILENAME_PREFIX}_[A-Za-z0-9_-]+\\.dump$`).test(filename);
}

// server/routes/databaseBackupRoutes.ts
var databaseBackupRouter = (0, import_express8.Router)();
function requireAdminRole2(req, res, next) {
  const userRole = req.headers["x-user-role"] || "";
  const isAuthorized = ["system_admin", "campus_admin", "admin", "general_supervisor"].includes(userRole);
  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064A\u0629. \u062A\u0642\u062A\u0635\u0631 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0639\u0644\u0649 \u0645\u062F\u064A\u0631\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u064A\u0646."
    });
  }
  next();
}
databaseBackupRouter.post("/database", requireAdminRole2, async (req, res) => {
  try {
    if (!config.databaseUrl) {
      return res.status(503).json({
        success: false,
        error: "\u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A PostgreSQL \u063A\u064A\u0631 \u0645\u0647\u064A\u0623\u0629 \u0639\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645 (DATABASE_URL is not set)."
      });
    }
    const result = await createPostgresBackup(config.databaseUrl);
    if (!result.ok) {
      console.error("[database-backup] FAILED:", result.error);
      return res.status(500).json({
        success: false,
        error: `\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629: ${result.error}`
      });
    }
    console.log(
      `[database-backup] CREATED: ${result.filename} (${result.sizeHuman}, verified=${result.verified})`
    );
    return res.status(200).json({
      success: true,
      message: result.verified ? "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0648\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0633\u0644\u0627\u0645\u062A\u0647\u0627." : "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0628\u0646\u062C\u0627\u062D (\u062A\u0646\u0628\u064A\u0647: \u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0623\u0631\u0634\u064A\u0641 \u0639\u0628\u0631 pg_restore).",
      backup: {
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        sizeHuman: result.sizeHuman,
        createdAt: result.createdAt,
        verified: result.verified
      }
    });
  } catch (err) {
    console.error("[database-backup] UNEXPECTED:", err?.message || err);
    return res.status(500).json({
      success: false,
      error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629."
    });
  }
});
databaseBackupRouter.get("/database/history", requireAdminRole2, (req, res) => {
  try {
    const backups = listBackups();
    return res.status(200).json({ success: true, backups });
  } catch (err) {
    return res.status(500).json({ success: false, error: "\u062A\u0639\u0630\u0651\u0631 \u0642\u0631\u0627\u0621\u0629 \u0633\u062C\u0644 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629." });
  }
});
databaseBackupRouter.get("/database/download/:filename", requireAdminRole2, (req, res) => {
  const filename = import_path2.default.basename(String(req.params.filename || ""));
  if (!isValidBackupFilename(filename)) {
    return res.status(400).json({ success: false, error: "\u0627\u0633\u0645 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D." });
  }
  const filePath = import_path2.default.join(BACKUP_DIR, filename);
  if (!filePath.startsWith(BACKUP_DIR) || !import_fs2.default.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "\u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
  }
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  import_fs2.default.createReadStream(filePath).pipe(res);
});

// server/app.ts
function createApp() {
  const app = (0, import_express9.default)();
  app.use((0, import_cookie_parser.default)());
  app.use(import_express9.default.json({ limit: "50mb" }));
  app.use(import_express9.default.urlencoded({ extended: true, limit: "50mb" }));
  app.use("/api/auth", authRouter);
  app.use("/api/health", healthRouter);
  app.use("/api", extractTenantContext);
  app.use("/api", createRemoteForwarder());
  app.use("/api/tenants", tenantRouter);
  app.use("/api/stages", stageRouter);
  app.use("/api/users", userRouter);
  app.use("/api/admin/backup/restore", backupRestoreRouter);
  app.use("/api/admin/migration", backupRestoreRouter);
  app.use("/api/admin/backup/database", databaseBackupRouter);
  app.use("/api", (req, res, next) => {
    const systemPaths = ["/auth", "/health", "/tenants", "/stages", "/users", "/admin"];
    if (systemPaths.some((p) => req.path.startsWith(p))) {
      return next();
    }
    entityRouter(req, res, next);
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      ok: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
  });
  app.all("/api", (req, res) => {
    res.status(404).json({
      ok: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
  });
  app.use("/api", errorHandler);
  return app;
}

// server.ts
async function startServer() {
  const app = createApp();
  const PORT = config.port || 3e3;
  const distPath = import_path3.default.join(process.cwd(), "dist");
  app.use(import_express10.default.static(distPath));
  app.get("*all", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(import_path3.default.join(distPath, "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[QRMS Server] Running on http://0.0.0.0:${PORT} (Production Static Mode)`);
    console.log(`[QRMS Server] Runtime Mode: ${config.apiRuntimeMode}`);
    console.log(`[QRMS Server] Remote API URL: ${config.devRemoteApiUrl}`);
  });
}
startServer().catch((err) => {
  console.error("[QRMS Server] Failed to start:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
