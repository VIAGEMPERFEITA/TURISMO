"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function TripFaq({ items }: { items: Array<[string, string]> }) {
  const [open, setOpen] = useState(0);
  return <div>{items.map(([question, answer], index)=><div className="faq-item" key={question}><button onClick={()=>setOpen(open===index?-1:index)}><span>{question}</span><ChevronDown className={open===index?"rotate":""}/></button>{open===index&&<p>{answer}</p>}</div>)}</div>;
}
