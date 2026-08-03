import { Camera, MapPin } from "lucide-react";
import Link from "next/link";
import { LazyVideo } from "./lazy-video";

const videos = [
  { id: "jerusalem", title: "Caminhos de Jerusalém", description: "Ruas, história e fé vividas de perto por nossos grupos.", video: "jerusalem-experiencia.mp4", poster: "jerusalem-experiencia.jpg", vertical: true },
  { id: "oliveiras", title: "Monte das Oliveiras", description: "Uma vista que conecta a Cidade Santa às histórias bíblicas.", video: "monte-das-oliveiras.mp4", poster: "monte-das-oliveiras.jpg", vertical: false },
  { id: "bastidores", title: "Cuidado antes do embarque", description: "Organização e preparação da Viagem Perfeita para cada jornada.", video: "viagem-perfeita-bastidores.mp4", poster: "viagem-perfeita-bastidores.jpg", vertical: true },
];

export function RealJourneysGallery({ preview = false }: { preview?: boolean }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <section className="section real-journeys" aria-labelledby="real-journeys-title">
      <div className="shell">
        <div className="section-head real-journeys-head">
          <div><p className="eyebrow"><Camera size={15}/> Caravanas realizadas</p><h2 id="real-journeys-title">Não contamos apenas destinos.<br/><em>Mostramos experiências reais.</em></h2></div>
          <p className="side-copy">Registros produzidos durante viagens e atividades da própria Viagem Perfeita Turismo.</p>
        </div>
        <div className={`journey-video-grid${preview ? " preview" : ""}`}>
          {(preview ? videos.slice(0, 2) : videos).map((item) => <article className={item.vertical ? "journey-video vertical" : "journey-video"} key={item.id}>
            <LazyVideo src={`${basePath}/media/israel/${item.video}`} poster={`${basePath}/media/israel/${item.poster}`} label={`${item.title}: vídeo de caravana realizada pela Viagem Perfeita`}/>
            <div><span><MapPin/> Israel</span><h3>{item.title}</h3><p>{item.description}</p></div>
          </article>)}
        </div>
        {preview ? <Link className="journey-all-link" href="/caravanas-realizadas">Ver todas as experiências</Link> : null}
        <p className="journey-authenticity">Conteúdo real fornecido pela Viagem Perfeita Turismo. Os vídeos são carregados somente quando você escolhe assistir.</p>
      </div>
    </section>
  );
}
