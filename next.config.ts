import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't infer a parent directory
  // when stray lockfiles exist higher up the tree.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
