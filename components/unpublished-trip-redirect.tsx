"use client";
import Link from "next/link";
import { useEffect } from "react";
export function UnpublishedTripRedirect(){const basePath=process.env.NEXT_PUBLIC_BASE_PATH??"";useEffect(()=>{window.location.replace(`${basePath}/caravanas/`)},[basePath]);return <main className="missing-trip"><meta name="robots" content="noindex,nofollow"/><div><h1>Esta caravana não está publicada.</h1><p>Você será direcionado ao catálogo de experiências.</p><Link href="/caravanas">Ir para caravanas</Link></div></main>}
