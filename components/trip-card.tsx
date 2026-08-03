import { ArrowRight, CalendarDays, Clock3, MapPin, Plane, UserRound } from "lucide-react";
import Link from "next/link";
import { formatTripPeriod, formatTripPrice, publicStatusLabels, type Trip } from "../lib/trips";

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <article className="trip-card catalog-trip-card">
      <Link className="trip-card-link" href={`/caravanas/${trip.slug}`} aria-label={`Ver detalhes de ${trip.name}`}>
        <div className="trip-img" style={{ backgroundImage: `linear-gradient(180deg,transparent 48%,rgba(5,23,19,.7)),url(${trip.coverImage})` }}>
          <span className={`status public-${trip.publicStatus}`}>{publicStatusLabels[trip.publicStatus]}</span>
          <span className="trip-place">{trip.primaryDestination}</span>
        </div>
        <div className="trip-body">
          <p>{trip.countries.join(" · ")}</p>
          <h2>{trip.name}</h2>
          <div className="trip-meta trip-meta-grid">
            <span><CalendarDays /> {formatTripPeriod(trip)}</span>
            <span><Clock3 /> {trip.days} dias</span>
            <span><Plane /> Embarque: {trip.departureCity}</span>
            {trip.leader ? <span><UserRound /> {trip.leader}</span> : null}
            {typeof trip.remainingSeats === "number" ? <span><MapPin /> {trip.remainingSeats} vagas restantes</span> : null}
          </div>
          {trip.differentiator ? <p className="trip-differential">{trip.differentiator}</p> : null}
          <strong className="trip-price">{formatTripPrice(trip)}</strong>
          <span className="trip-discover">Ver detalhes <ArrowRight /></span>
        </div>
      </Link>
      <Link className="trip-interest" href={`/caravanas/${trip.slug}#solicitacao`}>Tenho interesse</Link>
    </article>
  );
}
