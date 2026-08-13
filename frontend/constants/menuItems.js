/**
 * @fileoverview Navigation Menu Items
 * Sesuai DESIGN.md Section 6B — Platform Admin (7 halaman)
 */

import { ROUTES } from "./routes";

export const CLIENT_MENU_ITEMS = [
  { label: "Dashboard", href: ROUTES.DASHBOARD.OVERVIEW, icon: "LayoutDashboard" },
  { label: "Riwayat Pesan", href: ROUTES.DASHBOARD.RIWAYAT, icon: "Clock" },
  { label: "Statistik", href: ROUTES.DASHBOARD.STATISTIK, icon: "BarChart2" },
  { label: "API Key", href: ROUTES.DASHBOARD.API_KEYS, icon: "Key" },
  { label: "Webhook", href: ROUTES.DASHBOARD.WEBHOOK, icon: "Webhook" },
];

export const ADMIN_MENU_ITEMS = [
  { label: "Control Center", href: ROUTES.ADMIN.CONTROL_CENTER, icon: "LayoutDashboard" },
  { label: "Queue Telemetry", href: ROUTES.ADMIN.MONITORING, icon: "Activity" },
  { label: "Vendors", href: ROUTES.ADMIN.VENDORS, icon: "Server" },
  { label: "Kredensial", href: ROUTES.ADMIN.CREDENTIALS, icon: "Shield" },
  { label: "Domain & MTA", href: ROUTES.ADMIN.DOMAIN_MTA, icon: "Mail" },
  { label: "Kelola Pengguna", href: ROUTES.ADMIN.USERS, icon: "Users" },
  { label: "Suppression List", href: ROUTES.ADMIN.SUPPRESSION_LIST, icon: "UserX" },
  { label: "Threshold Alert", href: ROUTES.ADMIN.THRESHOLD_ALERT, icon: "AlertTriangle" },
];
