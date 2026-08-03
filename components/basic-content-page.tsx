import type { ReactNode } from "react";
import { PageHero } from "./page-hero";
import { PublicPage } from "./public-shell";
export function BasicContentPage({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children:ReactNode}){return <PublicPage><PageHero eyebrow={eyebrow} title={title} description={description}/><section className="section"><div className="shell prose-page">{children}</div></section></PublicPage>}
