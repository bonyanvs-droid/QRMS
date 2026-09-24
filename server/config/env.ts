import dotenv from 'dotenv';

dotenv.config();

export type ApiRuntimeMode = 'local-db' | 'remote-proxy';

export const config = {
  get port(): number {
    return parseInt(process.env.PORT || '3000', 10);
  },
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  },
  get databaseUrl(): string {
    return process.env.DATABASE_URL || '';
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
  // Explicit API Runtime Mode:
  // - 'local-db': Direct connection to PostgreSQL database (used on VPS / local backend with DATABASE_URL)
  // - 'remote-proxy': Forwards /api/* requests to remote HTTPS API with server-side Basic Auth (used in AI Studio sandbox)
  get apiRuntimeMode(): ApiRuntimeMode {
    return (process.env.API_RUNTIME_MODE as ApiRuntimeMode) || (process.env.DATABASE_URL ? 'local-db' : 'remote-proxy');
  },
  get devRemoteApiUrl(): string {
    return process.env.DEV_REMOTE_API_URL || 'https://qrms-dev.schoolscreen.sa/api';
  },
  get devApiBasicAuth(): string {
    return process.env.DEV_API_BASIC_AUTH || '';
  },
  get devApiUsername(): string {
    return process.env.DEV_API_USERNAME || '';
  },
  get devApiPassword(): string {
    return process.env.DEV_API_PASSWORD || '';
  },
};

