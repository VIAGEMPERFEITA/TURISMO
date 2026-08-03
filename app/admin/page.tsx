"use client";
import { useEffect } from "react";
export default function Page(){const base=process.env.NEXT_PUBLIC_BASE_PATH??"";useEffect(()=>{window.location.replace(`${base}/admin/login/`)},[base]);return <main className="admin-entry"><meta name="robots" content="noindex,nofollow"/><p>Redirecionando para o acesso administrativo…</p></main>}
