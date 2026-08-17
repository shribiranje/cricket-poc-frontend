/** Local `ng serve` for the admin SPA (API on backend :3000). */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  livePollMs: 5000,
  appKind: 'admin' as 'customer' | 'admin',
  adminBaseUrl: 'http://localhost:4201/admin/',
  /** Set true when backend DATA_SOURCE=SPORTSCORE (free-tier terms require visible attribution) */
  sportScoreAttribution: false,
};
