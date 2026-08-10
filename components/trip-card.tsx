import { ArrowRight, CalendarDays, Clock3, MapPin, Plane, UserRound } from "lucide-react";
import Link from "next/link";
import { formatTripPeriod, formatTripPrice, publicStatusLabels, type Trip } from "../lib/trips";
import { WhatsAppLink } from "./whatsapp-link";

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <article className="trip-card catalog-trip-card">
      <Link className="trip-card-link" href={`/caravanas/${trip.slug}`}>
        <div className="trip-img">
          <img className="trip-cover" src={trip.coverImage} alt="" loading="lazy" decoding="async" />
          <span className={`status public-${trip.publicStatus}`}>{publicStatusLabels[trip.publicStatus]}</span>
          {trip.priority <= 2 ? <span className="priority-badge">Próxima saída</span> : null}
          <span className="trip-place">{trip.primaryDestination}</span>
        </div>
        <div className="trip-body">
          <p>{trip.countries.join(" · ")}</p>
          <h2>{trip.name}</h2>
          <div className="trip-meta trip-meta-grid">
            <span><CalendarDays /> {formatTripPeriod(trip)}</span>
            {trip.days ? <span><Clock3 /> {trip.days} dias</span> : null}
            {trip.departureCity ? <span><Plane /> Embarque: {trip.departureCity}</span> : null}
            {trip.leader ? <span><UserRound /> {trip.leader}</span> : null}
            {typeof trip.remainingSeats === "number" ? <span><MapPin /> {trip.remainingSeats} vagas restantes</span> : null}
          </div>
          <p className="trip-differential">{trip.shortDescription}</p>
          <strong className="trip-price">{formatTripPrice(trip)}</strong>
          <span className="trip-discover">Ver detalhes <ArrowRight /></span>
        </div>
      </Link>
      <WhatsAppLink className="trip-interest" tripName={trip.name} destination={trip.countries.join(" • ")} period={formatTripPeriod(trip)} duration={trip.days ? `${trip.days} dias${trip.nights ? ` · ${trip.nights} noites` : ""}` : undefined} status={publicStatusLabels[trip.publicStatus]} buttonText="Receber valores" initialInterest="Receber valores e condições">Receber valores e condições</WhatsAppLink>
    </article>
  );
}
