import { MessageCircle } from "lucide-react";
import { LazyVideo } from "./lazy-video";

const videos = Array.from({ length: 5 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: `depoimento-${number}`,
    title: `Depoimento de viajante · ${number}`,
    video: `depoimento-${number}.m4v`,
    poster: `depoimento-${number}.jpg`,
  };
});

export function VideoDepoimentos() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return <section className="video-depoimentos" aria-labelledby="video-depoimentos-title">
    <div className="journey-subheading testimonial-video-heading">
      <p className="eyebrow"><MessageCircle size={15}/> Quem viajou, conta</p>
      <h2 id="video-depoimentos-title">Histórias contadas<br/><em>por quem viveu.</em></h2>
      <p className="side-copy">Cinco depoimentos em vídeo enviados à Viagem Perfeita Turismo.</p>
    </div>
    <div className="journey-video-grid journey-video-grid-testimonials">
      {videos.map((item) => <article className="journey-video testimonial-video vertical" key={item.id}>
        <LazyVideo src={`${basePath}/media/depoimentos/${item.video}`} poster={`${basePath}/media/depoimentos/${item.poster}`} label={`${item.title}: relato em vídeo sobre a Viagem Perfeita`} orientation="vertical" />
        <div><span><MessageCircle/> Depoimento real</span><h3>{item.title}</h3><p>Relato compartilhado com a Viagem Perfeita Turismo.</p><a className="video-direct-link" href={`${basePath}/media/depoimentos/${item.video}`}>Abrir vídeo</a></div>
      </article>)}
    </div>
  </section>;
}
