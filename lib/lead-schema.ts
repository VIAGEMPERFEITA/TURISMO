import { z } from "zod";
export const leadFormSchema=z.object({
  name:z.string().trim().min(3,"Informe seu nome completo"),
  phone:z.string().trim().min(10,"Informe um WhatsApp válido"),
  email:z.string().trim().email("Informe um e-mail válido").or(z.literal("")),
  city:z.string().trim(),state:z.string().trim(),travelers:z.string(),interest:z.string(),
  desiredPeriod:z.string(),accommodation:z.string(),departureCity:z.string(),paymentPreference:z.string(),notes:z.string().max(1200),groupType:z.string(),
  consent:z.boolean().refine(Boolean,"Autorize o contato para continuar"),
});
export type LeadFormData=z.infer<typeof leadFormSchema>;
export function normalizePhone(value:string){return value.replace(/\D/g,"").replace(/^0+/,"")}
