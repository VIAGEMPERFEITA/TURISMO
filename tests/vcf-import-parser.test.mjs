import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {execFile} from "node:child_process";
import {promisify} from "node:util";

const run=promisify(execFile);

test("VCF parser imports plain and Apple grouped telephone fields",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"vp-vcf-"));
 const input=join(dir,"contacts.vcf"),output=join(dir,"contacts.json");
 const vcf=[
  "BEGIN:VCARD\nVERSION:3.0\nFN:Contato Apple\nitem42.TEL;waid=5531999991111:+55 31 99999-1111\nitem42.EMAIL:test@example.com\nEND:VCARD",
  "BEGIN:VCARD\nVERSION:3.0\nFN:Contato Padrão\nTEL:+55 31 98888-2222\nEND:VCARD",
 ].join("\n");
 try{
  await writeFile(input,vcf);
  await run(process.execPath,[fileURLToPath(new URL("../tools/import-vcf-contacts.mjs",import.meta.url)),input,output]);
  const result=JSON.parse(await readFile(output,"utf8"));
  assert.equal(result.stats.valid_unique,2);
  assert.equal(result.stats.without_phone,0);
  assert.equal(result.contacts[0].email,"test@example.com");
  assert.deepEqual(result.issues,[]);
 }finally{await rm(dir,{recursive:true,force:true})}
});
