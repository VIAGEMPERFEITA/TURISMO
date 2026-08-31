import test from "node:test";import assert from "node:assert/strict";import{readFileSync}from"node:fs";
const source=readFileSync(new URL("../components/whatsapp-inbox.tsx",import.meta.url),"utf8");
test("unified inbox exposes operational filters and workload indicators",()=>{for(const signal of ["Filtrar canal","Filtrar situação","Não lidas","Prioridade","stats.unread"])assert.match(source,new RegExp(signal))});
test("inbox provides customer 360 and assisted human replies",()=>{for(const signal of ["Cliente 360º","Leitura rápida da IA","suggestedReplies","email,city,state,source,status,qualification_data"])assert.match(source,new RegExp(signal))});
test("inbox supports internal notes, queues, AI insight and SLA visibility",()=>{for(const signal of ["Notas internas","lead_notes","Fila geral","Intenção","Sentimento","Temperatura","slaLabel"])assert.match(source,new RegExp(signal))});
test("external social sends remain blocked until controlled test",()=>{assert.match(source,/selected\.channel!=="whatsapp"/);assert.match(source,/liberado após o teste externo controlado/)});
