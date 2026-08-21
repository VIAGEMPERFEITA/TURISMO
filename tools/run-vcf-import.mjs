import { readFile } from "node:fs/promises";

const [payloadPath, secretPath] = process.argv.slice(2);
if (!payloadPath || !secretPath) throw new Error("usage: node tools/run-vcf-import.mjs payload.json secret.env");
const payload = JSON.parse(await readFile(payloadPath, "utf8"));
const secretLine = (await readFile(secretPath, "utf8")).trim();
const token = secretLine.slice(secretLine.indexOf("=") + 1);
if (!token) throw new Error("missing import token");

const totals = { requested: payload.contacts.length, inserted: 0, existing: 0, rejected: 0, batches: 0 };
for (let index = 0; index < payload.contacts.length; index += 100) {
  const contacts = payload.contacts.slice(index, index + 100);
  const response = await fetch("https://acitaazihlxdowfcxkqo.supabase.co/functions/v1/crm-vcf-import", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-import-token": token },
    body: JSON.stringify({ batch_id: payload.batch_id, contacts }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`batch ${index / 100 + 1}: ${result.error || response.status}`);
  totals.inserted += result.inserted || 0;
  totals.existing += result.existing || 0;
  totals.rejected += result.rejected || 0;
  totals.batches++;
  process.stdout.write(`\rLotes concluídos: ${totals.batches}`);
}
process.stdout.write("\n");
console.log(JSON.stringify(totals));
