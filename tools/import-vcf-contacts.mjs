import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error("usage: node tools/import-vcf-contacts.mjs input.vcf output.json");
const unfold = (text) => text.replace(/\r?\n[ \t]/g, "");
const decode = (value) => value.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
const normalizePhone = (raw, waid = "") => {
  let digits = String(waid || raw || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length > 11) digits = digits.slice(1);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return /^\d{12,15}$/.test(digits) ? digits : "";
};
const text = unfold(await readFile(inputPath, "utf8"));
const cards = text.split(/BEGIN:VCARD\r?\n/i).slice(1).map((card) => card.split(/END:VCARD/i)[0]);
const contacts = [];
let withoutPhone = 0;
let invalidPhone = 0;
for (const card of cards) {
  const lines = card.split(/\r?\n/).filter(Boolean);
  const fn = lines.find((line) => /^FN(?:;[^:]*)?:/i.test(line));
  const emailLine = lines.find((line) => /^EMAIL(?:;[^:]*)?:/i.test(line));
  const telLines = lines.filter((line) => /^TEL(?:;[^:]*)?:/i.test(line));
  if (!telLines.length) { withoutPhone++; continue; }
  let selected = null;
  for (const line of telLines) {
    const colon = line.indexOf(":");
    const metadata = line.slice(0, colon);
    const raw = line.slice(colon + 1);
    const waid = metadata.match(/(?:^|;)waid=([^;:]+)/i)?.[1] || "";
    const normalized = normalizePhone(raw, waid);
    if (normalized) { selected = { raw: decode(raw), normalized }; break; }
  }
  if (!selected) { invalidPhone++; continue; }
  contacts.push({
    name: decode(fn ? fn.slice(fn.indexOf(":") + 1) : "Contato importado") || "Contato importado",
    phone: selected.raw,
    phone_normalized: selected.normalized,
    email: emailLine ? decode(emailLine.slice(emailLine.indexOf(":") + 1)).toLowerCase() : null,
  });
}
const deduped = [...new Map(contacts.map((contact) => [contact.phone_normalized, contact])).values()];
const result = {
  batch_id: `vcf-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`,
  stats: { cards: cards.length, without_phone: withoutPhone, invalid_phone: invalidPhone, duplicates: contacts.length - deduped.length, valid_unique: deduped.length },
  contacts: deduped,
};
await writeFile(outputPath, JSON.stringify(result), { mode: 0o600 });
console.log(JSON.stringify(result.stats));
