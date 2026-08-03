import { ArrowLeft, CalendarDays, Check, Clock3, MapPin, MessageCircle, Minus, Plane, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { WhatsAppLink } from "../../../components/whatsapp-link";
import { TripFaq } from "../../../components/trip-faq";
import { getTripBySlug, trips } from "../../../lib/trips";

export function generateStaticParams() { return trips.map(({slug})=>({slug})); }

export default async function TripPage({ params }: { params: Promise<{slug:string}> }) {
  const { slug } = await params;
  const trip = getTripBySlug(slug);
  if (!trip) return <main className="missing-trip"><h1>Caravana não encontrada</h1><Link href="/caravanas">Voltar ao catálogo</Link></main>;
  const contact = { tripName: trip.title, destination: trip.destination, period: trip.period };
  return <main className="detail"><section className="detail-hero"><div className="detail-bg" style={{backgroundImage:`linear-gradient(90deg,rgba(5,28,24,.9),rgba(5,28,24,.15)),url(${trip.image})`}}/><div className="shell detail-top"><Link href="/caravanas"><ArrowLeft/> Voltar às caravanas</Link><span>{trip.status}</span></div><div className="shell detail-title"><p>{trip.destination} · conteúdo demonstrativo</p><h1>{trip.shortTitle}</h1><div><span><CalendarDays/>{trip.period}</span><span><Clock3/>{trip.days}</span><span><Plane/>Saída de {trip.departure}</span></div></div></section>
  <section className="detail-summary shell"><div><p className="eyebrow">Uma jornada de significado</p><h2>Uma experiência criada para inspirar.</h2><p>{trip.description}</p><div className="draft-warning"><b>{trip.status}</b> Este conteúdo serve como demonstração da estrutura. Nenhuma data, valor ou disponibilidade deve ser considerada confirmada.</div></div><aside><span>Informações comerciais</span><strong>Consulte a equipe</strong><small>Receba dados oficiais e atualizados</small><WhatsAppLink {...contact} buttonText="Tenho interesse" initialInterest="Consultar valores">Tenho interesse <MessageCircle/></WhatsAppLink><p><ShieldCheck/> Atendimento seguro e sem compromisso</p></aside></section>
  <section className="trip-facts"><div className="shell"><div><MapPin/><span>Destino</span><b>{trip.destination}</b></div><div><Plane/><span>Embarque previsto</span><b>{trip.departure}</b></div><div><CalendarDays/><span>Período demonstrativo</span><b>{trip.period}</b></div></div></section>
  <section className="section itinerary shell"><div><p className="eyebrow">Roteiro dia a dia</p><h2>Cada dia,<br/>uma nova descoberta.</h2><p>Sequência demonstrativa sujeita a alterações após confirmação operacional.</p></div><ol>{trip.itinerary.map((day,index)=><li key={day}><span>{String(index+1).padStart(2,"0")}</span><div><small>Dia {index+1}</small><h3>{day}</h3><p>Visitas guiadas e acompanhamento conforme programação final da caravana.</p></div></li>)}</ol></section>
  <section className="included"><div className="shell"><p className="eyebrow light">Serviços previstos</p><h2>O que está incluído.</h2><div className="included-grid">{trip.included.map(item=><span key={item}><Check/>{item}</span>)}</div><h3 className="not-included-title">Não incluído</h3><div className="not-included-grid">{trip.notIncluded.map(item=><span key={item}><Minus/>{item}</span>)}</div></div></section>
  <section className="section trip-gallery"><div className="shell"><p className="eyebrow">Galeria</p><h2>Uma prévia da jornada.</h2><div className="gallery-grid">{trip.gallery.map((image,index)=><div key={image} style={{backgroundImage:`url(${image})`}} role="img" aria-label={`${trip.destination}, imagem ${index+1}`}/>)}</div></div></section>
  <section className="section trip-faq-section"><div className="shell faq-grid"><div><p className="eyebrow">Antes de embarcar</p><h2>Informação com transparência.</h2><p>Os detalhes oficiais serão enviados pela equipe após a validação comercial.</p></div><TripFaq items={trip.faq}/></div></section>
  <section className="reserve section"><div className="shell"><p className="eyebrow">Quer saber mais?</p><h2>Receba informações oficiais<br/>sobre esta caravana.</h2><WhatsAppLink {...contact} buttonText="Receber roteiro completo" initialInterest="Receber roteiro">Receber roteiro completo <MessageCircle/></WhatsAppLink></div></section></main>;
}
