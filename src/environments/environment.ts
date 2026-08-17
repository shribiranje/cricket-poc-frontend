export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  livePollMs: 5000,
  /** customer = fantasy app; admin = admin console SPA */
  appKind: 'customer' as 'customer' | 'admin',
  /** Fallback; local dual-port / ng serve rewritten by resolveAdminBaseUrl() */
  adminBaseUrl: 'http://localhost:4201/admin/',
  /** Set true when backend DATA_SOURCE=SPORTSCORE (free-tier terms require visible attribution) */
  sportScoreAttribution: false,
};
