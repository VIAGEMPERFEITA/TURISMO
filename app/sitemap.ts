import type { MetadataRoute } from "next";
import { destinations } from "../lib/destinations";
import { publishedTrips } from "../lib/trips";
import { siteConfig } from "../lib/site-config";
import { blogArticles, blogCategories } from "../lib/blog";
export const dynamic="force-static";
const routes=["","/caravanas","/destinos","/quem-somos","/historias","/depoimentos","/caravanas-realizadas","/contato","/viagens-personalizadas","/lideres-de-caravanas","/documentacao","/perguntas-frequentes","/blog","/politica-de-privacidade","/termos-de-uso","/politica-de-cookies"];
export default function sitemap():MetadataRoute.Sitemap{return [...routes.map((route,index)=>({url:`${siteConfig.officialUrl}${route}`,lastModified:new Date(),changeFrequency:(index===0?"weekly":"monthly") as "weekly"|"monthly",priority:index===0?1:.7})),...destinations.map(d=>({url:`${siteConfig.officialUrl}/destinos/${d.slug}`,lastModified:new Date(),changeFrequency:"monthly" as const,priority:.7})),...blogArticles.map(a=>({url:`${siteConfig.officialUrl}/blog/${a.slug}`,lastModified:new Date(),changeFrequency:"monthly" as const,priority:.65})),...blogCategories.map(c=>({url:`${siteConfig.officialUrl}/blog/categoria/${c.slug}`,lastModified:new Date(),changeFrequency:"monthly" as const,priority:.5})),...publishedTrips.map(t=>({url:`${siteConfig.officialUrl}/caravanas/${t.slug}`,lastModified:new Date(),changeFrequency:"weekly" as const,priority:.8}))]}
