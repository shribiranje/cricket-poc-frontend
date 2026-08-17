/**
 * Resolve the admin console base URL for links from the customer SPA.
 * - Same-origin host nginx / VM: `/admin/`
 * - Local dual-port compose (:8080/:8443 → :8081/:8444)
 * - Local ng serve (:4200) → admin serve on :4201
 */
export function resolveAdminBaseUrl(fallback = '/admin/'): string {
  if (typeof window === 'undefined') return fallback;
  const { hostname, port, protocol } = window.location;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return fallback;

  if (port === '8080') return `${protocol}//${hostname}:8081/admin/`;
  if (port === '8443') return `${protocol}//${hostname}:8444/admin/`;
  if (port === '4200' || port === '') return `${protocol}//${hostname}:4201/admin/`;
  return fallback;
}
