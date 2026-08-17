export const environment = {
  production: true,
  apiBaseUrl: '/api',
  livePollMs: 8000,
  appKind: 'customer' as 'customer' | 'admin',
  /** Same-origin under host nginx; dual-port local compose rewritten at runtime */
  adminBaseUrl: '/admin/',
  /** Set true when backend DATA_SOURCE=SPORTSCORE (free-tier terms require visible attribution) */
  sportScoreAttribution: false,
};
