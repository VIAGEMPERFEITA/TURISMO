import { Camera, ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";

const videos = [
  { id: "DUlbDAglTVC", title: "Memórias de uma jornada especial", description: "Encontros e experiências vividas em grupo com a Viagem Perfeita." },
  { id: "DNgArH1uAjP", title: "Fé que atravessa fronteiras", description: "Registros reais de uma caravana preparada com propósito e cuidado." },
  { id: "DH1oUvsR7J_", title: "Caminhos que transformam", description: "Momentos marcantes compartilhados por nossos viajantes." },
  { id: "DCFYAfkRavA", title: "Uma experiência para recordar", description: "Cultura, espiritualidade e convivência em cada etapa da viagem." },
  { id: "DCARXV-xcHW", title: "Histórias vividas de perto", description: "A emoção das caravanas realizadas pela Viagem Perfeita." },
];

export function RealJourneysGallery({ preview = false }: { preview?: boolean }) {
  const visibleVideos = preview ? videos.slice(0, 2) : videos;
  return (
    <section className="section real-journeys" aria-labelledby="real-journeys-title">
      <div className="shell">
        <div className="section-head real-journeys-head">
          <div><p className="eyebrow"><Camera size={15}/> Caravanas realizadas</p><h2 id="real-journeys-title">Não contamos apenas destinos.<br/><em>Mostramos experiências reais.</em></h2></div>
          <p className="side-copy">Vídeos publicados no Instagram oficial com registros das caravanas realizadas pela Viagem Perfeita Turismo.</p>
        </div>
        <div className={`journey-video-grid${preview ? " preview" : ""}`}>
          {visibleVideos.map((item) => <article className="journey-video instagram-reel-card" key={item.id}>
            <div className="instagram-reel-frame"><iframe src={`https://www.instagram.com/reel/${item.id}/embed/`} title={`${item.title}: vídeo de caravana realizada pela Viagem Perfeita`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen /></div>
            <div><span><MapPin/> Caravana realizada</span><h3>{item.title}</h3><p>{item.description}</p><a className="reel-external-link" href={`https://www.instagram.com/reel/${item.id}/`} target="_blank" rel="noopener noreferrer">Abrir no Instagram <ExternalLink/></a></div>
          </article>)}
        </div>
        {preview ? <Link className="journey-all-link" href="/caravanas-realizadas">Ver todas as experiências</Link> : null}
        <p className="journey-authenticity">Conteúdo publicado no perfil oficial da Viagem Perfeita Turismo. Caso o Instagram bloqueie a reprodução incorporada, use “Abrir no Instagram”.</p>
      </div>
    </section>
  );
}
