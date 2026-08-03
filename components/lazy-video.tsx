"use client";
import { Play } from "lucide-react";
import { useState } from "react";
export function LazyVideo({src,poster,label}:{src:string;poster:string;label:string}){const[active,setActive]=useState(false);return active?<video controls autoPlay playsInline preload="metadata" poster={poster} aria-label={label}><source src={src} type="video/mp4"/><p>Não foi possível reproduzir. <a href={src}>Abra o vídeo diretamente</a>.</p></video>:<button className="video-poster" type="button" onClick={()=>setActive(true)} style={{backgroundImage:`linear-gradient(rgba(4,25,20,.12),rgba(4,25,20,.32)),url(${poster})`}} aria-label={`Assistir: ${label}`}><span><Play fill="currentColor"/>Assistir</span></button>}
