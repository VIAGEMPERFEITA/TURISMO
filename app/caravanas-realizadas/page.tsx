import type { Metadata } from "next";
import { PageHero } from "../../components/page-hero";
import { PublicPage } from "../../components/public-shell";
import { RealJourneysGallery } from "../../components/real-journeys-gallery";
import { WhatsAppLink } from "../../components/whatsapp-link";
export const metadata:Metadata={title:"Caravanas realizadas | Viagem Perfeita Turismo",description:"Veja registros reais de experiências realizadas pela Viagem Perfeita Turismo.",alternates:{canonical:"/caravanas-realizadas"}};
export default function Page(){return <PublicPage><PageHero eyebrow="Experiências reais" title="Caravanas que deixaram histórias." description="Vídeos e registros fornecidos pela própria Viagem Perfeita Turismo."/><RealJourneysGallery/><section className="reserve section"><div className="shell"><p className="eyebrow">Próximas experiências</p><h2>Quer viver uma jornada semelhante?</h2><WhatsAppLink tripName="Viagem semelhante às caravanas realizadas" initialInterest="Receber informações" buttonText="Receber informações">Receber informações</WhatsAppLink></div></section></PublicPage>}
