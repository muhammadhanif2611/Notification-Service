import path from "path";
import { fileURLToPath } from "url";

// Root workspace = folder tempat next.config.mjs berada (folder frontend/)
const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Fix Turbopack salah infer workspace root pada monorepo (lokal & Docker)
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
