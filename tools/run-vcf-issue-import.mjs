import {readFile} from "node:fs/promises";
const[payloadPath,secretPath]=process.argv.slice(2);if(!payloadPath||!secretPath)throw new Error("usage: node tools/run-vcf-issue-import.mjs payload.json secret.env");
const payload=JSON.parse(await readFile(payloadPath,"utf8")),secretLine=(await readFile(secretPath,"utf8")).trim(),token=secretLine.slice(secretLine.indexOf("=")+1);
if(!token)throw new Error("missing import token");
const totals={requested:payload.issues?.length||0,recorded:0,rejected:0,batches:0};
for(let index=0;index<totals.requested;index+=100){const issues=payload.issues.slice(index,index+100);const response=await fetch("https://acitaazihlxdowfcxkqo.supabase.co/functions/v1/crm-vcf-import",{method:"POST",headers:{"Content-Type":"application/json","x-import-token":token},body:JSON.stringify({batch_id:payload.batch_id,issues})});const result=await response.json();if(!response.ok)throw new Error(`batch ${index/100+1}: ${result.error||response.status}`);totals.recorded+=result.issues_recorded||0;totals.rejected+=result.rejected||0;totals.batches++}
console.log(JSON.stringify(totals));
