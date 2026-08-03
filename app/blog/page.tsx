import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,BookOpen} from "lucide-react";
import {PageHero} from "../../components/page-hero";
import {PublicPage} from "../../components/public-shell";
import {blogArticles,blogCategories,getCategory} from "../../lib/blog";
export const metadata:Metadata={title:"Blog de turismo religioso e viagens | Viagem Perfeita",description:"Guias responsáveis sobre Israel, turismo religioso, passaporte, documentação, segurança e preparação de viagens.",alternates:{canonical:"/blog"}};
export default function Page(){return <PublicPage><PageHero eyebrow="Conteúdo" title="Informação para viajar melhor." description="Guias claros para planejar jornadas internacionais com mais confiança, contexto e responsabilidade."/><section className="section"><div className="shell"><div className="blog-categories">{blogCategories.map(category=><Link href={`/blog/categoria/${category.slug}`} key={category.slug}>{category.name}</Link>)}</div><div className="blog-grid">{blogArticles.map(article=><article key={article.slug}><BookOpen/><small>{getCategory(article.category)?.name} · {article.readingTime}</small><h2>{article.title}</h2><p>{article.excerpt}</p><Link href={`/blog/${article.slug}`}>Ler artigo <ArrowRight/></Link></article>)}</div></div></section></PublicPage>}
