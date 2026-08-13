/**
 * @fileoverview Frontend Route Constants
 */

export const ROUTES = Object.freeze({
  HOME: "/",
  LOGIN: "/login",
  CLIENT: {
    OVERVIEW: "/client",
    RIWAYAT: "/client/riwayat",
    STATISTIK: "/client/statistik",
    API_KEYS: "/client/api-keys",
    WEBHOOK: "/client/webhook",
  },
  ADMIN: {
    CONTROL_CENTER: "/admin/control-center",
    MONITORING: "/admin/monitoring",
    VENDORS: "/admin/vendors",
    CREDENTIALS: "/admin/credentials",
    DOMAIN_MTA: "/admin/domain-mta",
    USERS: "/admin/users",
    SUPPRESSION_LIST: "/admin/suppression-list",
    THRESHOLD_ALERT: "/admin/threshold-alert",
  },
});
