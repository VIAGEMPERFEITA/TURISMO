import type { MetadataRoute } from "next";
import { destinations } from "../lib/destinations";
import { planningExperiences } from "../lib/experiences";
import { publishedTrips } from "../lib/trips";
import { siteConfig } from "../lib/site-config";
export const dynamic="force-static";
const routes=["","/caravanas","/destinos","/quem-somos","/historias","/caravanas-realizadas","/contato","/viagens-personalizadas","/lideres-de-caravanas","/documentacao","/perguntas-frequentes","/politica-de-privacidade","/termos-de-uso","/politica-de-cookies"];
export default function sitemap():MetadataRoute.Sitemap{return [...routes.map((route,index)=>({url:`${siteConfig.officialUrl}${route}`,lastModified:new Date(),changeFrequency:(index===0?"weekly":"monthly") as "weekly"|"monthly",priority:index===0?1:.7})),...destinations.map(d=>({url:`${siteConfig.officialUrl}/destinos/${d.slug}`,lastModified:new Date(),changeFrequency:"monthly" as const,priority:.7})),...planningExperiences.map(e=>({url:`${siteConfig.officialUrl}/experiencias/${e.slug}`,lastModified:new Date(),changeFrequency:"monthly" as const,priority:.6})),...publishedTrips.map(t=>({url:`${siteConfig.officialUrl}/caravanas/${t.slug}`,lastModified:new Date(),changeFrequency:"weekly" as const,priority:.8}))]}
