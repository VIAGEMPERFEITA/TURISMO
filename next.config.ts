import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BASE_PATH: isGitHubPages ? "/TURISMO" : "" },
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath: "/TURISMO",
        trailingSlash: true,
        images: { unoptimized: true },
        typescript: { tsconfigPath: "tsconfig.github.json" },
      }
    : {}),
};

export default nextConfig;
