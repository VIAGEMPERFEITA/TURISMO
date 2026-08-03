export type PlanningExperience = {
  slug: string;
  title: string;
  destination: string;
  countries: string[];
  description: string;
  image: string;
  type: "religioso" | "cultural" | "personalizada" | "grupo-fechado";
  destinationSlugs: string[];
};

export const planningExperiences: PlanningExperience[] = [
  { slug: "israel", title: "Israel", destination: "Terra Santa", countries: ["Israel"], description: "Uma experiência de fé, história e cultura pelos lugares que dão contexto às Escrituras.", image: "https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=1200&q=82", type: "religioso", destinationSlugs: ["israel"] },
  { slug: "israel-roma", title: "Israel e Roma", destination: "Origens da fé cristã", countries: ["Israel", "Itália"], description: "Uma jornada em planejamento conectando a Terra Santa à história cristã em Roma.", image: "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=82", type: "religioso", destinationSlugs: ["israel", "italia"] },
  { slug: "egito-israel", title: "Egito e Israel", destination: "Caminhos bíblicos", countries: ["Egito", "Israel"], description: "História milenar e experiências espirituais em um roteiro a ser confirmado.", image: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1200&q=82", type: "religioso", destinationSlugs: ["egito", "israel"] },
  { slug: "israel-jordania", title: "Israel e Jordânia", destination: "Terra Santa e Petra", countries: ["Israel", "Jordânia"], description: "Uma proposta de viagem unindo paisagens bíblicas, cultura e patrimônio histórico.", image: "https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=1200&q=82", type: "religioso", destinationSlugs: ["israel", "jordania"] },
  { slug: "egito-israel-jordania", title: "Egito, Israel e Jordânia", destination: "Três países, uma grande história", countries: ["Egito", "Israel", "Jordânia"], description: "Experiência ampla em planejamento, sem datas ou serviços definidos neste momento.", image: "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=1200&q=82", type: "religioso", destinationSlugs: ["egito", "israel", "jordania"] },
  { slug: "turquia-grecia", title: "Turquia e Grécia", destination: "Caminhos do cristianismo primitivo", countries: ["Turquia", "Grécia"], description: "Cidades históricas e lugares ligados às primeiras comunidades cristãs.", image: "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?auto=format&fit=crop&w=1200&q=82", type: "religioso", destinationSlugs: ["turquia", "grecia"] },
  { slug: "italia-israel", title: "Itália e Israel", destination: "Arte, história e espiritualidade", countries: ["Itália", "Israel"], description: "Uma combinação em estudo para grupos que desejam aprofundar cultura e fé.", image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=82", type: "cultural", destinationSlugs: ["italia", "israel"] },
  { slug: "europa-biblica", title: "Europa bíblica", destination: "Europa", countries: ["Grécia", "Itália", "Turquia"], description: "Possibilidades de roteiros religiosos e culturais construídas conforme o perfil do grupo.", image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=82", type: "cultural", destinationSlugs: ["europa", "grecia", "italia", "turquia"] },
  { slug: "viagem-personalizada", title: "Viagem personalizada", destination: "Sob medida", countries: [], description: "Projeto exclusivo para igrejas, famílias, ministérios, empresas e grupos fechados.", image: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=82", type: "personalizada", destinationSlugs: [] },
];

export function getExperience(slug: string) { return planningExperiences.find((item) => item.slug === slug); }
