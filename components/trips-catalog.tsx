"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Trip, TripCategory, TripPublicStatus } from "../lib/trips";
import { TripCard } from "./trip-card";
import type { PlanningExperience } from "../lib/experiences";
import { PlanningExperienceCard } from "./planning-experience-card";

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

type SortKey = "nearest" | "farthest" | "duration" | "name" | "featured";

const initialFilters = {
  search: "", year: "", month: "", destination: "", country: "", duration: "",
  departure: "", category: "", status: "", seats: false,
};

export function TripsCatalog({ trips, planning = [] }: { trips: Trip[]; planning?: PlanningExperience[] }) {
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState<SortKey>("nearest");

  const options = useMemo(() => ({
    years: [...new Set(trips.map((trip) => trip.year).filter(Boolean))].sort(),
    months: [...new Set(trips.map((trip) => trip.month).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
    destinations: [...new Set(trips.map((trip) => trip.primaryDestination))].sort(),
    countries: [...new Set(trips.flatMap((trip) => trip.countries))].sort(),
    departures: [...new Set(trips.map((trip) => trip.departureCity))].sort(),
  }), [trips]);

  const results = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLocaleLowerCase("pt-BR");
    return trips.filter((trip) => {
      const haystack = [trip.name, trip.subtitle, trip.primaryDestination, ...trip.countries, ...trip.cities].join(" ").toLocaleLowerCase("pt-BR");
      const durationMatches = !filters.duration ||
        (filters.duration === "short" && trip.days <= 8) ||
        (filters.duration === "medium" && trip.days >= 9 && trip.days <= 13) ||
        (filters.duration === "long" && trip.days >= 14);
      return (!normalizedSearch || haystack.includes(normalizedSearch)) &&
        (!filters.year || String(trip.year ?? "") === filters.year) &&
        (!filters.month || String(trip.month ?? "") === filters.month) &&
        (!filters.destination || trip.primaryDestination === filters.destination) &&
        (!filters.country || trip.countries.includes(filters.country)) &&
        durationMatches &&
        (!filters.departure || trip.departureCity === filters.departure) &&
        (!filters.category || trip.category === filters.category) &&
        (!filters.status || trip.publicStatus === filters.status) &&
        (!filters.seats || (typeof trip.remainingSeats === "number" && trip.remainingSeats > 0));
    }).sort((a, b) => {
      const dateA = new Date(a.departureDate ?? `${a.year ?? 9999}-${String(a.month ?? 12).padStart(2, "0")}-01`).getTime();
      const dateB = new Date(b.departureDate ?? `${b.year ?? 9999}-${String(b.month ?? 12).padStart(2, "0")}-01`).getTime();
      if (sort === "farthest") return dateB - dateA;
      if (sort === "duration") return a.days - b.days;
      if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "featured") return Number(b.featured) - Number(a.featured) || dateA - dateB;
      return dateA - dateB;
    });
  }, [filters, sort, trips]);

  const grouped = useMemo(() => {
    return results.reduce<Record<string, Record<string, Trip[]>>>((groups, trip) => {
      const year = trip.year ? String(trip.year) : "Data a confirmar";
      const month = trip.month ? monthNames[trip.month - 1] : "Sem mês definido";
      groups[year] ??= {};
      groups[year][month] ??= [];
      groups[year][month].push(trip);
      return groups;
    }, {});
  }, [results]);

  function update<K extends keyof typeof initialFilters>(key: K, value: (typeof initialFilters)[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const filterFields = (
    <div className="catalog-filter-grid">
      <label className="catalog-search"><span>Buscar caravana</span><div><Search /><input value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="Nome, destino ou cidade" /></div></label>
      <label><span>Ano</span><select value={filters.year} onChange={(event) => update("year", event.target.value)}><option value="">Todos</option>{options.years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
      <label><span>Mês</span><select value={filters.month} onChange={(event) => update("month", event.target.value)}><option value="">Todos</option>{options.months.map((month) => <option key={month} value={month}>{monthNames[Number(month) - 1]}</option>)}</select></label>
      <label><span>Destino</span><select value={filters.destination} onChange={(event) => update("destination", event.target.value)}><option value="">Todos</option>{options.destinations.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>País</span><select value={filters.country} onChange={(event) => update("country", event.target.value)}><option value="">Todos</option>{options.countries.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>Duração</span><select value={filters.duration} onChange={(event) => update("duration", event.target.value)}><option value="">Todas</option><option value="short">Até 8 dias</option><option value="medium">9 a 13 dias</option><option value="long">14 dias ou mais</option></select></label>
      <label><span>Embarque</span><select value={filters.departure} onChange={(event) => update("departure", event.target.value)}><option value="">Todos</option>{options.departures.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>Tipo de viagem</span><select value={filters.category} onChange={(event) => update("category", event.target.value)}><option value="">Todos</option><option value={"religioso" satisfies TripCategory}>Turismo religioso</option><option value={"cultural" satisfies TripCategory}>Turismo cultural</option><option value={"personalizado" satisfies TripCategory}>Viagem personalizada</option></select></label>
      <label><span>Status</span><select value={filters.status} onChange={(event) => update("status", event.target.value)}><option value="">Todos</option><option value={"inscricoes_abertas" satisfies TripPublicStatus}>Inscrições abertas</option><option value={"ultimas_vagas" satisfies TripPublicStatus}>Últimas vagas</option><option value={"em_breve" satisfies TripPublicStatus}>Em breve</option><option value={"lista_de_espera" satisfies TripPublicStatus}>Lista de espera</option></select></label>
      <label className="catalog-checkbox"><input type="checkbox" checked={filters.seats} onChange={(event) => update("seats", event.target.checked)} /><span>Somente com vagas disponíveis</span></label>
    </div>
  );

  return (
    <div className="catalog-browser">
      <details className="catalog-mobile-filters"><summary><SlidersHorizontal /> Filtros</summary>{filterFields}</details>
      {trips.length >= 4 ? <div className="catalog-desktop-filters">{filterFields}</div> : null}
      <div className="catalog-toolbar"><p><strong>{results.length}</strong> {results.length === 1 ? "caravana encontrada" : "caravanas encontradas"}</p><div><label htmlFor="catalog-sort">Ordenar por</label><select id="catalog-sort" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}><option value="nearest">Saída mais próxima</option><option value="farthest">Saída mais distante</option><option value="duration">Duração</option><option value="name">Nome</option><option value="featured">Destaque</option></select><button type="button" onClick={() => setFilters(initialFilters)}><X /> Limpar filtros</button></div></div>
      {results.length === 0 ? <div className="catalog-empty"><span>VP</span><h2>Nenhuma caravana confirmada no momento.</h2><p>Datas, serviços e disponibilidade aparecerão aqui somente após validação oficial.</p></div> : Object.entries(grouped).map(([year, months]) => <section className="catalog-year" key={year}><h2>{year}</h2>{Object.entries(months).map(([month, monthTrips]) => <div className="catalog-month" key={month}><h3>{month}</h3><div className="catalog-grid">{monthTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}</div></div>)}</section>)}
      {planning.length ? <section className="planning-catalog"><div className="planning-heading"><p className="eyebrow">Experiências em planejamento</p><h2>Cadastre seu interesse.</h2><p>Receba as datas primeiro. Nenhuma opção abaixo possui período, preço ou disponibilidade confirmados.</p></div><div className="catalog-grid">{planning.map((item)=><PlanningExperienceCard key={item.slug} experience={item}/>)}</div></section> : null}
    </div>
  );
}
