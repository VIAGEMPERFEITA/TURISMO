"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Trip, TripCategory, TripPublicStatus } from "../lib/trips";
import { TripCard } from "./trip-card";

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

type SortKey = "nearest" | "recent" | "longest" | "shortest" | "name" | "featured";

const initialFilters = {
  search: "", year: "", month: "", destination: "", country: "", duration: "",
  departure: "", category: "", status: "", seats: false,
};

export function TripsCatalog({ trips }: { trips: Trip[] }) {
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState<SortKey>("nearest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const next = { ...initialFilters };
    next.search = params.get("search") ?? "";
    next.year = params.get("year") ?? "";
    next.month = params.get("month") ?? "";
    next.destination = params.get("destination") ?? "";
    next.country = params.get("country") ?? "";
    next.duration = params.get("duration") ?? "";
    next.departure = params.get("departure") ?? "";
    next.category = params.get("category") ?? "";
    next.status = params.get("status") ?? "";
    next.seats = params.get("seats") === "1";
    setFilters(next);const requestedSort=params.get("sort") as SortKey|null;if(requestedSort)setSort(requestedSort);
  },[]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);Object.entries(filters).forEach(([key,value])=>value?params.set(key,value===true?"1":String(value)):params.delete(key));
    sort!=="nearest"?params.set("sort",sort):params.delete("sort");const query=params.toString();window.history.replaceState(null,"",`${window.location.pathname}${query?`?${query}`:""}${window.location.hash}`);
  },[filters,sort]);

  const options = useMemo(() => ({
    years: [...new Set(trips.map((trip) => trip.year).filter(Boolean))].sort(),
    months: [...new Set(trips.map((trip) => trip.month).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
    destinations: [...new Set(trips.map((trip) => trip.primaryDestination))].sort(),
    countries: [...new Set(trips.flatMap((trip) => trip.countries))].sort(),
    departures: [...new Set(trips.flatMap((trip) => trip.departureCity ? [trip.departureCity] : []))].sort(),
    statuses: [...new Set(trips.map((trip) => trip.publicStatus))],
  }), [trips]);

  const results = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLocaleLowerCase("pt-BR");
    return trips.filter((trip) => {
      const haystack = [trip.name, trip.subtitle, trip.primaryDestination, ...trip.countries, ...trip.cities].join(" ").toLocaleLowerCase("pt-BR");
      const durationMatches = !filters.duration || (typeof trip.days === "number" && (
        (filters.duration === "short" && trip.days <= 8) ||
        (filters.duration === "medium" && trip.days >= 9 && trip.days <= 13) ||
        (filters.duration === "long" && trip.days >= 14)));
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
      if (a.priority !== b.priority && (a.priority <= 2 || b.priority <= 2)) return a.priority - b.priority;
      const dateA = new Date(a.departureDate ?? `${a.year ?? 9999}-${String(a.month ?? 12).padStart(2, "0")}-01`).getTime();
      const dateB = new Date(b.departureDate ?? `${b.year ?? 9999}-${String(b.month ?? 12).padStart(2, "0")}-01`).getTime();
      if (sort === "recent") return dateB - dateA;
      if (sort === "longest") return (b.days??0) - (a.days??0);
      if (sort === "shortest") return (a.days??999) - (b.days??999);
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
      <label className="catalog-search" htmlFor="catalog-search"><span>Buscar caravana</span><div><Search /><input id="catalog-search" name="search" value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="Nome, destino ou cidade" /></div></label>
      <label htmlFor="catalog-year"><span>Ano</span><select id="catalog-year" name="year" value={filters.year} onChange={(event) => update("year", event.target.value)}><option value="">Todos</option>{options.years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
      <label htmlFor="catalog-month"><span>Mês</span><select id="catalog-month" name="month" value={filters.month} onChange={(event) => update("month", event.target.value)}><option value="">Todos</option>{options.months.map((month) => <option key={month} value={month}>{monthNames[Number(month) - 1]}</option>)}</select></label>
      <label htmlFor="catalog-destination"><span>Destino</span><select id="catalog-destination" name="destination" value={filters.destination} onChange={(event) => update("destination", event.target.value)}><option value="">Todos</option>{options.destinations.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label htmlFor="catalog-country"><span>País</span><select id="catalog-country" name="country" value={filters.country} onChange={(event) => update("country", event.target.value)}><option value="">Todos</option>{options.countries.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label htmlFor="catalog-duration"><span>Duração</span><select id="catalog-duration" name="duration" value={filters.duration} onChange={(event) => update("duration", event.target.value)}><option value="">Todas</option><option value="short">Até 8 dias</option><option value="medium">9 a 13 dias</option><option value="long">14 dias ou mais</option></select></label>
      <label htmlFor="catalog-departure"><span>Embarque</span><select id="catalog-departure" name="departure" value={filters.departure} onChange={(event) => update("departure", event.target.value)}><option value="">Todos</option>{options.departures.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label htmlFor="catalog-category"><span>Tipo de viagem</span><select id="catalog-category" name="category" value={filters.category} onChange={(event) => update("category", event.target.value)}><option value="">Todos</option><option value={"religioso" satisfies TripCategory}>Turismo religioso</option><option value={"cultural" satisfies TripCategory}>Turismo cultural</option><option value={"personalizado" satisfies TripCategory}>Viagem personalizada</option></select></label>
      {options.statuses.length > 1 ? <label htmlFor="catalog-status"><span>Status</span><select id="catalog-status" name="status" value={filters.status} onChange={(event) => update("status", event.target.value)}><option value="">Todos</option><option value={"disponivel" satisfies TripPublicStatus}>Disponível</option><option value={"ultimas_vagas" satisfies TripPublicStatus}>Últimas vagas</option><option value={"esgotada" satisfies TripPublicStatus}>Esgotada</option><option value={"encerrada" satisfies TripPublicStatus}>Encerrada</option></select></label> : null}
      <label className="catalog-checkbox"><input name="seats" type="checkbox" checked={filters.seats} onChange={(event) => update("seats", event.target.checked)} /><span>Somente com vagas disponíveis</span></label>
    </div>
  );

  return (
    <div className="catalog-browser">
      {trips.length >= 4 ? <section className={`catalog-single-filters${filtersOpen ? " open" : ""}`} aria-label="Filtros do catálogo"><button className="catalog-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="catalog-filter-fields" onClick={()=>setFiltersOpen(current=>!current)}><SlidersHorizontal/> Filtros</button><div id="catalog-filter-fields">{filterFields}</div></section> : null}
      <div className="catalog-toolbar"><p aria-live="polite"><strong>{results.length}</strong> {results.length === 1 ? "caravana encontrada" : "caravanas encontradas"}</p><div><label htmlFor="catalog-sort">Ordenar por</label><select id="catalog-sort" name="sort" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}><option value="nearest">Próximas saídas</option><option value="recent">Mais recentes</option><option value="longest">Maior duração</option><option value="shortest">Menor duração</option><option value="name">Nome</option><option value="featured">Destaque</option></select><button type="button" onClick={() => {setFilters(initialFilters);setSort("nearest")}}><X /> Limpar filtros</button></div></div>
      {results.length === 0 ? <div className="catalog-empty"><span>VP</span><h2>Nenhuma caravana corresponde aos filtros.</h2><p>Limpe os filtros ou escolha outras opções para visualizar as saídas disponíveis.</p></div> : Object.entries(grouped).map(([year, months]) => <section className="catalog-year" key={year}><h2>{year}</h2>{Object.entries(months).map(([month, monthTrips]) => <div className="catalog-month" key={month}><h3>{month}</h3><div className="catalog-grid">{monthTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}</div></div>)}</section>)}
    </div>
  );
}
