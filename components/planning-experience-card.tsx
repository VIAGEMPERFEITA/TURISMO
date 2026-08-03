import { ArrowRight, CalendarClock, Globe2 } from "lucide-react";
import Link from "next/link";
import type { PlanningExperience } from "../lib/experiences";
import { WhatsAppLink } from "./whatsapp-link";

export function PlanningExperienceCard({ experience }: { experience: PlanningExperience }) {
  return <article className="trip-card catalog-trip-card planning-card"><Link className="trip-card-link" href={`/experiencias/${experience.slug}`}><div className="trip-img" style={{backgroundImage:`linear-gradient(180deg,transparent 45%,rgba(5,23,19,.72)),url(${experience.image})`}}><span className="status public-em_breve">Em planejamento</span><span className="trip-place">{experience.destination}</span></div><div className="trip-body"><p>{experience.countries.length ? experience.countries.join(" · ") : "Roteiro sob medida"}</p><h2>{experience.title}</h2><p className="trip-differential">{experience.description}</p><div className="trip-meta trip-meta-grid"><span><CalendarClock/> Datas em definição</span><span><Globe2/> {experience.type === "personalizada" ? "Viagem personalizada" : "Experiência internacional"}</span></div><span className="trip-discover">Ver detalhes <ArrowRight/></span></div></Link><WhatsAppLink className="trip-interest" tripName={experience.title} destination={experience.destination} period="Datas em definição" buttonText="Tenho interesse" initialInterest="Receber as datas primeiro">Tenho interesse</WhatsAppLink></article>;
}
