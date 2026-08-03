import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots { return { rules:{userAgent:"*",allow:"/",disallow:["/admin/","/preview/"]}, sitemap:"https://www.viagemperfeitaturismo.com.br/sitemap.xml" }; }
