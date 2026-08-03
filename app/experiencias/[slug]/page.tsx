import type {Metadata} from "next";
import {planningExperiences} from "../../../lib/experiences";
import {UnpublishedTripRedirect} from "../../../components/unpublished-trip-redirect";
export const dynamicParams=false;
export function generateStaticParams(){return planningExperiences.map(({slug})=>({slug}))}
export const metadata:Metadata={title:"Catálogo de caravanas | Viagem Perfeita Turismo",robots:{index:false,follow:false}};
export default function Page(){return <UnpublishedTripRedirect/>}
