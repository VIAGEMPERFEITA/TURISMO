import { permanentRedirect } from "next/navigation";

export default function LegacyVideosPage() {
  permanentRedirect("/depoimentos");
}
