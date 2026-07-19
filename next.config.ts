import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite build paralelo ao `next dev` sem corromper `.next` compartilhado.
  // Uso: `$env:GNF_DIST_DIR=".next-build"; npm run build`
  distDir: process.env.GNF_DIST_DIR || ".next",
};

export default nextConfig;
