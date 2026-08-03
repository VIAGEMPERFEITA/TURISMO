import Link from "next/link";

export default function LegacyTripPage() {
  return (
    <main className="missing-trip">
      <meta httpEquiv="refresh" content="0;url=../" />
      <h1>Esta página não está mais disponível</h1>
      <Link href="/caravanas">Consultar caravanas publicadas</Link>
    </main>
  );
}
