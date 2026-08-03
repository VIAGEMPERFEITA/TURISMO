/** Rotas históricas mantidas somente para redirecionar links antigos ao catálogo. */
export type PlanningExperience={slug:string;title:string;destination:string;countries:string[];image:string;description:string;type:"internacional"|"personalizada"};
export const planningExperiences=["israel","israel-roma","egito-israel","israel-jordania","egito-israel-jordania","turquia-grecia","italia-israel","europa-biblica","viagem-personalizada"].map(slug=>({slug}));
