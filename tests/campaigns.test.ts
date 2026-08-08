import assert from "node:assert/strict";
import test from "node:test";
import {buildEligibleAudience,campaignIdempotencyKey,extractTemplateVariables,isOptOutMessage,normalizeCampaignPhone,renderCampaignMessage} from "../services/campaigns/core.ts";

test("normaliza telefones brasileiros",()=>{assert.equal(normalizeCampaignPhone("(31) 99528-5665"),"5531995285665");assert.equal(normalizeCampaignPhone("123"),null)});
test("exclui sem consentimento, suprimidos, inválidos e duplicados",()=>{const result=buildEligibleAudience([{id:"1",phone:"31995285665",consented:true},{id:"2",phone:"5531995285665",consented:true},{id:"3",phone:"31999999999",consented:false},{id:"4",phone:"31988888888",consented:true,suppressed:true},{id:"5",phone:"x",consented:true}]);assert.equal(result.eligible.length,1);assert.equal(result.duplicates,1);assert.equal(result.withoutConsent,1);assert.equal(result.suppressed,1);assert.equal(result.invalidPhone,1)});
test("renderiza variáveis e acusa ausentes",()=>{assert.deepEqual(extractTemplateVariables("Oi {{ nome }}, {{viagem}} / {{nome}}"),["nome","viagem"]);const ok=renderCampaignMessage("Oi {{nome}}",{nome:"Ana"});assert.equal(ok.rendered,"Oi Ana");assert.equal(ok.valid,true);assert.equal(renderCampaignMessage("{{nome}} {{viagem}}",{nome:"Ana"}).valid,false)});
test("idempotência é estável por campanha, contato e versão",()=>{assert.equal(campaignIdempotencyKey("abc","31995285665",2),campaignIdempotencyKey("abc","5531995285665",2))});
test("reconhece pedidos objetivos de descadastro",()=>{assert.equal(isOptOutMessage("sair"),true);assert.equal(isOptOutMessage("PARAR mensagens"),true);assert.equal(isOptOutMessage("quero viajar"),false)});
