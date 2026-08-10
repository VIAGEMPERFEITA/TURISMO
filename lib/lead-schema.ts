import { z } from "zod";
export const leadFormSchema=z.object({
  name:z.string().trim().min(3,"Informe seu nome completo"),
  phone:z.string().trim().refine(value=>{const digits=normalizePhone(value);return digits.length===10||digits.length===11||digits.length===12||digits.length===13},"Informe um WhatsApp válido com DDD"),
  email:z.string().trim().email("Informe um e-mail válido").or(z.literal("")),
  city:z.string().trim(),state:z.string().trim(),travelers:z.string(),interest:z.string().trim().min(1,"Selecione o destino de interesse"),
  desiredPeriod:z.string(),accommodation:z.string(),departureCity:z.string(),paymentPreference:z.string(),notes:z.string().max(1200),groupType:z.string(),
  consent:z.boolean().refine(Boolean,"Autorize o contato para continuar"),
});
export type LeadFormData=z.infer<typeof leadFormSchema>;
export function normalizePhone(value:string){return value.replace(/\D/g,"").replace(/^0+/,"")}
export function formatBrazilianPhone(value:string){
  const digits=normalizePhone(value).replace(/^55(?=\d{10,11}$)/,"").slice(0,11);
  if(digits.length<=2)return digits;
  if(digits.length<=6)return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if(digits.length<=10)return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}
