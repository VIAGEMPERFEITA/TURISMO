import type { Metadata } from "next";
import { TravelerSecureForm } from "../../components/traveler-secure-form";

export const metadata: Metadata = {
  title: "Cadastro seguro | Viagem Perfeita Turismo",
  robots: { index: false, follow: false },
};

export default function SecureFormPage() {
  return <TravelerSecureForm/>;
}

