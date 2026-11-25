import path from "path";
import { fileURLToPath } from "url";

// Folder tempat next.config.mjs berada (folder frontend/)
const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
// Root monorepo: `next` terpasang (hoisted) di <root>/node_modules, bukan di frontend/node_modules
const monorepoRoot = path.resolve(frontendRoot, "..");

const isDev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["nodemailer"],
  // Dev (Turbopack): root harus mencakup node_modules hasil hoisting di root monorepo.
  // Build/Docker tetap memakai folder frontend agar struktur output standalone tidak berubah.
  turbopack: {
    root: isDev ? monorepoRoot : frontendRoot,
  },
};

export default nextConfig;
