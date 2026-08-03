import Link from "next/link";

export default function LegacyTripPage() {
  return (
    <main className="missing-trip">
      <meta httpEquiv="refresh" content="0;url=../israel-2027/" />
      <h1>Esta caravana mudou de endereço</h1>
      <Link href="/caravanas/israel-2027">Abrir a página da caravana</Link>
    </main>
  );
}
