/**
 * @fileoverview Frontend Route Constants
 */

export const ROUTES = Object.freeze({
  HOME: "/",
  DASHBOARD: {
    RIWAYAT: "/riwayat",
    STATISTIK: "/statistik",
    API_KEYS: "/api-keys",
    WEBHOOK: "/webhook",
  },
  ADMIN: {
    MONITORING: "/admin/monitoring",
    VENDORS: "/admin/vendors",
    CREDENTIALS: "/admin/credentials",
    DOMAIN_MTA: "/admin/domain-mta",
    SUPPRESSION_LIST: "/admin/suppression-list",
    THRESHOLD_ALERT: "/admin/threshold-alert",
  },
});
