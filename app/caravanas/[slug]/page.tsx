import type { Metadata } from "next";
import { ArrowLeft, BedDouble, CalendarDays, Check, Clock3, FileText, Globe2, MapPin, MessageCircle, Minus, Plane, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { TripFaq } from "../../../components/trip-faq";
import { WhatsAppLink } from "../../../components/whatsapp-link";
import { formatTripPeriod, formatTripPrice, getPublishedTripBySlug, publicStatusLabels, trips } from "../../../lib/trips";
import { UnpublishedTripRedirect } from "../../../components/unpublished-trip-redirect";

export const dynamicParams = false;

export function generateStaticParams() {
  return trips.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const trip = getPublishedTripBySlug((await params).slug);
  if (!trip) return { title: "Caravana não encontrada | Viagem Perfeita Turismo", robots: { index: false, follow: false } };
  return { title: trip.seo.title, description: trip.seo.description, robots: { index: !trip.seo.noIndex, follow: !trip.seo.noIndex } };
}

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const trip = getPublishedTripBySlug((await params).slug);
  if (!trip) return <UnpublishedTripRedirect />;

  const period = formatTripPeriod(trip);
  const contact = { tripName: trip.name, destination: trip.primaryDestination, period };
  const faq = trip.faq.map(({ question, answer }) => [question, answer] as [string, string]);

  return <main className="detail">
    <section className="detail-hero">
      <div className="detail-bg" style={{ backgroundImage: `linear-gradient(90deg,rgba(5,28,24,.9),rgba(5,28,24,.15)),url(${trip.coverImage})` }} />
      <div className="shell detail-top"><Link href="/caravanas"><ArrowLeft /> Voltar às caravanas</Link><span>{publicStatusLabels[trip.publicStatus]}</span></div>
      <div className="shell detail-title"><p>{trip.countries.join(" · ")}</p><h1>{trip.subtitle}</h1><p className="detail-tagline">{trip.shortDescription}</p><div><span><CalendarDays />{period}</span><span><Clock3 />{trip.days} dias</span><span><Plane />Saída de {trip.departureCity}</span>{trip.leader ? <span><UserRound />{trip.leader}</span> : null}</div></div>
    </section>

    <div className="shell detail-layout">
      <div className="detail-main">
        <section className="detail-summary"><div><p className="eyebrow">Uma jornada de significado</p><h2>Uma experiência criada para inspirar.</h2><p>{trip.fullDescription}</p></div></section>
        <section className="detail-quick-facts">
          <div><CalendarDays /><span>Saída</span><b>{trip.departureDate ?? "A confirmar"}</b></div>
          <div><CalendarDays /><span>Retorno</span><b>{trip.returnDate ?? "A confirmar"}</b></div>
          <div><Clock3 /><span>Duração</span><b>{trip.days} dias · {trip.nights} noites</b></div>
          <div><Plane /><span>Embarque</span><b>{trip.departureCity}</b></div>
          <div><BedDouble /><span>Acomodação</span><b>{trip.hotelCategory ?? "A confirmar"}</b></div>
          <div><Globe2 /><span>Tipo</span><b>{trip.tripType}</b></div>
        </section>
      </div>
      <aside className="conversion-card"><span>{publicStatusLabels[trip.publicStatus]}</span><h2>{trip.name}</h2><dl><div><dt>Período</dt><dd>{period}</dd></div><div><dt>Duração</dt><dd>{trip.days} dias</dd></div><div><dt>Embarque</dt><dd>{trip.departureCity}</dd></div></dl><strong>{formatTripPrice(trip)}</strong><Link href="#solicitacao">Quero participar</Link><WhatsAppLink {...contact} buttonText="Falar com consultor">Falar com consultor <MessageCircle /></WhatsAppLink></aside>
    </div>

    <section className="trip-facts"><div className="shell"><div><MapPin /><span>Destino principal</span><b>{trip.primaryDestination}</b></div><div><Globe2 /><span>Países</span><b>{trip.countries.join(", ")}</b></div><div><CalendarDays /><span>Período</span><b>{period}</b></div></div></section>

    <section className="section itinerary shell"><div><p className="eyebrow">Roteiro dia a dia</p><h2>Cada dia,<br />uma nova descoberta.</h2><p>Informações específicas conforme o roteiro oficial desta caravana.</p></div><ol>{trip.itinerary.map((day) => <li key={day.day}><span>{String(day.day).padStart(2, "0")}</span><div><small>{day.city ? `Dia ${day.day} · ${day.city}` : `Dia ${day.day}`}</small><h3>{day.title}</h3>{day.description ? <p>{day.description}</p> : null}{day.hotel ? <p><b>Hospedagem:</b> {day.hotel}</p> : null}{day.meals?.length ? <p><b>Refeições:</b> {day.meals.join(", ")}</p> : null}{day.activities?.length ? <p><b>Atividades:</b> {day.activities.join(", ")}</p> : null}{day.transportation ? <p><b>Deslocamento:</b> {day.transportation}</p> : null}{day.notes ? <p><b>Observações:</b> {day.notes}</p> : null}</div></li>)}</ol></section>

    <section className="included"><div className="shell"><p className="eyebrow light">Serviços confirmados</p><h2>O que está incluído.</h2><div className="included-grid">{trip.included.map((item) => <span key={item}><Check />{item}</span>)}</div><h3 className="not-included-title">Não incluído</h3><div className="not-included-grid">{trip.notIncluded.map((item) => <span key={item}><Minus />{item}</span>)}</div>{trip.documentation.length ? <><h3 className="not-included-title">Documentação</h3><div className="not-included-grid">{trip.documentation.map((item) => <span key={item}><FileText />{item}</span>)}</div></> : null}</div></section>

    {trip.gallery.length ? <section className="section trip-gallery"><div className="shell"><p className="eyebrow">Galeria</p><h2>Uma prévia da jornada.</h2><div className="gallery-grid">{trip.gallery.map((image, index) => <div key={image} style={{ backgroundImage: `url(${image})` }} role="img" aria-label={`${trip.primaryDestination}, imagem ${index + 1}`} />)}</div></div></section> : null}

    {faq.length ? <section className="section trip-faq-section"><div className="shell faq-grid"><div><p className="eyebrow">Antes de embarcar</p><h2>Informação com transparência.</h2><p>Consulte as respostas específicas desta caravana.</p></div><TripFaq items={faq} /></div></section> : null}

    <section className="reserve section" id="solicitacao"><div className="shell"><p className="eyebrow">Monte sua solicitação</p><h2>Receba informações oficiais<br />sobre esta caravana.</h2><p>Informe suas preferências antes de continuar para o atendimento.</p><WhatsAppLink {...contact} buttonText="Tenho interesse" initialInterest="Consultar disponibilidade">Tenho interesse <MessageCircle /></WhatsAppLink><small><ShieldCheck /> Seus dados são utilizados somente para o atendimento solicitado.</small></div></section>

    <div className="mobile-conversion-bar"><Link href="#solicitacao">Ver opções</Link><WhatsAppLink {...contact} buttonText="WhatsApp">WhatsApp</WhatsAppLink></div>
  </main>;
}
