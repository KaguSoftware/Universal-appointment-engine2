import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // iyzipay loads its resource modules via dynamic require() at runtime, which
  // bundlers can't statically analyze. Keep it external so Node resolves it.
  serverExternalPackages: ["iyzipay"],
};

export default nextConfig;
