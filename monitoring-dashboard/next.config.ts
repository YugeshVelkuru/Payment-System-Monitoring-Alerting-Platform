import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid picking up a parent lockfile (e.g. under the user profile) as the workspace root.
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
