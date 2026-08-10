"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function TripFaq({ items }: { items: Array<[string, string]> }) {
  const [open, setOpen] = useState(0);
  return <div>{items.map(([question, answer], index)=>{const expanded=open===index;const panelId=`faq-panel-${index}`;return <div className="faq-item" key={question}><button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={()=>setOpen(expanded?-1:index)}><span>{question}</span><ChevronDown aria-hidden="true" className={expanded?"rotate":""}/></button><p id={panelId} role="region" aria-label={question} hidden={!expanded}>{answer}</p></div>})}</div>;
}
