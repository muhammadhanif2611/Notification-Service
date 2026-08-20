/**
 * @fileoverview Frontend Route Constants
 */

export const ROUTES = Object.freeze({
  HOME: "/",
  LOGIN: "/login",
  CLIENT: {
    OVERVIEW: "/client",
    PROJECTS: "/client/projects",
    RIWAYAT: "/client/riwayat",
    STATISTIK: "/client/statistik",
    API_KEYS: "/client/api-keys",
    TEMPLATES: "/client/templates",
    BROADCAST: "/client/broadcast",
    SDK: "/client/sdk",
    WEBHOOK: "/client/webhook",
  },
  ADMIN: {
    CONTROL_CENTER: "/admin/control-center",
    MONITORING: "/admin/monitoring",
    VENDORS: "/admin/vendors",
    WA_SESSION: "/admin/wa-session",
    CREDENTIALS: "/admin/credentials",
    DOMAIN_MTA: "/admin/domain-mta",
    USERS: "/admin/users",
    SUPPRESSION_LIST: "/admin/suppression-list",
    THRESHOLD_ALERT: "/admin/threshold-alert",
  },
});
