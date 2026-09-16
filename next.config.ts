import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  experimental: { serverActions: { bodySizeLimit: "32kb" } },
  webpack(config, { isServer }) {
    config.output.environment = { ...config.output.environment, asyncFunction: true };
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, net: false, tls: false };
    if (!isServer) config.resolve.alias["isomorphic-ws"] = path.resolve("src/lib/midnight/browser-websocket.ts");
    return config;
  },
};
export default nextConfig;
