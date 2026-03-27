import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Evita fallos de "Failed to open database" cuando la caché FS de Turbopack en .next queda corrupta (Next 16.1+ la activa por defecto en dev).
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
