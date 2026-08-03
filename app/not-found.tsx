import Link from "next/link";
import { Compass, Home, MessageCircle } from "lucide-react";
import { PublicFooter, PublicHeader } from "../components/public-shell";
import { WhatsAppLink } from "../components/whatsapp-link";
export default function NotFound(){return <><PublicHeader/><main className="not-found-page"><div><Compass/><p className="eyebrow">Página não encontrada</p><h1>Vamos encontrar o caminho certo.</h1><p>O endereço pode ter mudado. Continue pela página inicial, explore as caravanas disponíveis ou fale com um consultor.</p><nav><Link href="/"><Home/>Ir para o início</Link><Link href="/caravanas"><Compass/>Ver caravanas</Link><WhatsAppLink buttonText="Falar com um consultor"><MessageCircle/>Falar com um consultor</WhatsAppLink></nav></div></main><PublicFooter/></>}
