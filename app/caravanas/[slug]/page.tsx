import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, Check, Clock3, FileText, Globe2, MapPin, MessageCircle, Minus, Plane, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { TripFaq } from "../../../components/trip-faq";
import { WhatsAppLink } from "../../../components/whatsapp-link";
import { formatTripPeriod, formatTripPrice, getPublishedTripBySlug, publicStatusLabels, publishedTrips, trips } from "../../../lib/trips";
import { UnpublishedTripRedirect } from "../../../components/unpublished-trip-redirect";
import { PublicFooter, PublicHeader } from "../../../components/public-shell";
import { TripCard } from "../../../components/trip-card";

export const dynamicParams = false;

export function generateStaticParams() {
  return trips.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const trip = getPublishedTripBySlug((await params).slug);
  if (!trip) return { title: "Caravana não encontrada | Viagem Perfeita Turismo", robots: { index: false, follow: false } };
  return { title: trip.seo.title, description: trip.seo.description, alternates:{canonical:`/caravanas/${trip.slug}`}, openGraph:{title:trip.seo.title,description:trip.seo.description,type:"website",images:[{url:trip.coverImage,alt:trip.name}]}, robots: { index: !trip.seo.noIndex, follow: !trip.seo.noIndex } };
}

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const trip = getPublishedTripBySlug((await params).slug);
  if (!trip) return <UnpublishedTripRedirect />;

  const period = formatTripPeriod(trip);
  const duration = trip.days ? `${trip.days} dias${trip.nights ? ` · ${trip.nights} noites` : ""}` : undefined;
  const contact = { tripName: trip.name, destination: trip.countries.join(" • "), period, duration, status: publicStatusLabels[trip.publicStatus] };
  const faq = trip.faq.map(({ question, answer }) => [question, answer] as [string, string]);
  const hasCompleteItinerary=Boolean(trip.days&&trip.itinerary.length===trip.days);
  const currentIndex=publishedTrips.findIndex(item=>item.id===trip.id);const previous=publishedTrips[currentIndex-1];const next=publishedTrips[currentIndex+1];
  const related=publishedTrips.filter(item=>item.id!==trip.id).sort((a,b)=>Number(b.countries.some(country=>trip.countries.includes(country)))-Number(a.countries.some(country=>trip.countries.includes(country)))||a.priority-b.priority).slice(0,4);

  return <><PublicHeader/><main className="detail">
    <section className="detail-hero">
      <div className="detail-bg" style={{ backgroundImage: `linear-gradient(90deg,rgba(5,28,24,.9),rgba(5,28,24,.15)),url(${trip.coverImage})` }} />
      <div className="shell detail-top"><Link href="/caravanas"><ArrowLeft /> Voltar às caravanas</Link><span>{publicStatusLabels[trip.publicStatus]}</span></div>
      <div className="shell detail-title"><p>{trip.countries.join(" · ")}</p><h1>{trip.name}</h1><p className="detail-tagline">{trip.shortDescription}</p><div><span><CalendarDays />{period}</span>{trip.days?<span><Clock3 />{trip.days} dias</span>:null}{trip.departureCity?<span><Plane />Saída de {trip.departureCity}</span>:null}{trip.leader ? <span><UserRound />{trip.leader}</span> : null}</div><div className="detail-hero-actions"><WhatsAppLink {...contact} buttonText="Receber valores" initialInterest="Receber valores e condições">Receber valores e condições</WhatsAppLink><WhatsAppLink {...contact} buttonText="Falar com um consultor" initialInterest="Falar com um consultor">Falar com um consultor</WhatsAppLink></div></div>
    </section>

    <div className="shell detail-layout">
      <div className="detail-main">
        <section className="detail-summary"><div><p className="eyebrow">Uma jornada de significado</p><h2>Uma experiência criada para inspirar.</h2><p>{trip.fullDescription}</p></div></section>
        <section className="detail-quick-facts">
          {trip.departureDate?<div><CalendarDays /><span>Saída</span><b>{trip.departureDate}</b></div>:null}
          {trip.returnDate?<div><CalendarDays /><span>Retorno</span><b>{trip.returnDate}</b></div>:null}
          {trip.days?<div><Clock3 /><span>Duração</span><b>{trip.days} dias{trip.nights?` · ${trip.nights} noites`:""}</b></div>:null}
          {trip.departureCity?<div><Plane /><span>Embarque</span><b>{trip.departureCity}</b></div>:null}
          {trip.hotelCategory?<div><BedDouble /><span>Hotéis</span><b>{trip.hotelCategory}</b></div>:null}
          <div><Globe2 /><span>Tipo</span><b>{trip.tripType}</b></div>
          <div><ShieldCheck/><span>Status</span><b>{publicStatusLabels[trip.publicStatus]}</b></div>
          {typeof trip.totalSeats==="number"?<div><UserRound/><span>Vagas</span><b>{trip.totalSeats}</b></div>:null}
          {trip.leader||trip.coordinator?<div><UserRound/><span>Coordenação</span><b>{trip.leader||trip.coordinator}</b></div>:null}
        </section>
      </div>
      <aside className="conversion-card"><span>{publicStatusLabels[trip.publicStatus]}</span><h2>{trip.name}</h2><dl><div><dt>Período</dt><dd>{period}</dd></div>{trip.days?<div><dt>Duração</dt><dd>{trip.days} dias</dd></div>:null}{trip.departureCity?<div><dt>Embarque</dt><dd>{trip.departureCity}</dd></div>:null}</dl><strong>{formatTripPrice(trip)}</strong><WhatsAppLink {...contact} buttonText="Receber valores e condições" initialInterest="Receber valores e condições">Receber valores e condições</WhatsAppLink><WhatsAppLink {...contact} buttonText="Solicitar roteiro" initialInterest="Receber roteiro">Solicitar roteiro</WhatsAppLink><WhatsAppLink {...contact} buttonText="Falar com um consultor" initialInterest="Falar com um consultor">Falar com um consultor</WhatsAppLink></aside>
    </div>

    <section className="trip-facts"><div className="shell"><div><MapPin /><span>Destino principal</span><b>{trip.primaryDestination}</b></div><div><Globe2 /><span>Países</span><b>{trip.countries.join(", ")}</b></div><div><CalendarDays /><span>Período</span><b>{period}</b></div></div></section>

    <section className="section itinerary shell"><div><p className="eyebrow">{hasCompleteItinerary?"Roteiro completo":"Resumo do roteiro"}</p><h2>{hasCompleteItinerary?<>Cada dia,<br />uma nova descoberta.</>:<>Uma visão clara<br/>das principais etapas.</>}</h2><p>{hasCompleteItinerary?"Confira os dias cadastrados para esta caravana.":"As etapas abaixo são um resumo. Solicite a programação oficial completa para conhecer todos os dias."}</p></div>{trip.itinerary.length?<ol>{trip.itinerary.map((day) => <li key={day.day}><span>{String(day.day).padStart(2, "0")}</span><div><small>{day.city ? `${hasCompleteItinerary?"Dia":"Etapa"} ${day.day} · ${day.city}` : `${hasCompleteItinerary?"Dia":"Etapa"} ${day.day}`}</small><h3>{day.title}</h3>{day.description ? <p>{day.description}</p> : null}{day.hotel ? <p><b>Hospedagem:</b> {day.hotel}</p> : null}{day.meals?.length ? <p><b>Refeições:</b> {day.meals.join(", ")}</p> : null}{day.activities?.length ? <p><b>Lugares e atividades:</b> {day.activities.join(", ")}</p> : null}{day.transportation ? <p><b>Deslocamento:</b> {day.transportation}</p> : null}{day.notes ? <p><b>Observações:</b> {day.notes}</p> : null}</div></li>)}</ol>:<div className="itinerary-request"><FileText/><h3>Solicite o roteiro detalhado.</h3><p>A equipe apresentará a versão oficial disponível para esta saída.</p><WhatsAppLink {...contact} buttonText="Solicitar roteiro" initialInterest="Receber roteiro">Solicitar roteiro</WhatsAppLink></div>}</section>

    <section className="included"><div className="shell"><p className="eyebrow light">Informações da caravana</p><h2>O pacote inclui</h2>{trip.included.length?<div className="included-grid">{trip.included.map((item) => <span key={item}><Check />{item}</span>)}</div>:<p className="package-consult">Solicite a proposta oficial para consultar os serviços confirmados nesta saída.</p>}{trip.notIncluded.length?<><h3 className="not-included-title">O pacote não inclui</h3><div className="not-included-grid">{trip.notIncluded.map((item) => <span key={item}><Minus />{item}</span>)}</div></>:null}{trip.documentation.length ? <><h3 className="not-included-title">Documentação</h3><div className="not-included-grid">{trip.documentation.map((item) => <span key={item}><FileText />{item}</span>)}</div></> : null}</div></section>

    {trip.gallery.length ? <section className="section trip-gallery"><div className="shell"><p className="eyebrow">Galeria</p><h2>Uma prévia da jornada.</h2><div className="gallery-grid">{trip.gallery.map((image, index) => <div key={image} style={{ backgroundImage: `url(${image})` }} role="img" aria-label={`${trip.primaryDestination}, imagem ${index + 1}`} />)}</div></div></section> : null}

    {faq.length ? <section className="section trip-faq-section"><div className="shell faq-grid"><div><p className="eyebrow">Antes de embarcar</p><h2>Informação com transparência.</h2><p>Consulte as respostas específicas desta caravana.</p></div><TripFaq items={faq} /></div></section> : null}

    <section className="reserve section" id="solicitacao"><div className="shell"><p className="eyebrow">Monte sua solicitação</p><h2>Receba informações oficiais<br />sobre esta caravana.</h2><p>Informe suas preferências antes de continuar para o atendimento.</p><WhatsAppLink {...contact} buttonText="Receber valores e condições" initialInterest="Receber valores e condições">Receber valores e condições <MessageCircle /></WhatsAppLink><small><ShieldCheck /> Seus dados são utilizados somente para o atendimento solicitado.</small></div></section>

    <section className="section other-trips"><div className="shell"><p className="eyebrow">Outras caravanas</p><h2>Continue explorando.</h2><div className="catalog-grid">{related.map(item=><TripCard trip={item} key={item.id}/>)}</div><nav aria-label="Navegação entre caravanas"><span>{previous?<Link href={`/caravanas/${previous.slug}`}><ArrowLeft/> Caravana anterior</Link>:null}</span><Link href="/caravanas">Voltar ao catálogo</Link><span>{next?<Link href={`/caravanas/${next.slug}`}>Próxima caravana <ArrowRight/></Link>:null}</span></nav></div></section>

    <div className="mobile-conversion-bar"><WhatsAppLink {...contact} buttonText="Receber valores e condições" initialInterest="Receber valores e condições">Receber valores e condições</WhatsAppLink><WhatsAppLink {...contact} buttonText="Falar com um consultor" initialInterest="Falar com um consultor">Falar com um consultor</WhatsAppLink></div>
  </main><PublicFooter/></>;
}
