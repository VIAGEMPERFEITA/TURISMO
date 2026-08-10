import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BASE_PATH: isGitHubPages ? "/TURISMO" : "" },
  async redirects() {
    return [
      { source: "/sobre-nós", destination: "/quem-somos", permanent: true },
      { source: "/vídeos", destination: "/depoimentos", permanent: true },
      { source: "/egito-israel-set-23", destination: "/caravanas-realizadas", permanent: true },
      { source: "/turquia-grecia-2027", destination: "/caravanas/turquia-grecia-2028", permanent: true },
      { source: "/caravanas/turquia-grecia-2027", destination: "/caravanas/turquia-grecia-2028", permanent: true },
    ];
  },
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
