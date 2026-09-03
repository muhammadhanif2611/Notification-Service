/**
 * @fileoverview Navigation Menu Items
 * Sesuai DESIGN.md Section 6B — Platform Admin (7 halaman)
 */

import { ROUTES } from "./routes";

export const CLIENT_MENU_ITEMS = [
  { label: "Dashboard", href: ROUTES.CLIENT.OVERVIEW, icon: "LayoutDashboard" },
  { label: "Projects", href: ROUTES.CLIENT.PROJECTS, icon: "FolderKanban" },
  { label: "Riwayat Pesan", href: ROUTES.CLIENT.RIWAYAT, icon: "Clock" },
  { label: "Statistik", href: ROUTES.CLIENT.STATISTIK, icon: "BarChart2" },
  { label: "API Key", href: ROUTES.CLIENT.API_KEYS, icon: "Key" },
  { label: "Template Pesan", href: ROUTES.CLIENT.TEMPLATES, icon: "FileText" },
  { label: "Broadcast", href: ROUTES.CLIENT.BROADCAST, icon: "Send" },
  { label: "WhatsApp Session", href: ROUTES.CLIENT.WA_SESSION, icon: "MessageSquare" },
  { label: "SDK & Integrasi", href: ROUTES.CLIENT.SDK, icon: "Code2" },
  { label: "Webhook", href: ROUTES.CLIENT.WEBHOOK, icon: "Webhook" },
];

export const ADMIN_MENU_ITEMS = [
  { label: "Control Center", href: ROUTES.ADMIN.CONTROL_CENTER, icon: "LayoutDashboard" },
  { label: "Queue Telemetry", href: ROUTES.ADMIN.MONITORING, icon: "Activity" },
  { label: "Vendors & Kredensial", href: ROUTES.ADMIN.VENDORS, icon: "Server" },
  { label: "WhatsApp Session", href: ROUTES.ADMIN.WA_SESSION, icon: "MessageSquare" },
  { label: "Domain & MTA", href: ROUTES.ADMIN.DOMAIN_MTA, icon: "Mail" },
  { label: "Kelola Pengguna", href: ROUTES.ADMIN.USERS, icon: "Users" },
  { label: "Suppression List", href: ROUTES.ADMIN.SUPPRESSION_LIST, icon: "UserX" },
  { label: "Threshold Alert", href: ROUTES.ADMIN.THRESHOLD_ALERT, icon: "AlertTriangle" },
];
