export const environment = {
  production: true,
  apiBaseUrl: '/api',
  livePollMs: 8000,
  appKind: 'admin' as 'customer' | 'admin',
  adminBaseUrl: '/admin/',
  /** Set true when backend DATA_SOURCE=SPORTSCORE (free-tier terms require visible attribution) */
  sportScoreAttribution: false,
};
