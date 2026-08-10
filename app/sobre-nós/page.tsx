import { permanentRedirect } from "next/navigation";

export default function LegacyAboutPage() {
  permanentRedirect("/quem-somos");
}
