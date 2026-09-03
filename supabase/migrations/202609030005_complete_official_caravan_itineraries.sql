begin;

-- Fonte: Prompt_Codex_Roteiros_Completos_Site_Plataforma_IA_VP.md, recebido em 03/09/2026.
-- Substitui resumos e remove definitivamente a associação incorreta da Reforma Protestante.
delete from public.caravan_itinerary_days where caravan_id in(
  select id from public.caravans where slug in(
    'egito-jordania-israel-novembro-2026','paris-egito-israel-marco-2027',
    'turquia-grecia-2027','jordania-israel-2027','italia-2027','israel-2027',
    'emirados-egito-2027','israel-egito-2027',
    'paris-egito-israel-marco-2028','turquia-grecia-2028','jordania-israel-2028',
    'italia-2028','israel-2028','emirados-egito-2028','israel-egito-2028'
  )
);

with route(slug,day_number,city,title,description) as(values
('egito-jordania-israel-novembro-2026',1,'Brasil · Cairo','Brasil — Cairo','Encontro em GRU, orientações, Kit VP e embarque ao Cairo. Pernoite a bordo.'),
('egito-jordania-israel-novembro-2026',2,'Cairo','Cairo — Egito','Chegada, recepção, traslado, descanso, jantar e hotel 4 ou 5 estrelas ou similar.'),
('egito-jordania-israel-novembro-2026',3,'Gizé · Cairo','Pirâmides — Esfinge — Museu','Pirâmides de Gizé, Esfinge, Templo do Vale, museu previsto e fábrica de papiros. Jantar e hospedagem.'),
('egito-jordania-israel-novembro-2026',4,'Cairo · Sinai','Cairo Bíblico — Monte Sinai','Igreja Suspensa, São Sérgio e São Baco, bairro copta e Khan El Khalili conforme tempo; viagem ao Sinai.'),
('egito-jordania-israel-novembro-2026',5,'Monte Sinai · Mar Vermelho','Monte Sinai — Mar Vermelho','Subida opcional para participantes aptos, Santa Catarina conforme regras locais e continuação ao Mar Vermelho.'),
('egito-jordania-israel-novembro-2026',6,'Aqaba · Wadi Rum','Mar Vermelho — Aqaba — Wadi Rum','Fronteira, entrada na Jordânia, Aqaba e experiência 4x4 em Wadi Rum conforme programação.'),
('egito-jordania-israel-novembro-2026',7,'Petra','Petra — Jordânia','Siq, Tesouro, tumbas, fachadas, teatro e áreas arqueológicas previstas no ingresso.'),
('egito-jordania-israel-novembro-2026',8,'Madaba · Monte Nebo · Amã','Madaba — Monte Nebo — Amã','Madaba, Monte Nebo, vista da Terra Prometida e pontos de Amã conforme programação.'),
('egito-jordania-israel-novembro-2026',9,'Jordânia · Israel · Galileia','Jordânia — Israel — Galileia','Fronteira, recepção em Israel e viagem à Galileia; visita inicial depende do tempo operacional.'),
('egito-jordania-israel-novembro-2026',10,'Galileia · Rio Jordão','Mar da Galileia — Cafarnaum — Rio Jordão','Barco, Cafarnaum, Casa de Pedro, Tabgha, Bem-Aventuranças, Magdala e Rio Jordão.'),
('egito-jordania-israel-novembro-2026',11,'Nazaré · Monte Tabor · Jerusalém','Nazaré — Monte Tabor — Jerusalém','Nazaré, Basílica da Anunciação, Monte do Precipício e Monte Tabor conforme acesso; Jerusalém.'),
('egito-jordania-israel-novembro-2026',12,'Jericó · Massada · Mar Morto','Jericó — Massada — Mar Morto','Jericó, Monte da Tentação panorâmico, Massada e banho no Mar Morto conforme condições.'),
('egito-jordania-israel-novembro-2026',13,'Jerusalém','Jerusalém Bíblica','Monte das Oliveiras, Getsêmani, Monte Sião, Cenáculo, Muro, Betesda, Via Dolorosa e local da ressurreição conforme programação.'),
('egito-jordania-israel-novembro-2026',14,'Jerusalém · Tel Aviv · Brasil','Jerusalém — Tel Aviv — Brasil','Passagem por Tel Aviv ou Jaffa conforme horário, Ben Gurion, retorno e chegada a GRU.'),

('paris-egito-israel-marco-2027',1,'Brasil · Paris','Brasil — Paris','Encontro em GRU, orientações, Kit VP e embarque. Pernoite a bordo.'),
('paris-egito-israel-marco-2027',2,'Paris','Paris','Passeio panorâmico: Torre Eiffel, Arco do Triunfo, Champs-Élysées, Concórdia, Louvre externo, Ópera, Notre-Dame externa e Sena.'),
('paris-egito-israel-marco-2027',3,'Paris · Cairo','Paris — Cairo','Experiências em Paris, tempo livre e embarque ao Cairo; recepção e hospedagem.'),
('paris-egito-israel-marco-2027',4,'Cairo','Cairo — Pirâmides e Tesouros do Egito','Gizé, Esfinge, museu previsto, papiros e Khan El Khalili.'),
('paris-egito-israel-marco-2027',5,'Cairo · Sinai','Cairo — Sinai — Experiência do Tabernáculo','Viagem ao Sinai; experiência do Tabernáculo somente se confirmada; subida ao Sinai opcional.'),
('paris-egito-israel-marco-2027',6,'Monte Sinai · Mar Vermelho','Monte Sinai — Mar Vermelho','Subida opcional condicionada à capacidade física, clima e segurança; descanso no Mar Vermelho.'),
('paris-egito-israel-marco-2027',7,'Egito · Israel · Galileia','Egito — Israel — Galileia','Fronteira, barco, Cafarnaum, Tabgha, Bem-Aventuranças, Magdala e Rio Jordão.'),
('paris-egito-israel-marco-2027',8,'Nazaré · Monte Tabor · Jerusalém','Nazaré — Monte Tabor — Jerusalém','Nazaré, Anunciação, Monte do Precipício e Tabor conforme acesso; Jerusalém.'),
('paris-egito-israel-marco-2027',9,'Jericó · Massada · Mar Morto','Jericó — Massada — Mar Morto','Jericó, Monte da Tentação panorâmico, Massada e Mar Morto conforme condições.'),
('paris-egito-israel-marco-2027',10,'Jerusalém','Jerusalém Antiga','Oliveiras, Getsêmani, Muro, Sião, Cenáculo, Caifás, Sant’Ana, Betesda, Via Dolorosa e Santo Sepulcro; Monte do Templo só com autorização.'),
('paris-egito-israel-marco-2027',11,'Jerusalém','Cidade de Davi — Jardim do Túmulo — Museu de Israel','Cidade de Davi, Siloé conforme acesso, Jardim do Túmulo, Museu de Israel e Santuário do Livro.'),
('paris-egito-israel-marco-2027',12,'Jerusalém','Jerusalém — Experiências complementares','Visitas confirmadas pela operação, oração e compras; sem promessa de atração não confirmada.'),
('paris-egito-israel-marco-2027',13,'Jerusalém','Jerusalém — Dia livre','Descanso, compras e experiências pessoais conforme segurança e orientação do guia.'),
('paris-egito-israel-marco-2027',14,'Israel · Brasil','Israel — Brasil','Traslado ao Ben Gurion, retorno e chegada a GRU conforme malha aérea.'),

('turquia-grecia-2027',1,'Brasil · Istambul','Brasil — Istambul','Encontro em GRU, Kit VP e embarque. Pernoite a bordo.'),
('turquia-grecia-2027',2,'Istambul','Istambul','Chegada, recepção, traslado, jantar e hospedagem.'),
('turquia-grecia-2027',3,'Istambul','Istambul Histórica','Hipódromo, Mesquita Azul, Santa Sofia, Topkapi ou equivalente e Grande Bazar conforme ingressos.'),
('turquia-grecia-2027',4,'Istambul · Capadócia','Istambul — Capadócia','Bósforo, Bazar Egípcio conforme horários e voo doméstico à Capadócia.'),
('turquia-grecia-2027',5,'Capadócia','Capadócia','Göreme, Chaminés de Fada, vales, cidade subterrânea prevista e artesanato; balão opcional e sujeito ao clima.'),
('turquia-grecia-2027',6,'Capadócia · Konya · Pamukkale','Capadócia — Konya — Pamukkale','Complexo relacionado a Mevlana e continuação a Pamukkale.'),
('turquia-grecia-2027',7,'Pamukkale · Laodiceia · Éfeso · Kusadasi','Pamukkale — Laodiceia — Éfeso — Kusadasi','Hierápolis, Laodiceia conforme programação, Éfeso, Celso, teatro e Casa de Maria conforme ingresso.'),
('turquia-grecia-2027',8,'Kusadasi · Patmos','Kusadasi — Patmos — Cruzeiro','Cruzeiro a Patmos; Gruta do Apocalipse e Mosteiro de São João quando incluídos.'),
('turquia-grecia-2027',9,'Rodes','Rodes','Cidade medieval e excursão contratada. Refeições e hospedagem a bordo.'),
('turquia-grecia-2027',10,'Creta · Santorini','Creta — Santorini','Paradas e passeios conforme itinerário contratado do cruzeiro.'),
('turquia-grecia-2027',11,'Atenas','Atenas','Acrópole, Partenon, Areópago e pontos panorâmicos.'),
('turquia-grecia-2027',12,'Corinto · Atenas','Corinto — Atenas','Canal, sítio arqueológico, Bema de Gálio e referências ao ministério de Paulo.'),
('turquia-grecia-2027',13,'Atenas · Brasil','Atenas — Brasil','Tempo livre conforme voo, traslado e embarque.'),
('turquia-grecia-2027',14,'Brasil','Brasil','Chegada a GRU e fim dos serviços.'),

('jordania-israel-2027',1,'Brasil · Amã','Brasil — Amã','Encontro em GRU e embarque. Pernoite a bordo.'),('jordania-israel-2027',2,'Amã','Amã','Chegada, traslado, jantar e hotel 4 ou 5 estrelas ou similar.'),
('jordania-israel-2027',3,'Amã · Jerash','Amã — Jerash','City tour panorâmico e antiga Jerash.'),('jordania-israel-2027',4,'Madaba · Monte Nebo · Mar Morto','Madaba — Monte Nebo — Mar Morto','Madaba, Monte Nebo e região do Mar Morto.'),
('jordania-israel-2027',5,'Petra','Petra','Siq, Tesouro, fachadas, tumbas e áreas incluídas.'),('jordania-israel-2027',6,'Wadi Rum · Aqaba','Wadi Rum — Aqaba','Experiência no deserto e continuação a Aqaba.'),
('jordania-israel-2027',7,'Jordânia · Israel · Galileia','Jordânia — Israel — Galileia','Fronteira, recepção e viagem à Galileia.'),('jordania-israel-2027',8,'Galileia','Galileia Bíblica','Barco, Cafarnaum, Casa de Pedro, Tabgha, Bem-Aventuranças, Magdala e Jordão.'),
('jordania-israel-2027',9,'Nazaré · Monte Tabor · Jerusalém','Nazaré — Monte Tabor — Jerusalém','Nazaré, Anunciação, Precipício e Tabor conforme acesso; Jerusalém.'),('jordania-israel-2027',10,'Jericó · Massada · Mar Morto','Jericó — Massada — Mar Morto','Jericó, Tentação panorâmico, Massada e Mar Morto.'),
('jordania-israel-2027',11,'Jerusalém','Jerusalém Antiga','Oliveiras, Getsêmani, Sião, Cenáculo, Muro, Betesda, Via Dolorosa e Santo Sepulcro.'),('jordania-israel-2027',12,'Cidade de Davi · Belém · Jerusalém','Cidade de Davi — Belém — Jardim do Túmulo','Cidade de Davi, áreas previstas, Belém, Campo dos Pastores conforme acesso e Jardim do Túmulo.'),
('jordania-israel-2027',13,'Israel · Brasil','Israel — Brasil','Traslado ao Ben Gurion e retorno a GRU.'),

('italia-2027',1,'Brasil · Roma','Brasil — Roma','Encontro em GRU e embarque. Pernoite a bordo.'),('italia-2027',2,'Roma','Roma','Chegada, recepção, traslado, jantar e hospedagem.'),
('italia-2027',3,'Roma · Vaticano','Roma Cristã — Vaticano','São Pedro, Museus Vaticanos e Capela Sistina quando incluídos, São Paulo Fora dos Muros e panorâmicos.'),('italia-2027',4,'Roma · Cássia · Assis','Roma — Cássia — Assis','Santuário de Santa Rita e continuação a Assis.'),
('italia-2027',5,'Assis','Assis — São Francisco e Santa Clara','Basílicas, túmulo de São Francisco, Santa Maria Maior e Carlo Acutis conforme acesso, e centro histórico.'),('italia-2027',6,'Porciúncula · La Verna · Florença','Porciúncula — La Verna — Florença','Santa Maria dos Anjos, Porciúncula, La Verna e viagem a Florença.'),
('italia-2027',7,'Florença','Florença','Duomo, Batistério, Signoria, Ponte Vecchio e Santa Croce conforme ingresso.'),('italia-2027',8,'Pádua · Veneza','Pádua — Veneza','Basílica de Santo Antônio e passeio orientado em Veneza.'),
('italia-2027',9,'Veneza · Brasil','Veneza — Retorno','São Marcos conforme acesso, tempo livre e traslado ao aeroporto definido na operação.'),('italia-2027',10,'Brasil','Brasil','Chegada a GRU e fim dos serviços.'),

('israel-2027',1,'Brasil · Israel','Brasil — Israel','Encontro em GRU e embarque. Pernoite a bordo.'),('israel-2027',2,'Tel Aviv · Galileia','Tel Aviv — Galileia','Chegada, recepção e viagem à Galileia.'),
('israel-2027',3,'Galileia','Galileia Bíblica','Barco, Cafarnaum, Tabgha, Bem-Aventuranças, Magdala e Jordão.'),('israel-2027',4,'Nazaré · Jericó · Jerusalém','Nazaré — Jericó — Jerusalém','Nazaré, Anunciação, Precipício, passagem por Jericó e Jerusalém.'),
('israel-2027',5,'Jerusalém','Jerusalém Antiga','Oliveiras, Getsêmani, Sião, Cenáculo, Muro, Betesda, Via Dolorosa e Santo Sepulcro.'),('israel-2027',6,'Cidade de Davi · Belém · Jerusalém','Cidade de Davi — Belém — Jardim do Túmulo','Cidade de Davi, áreas previstas, Belém, Campo dos Pastores conforme acesso e Jardim do Túmulo.'),
('israel-2027',7,'Israel · Roma','Israel — Roma','Voo a Roma, recepção, traslado, jantar e hospedagem.'),('israel-2027',8,'Roma · Vaticano','Roma — Vaticano','São Pedro, Museus Vaticanos e Capela Sistina quando incluídos, Basílicas Maiores e pontos históricos.'),
('israel-2027',9,'Cássia · Assis','Cássia — Assis','Santa Rita, São Francisco, Santa Clara e centro histórico.'),('israel-2027',10,'Assis · Roma · Brasil','Assis — Roma — Brasil','Porciúncula, retorno a Roma e embarque.'),('israel-2027',11,'Brasil','Brasil','Chegada a GRU.'),

('emirados-egito-2027',1,'Brasil · Dubai','Brasil — Dubai','Encontro em GRU e embarque. Pernoite a bordo.'),('emirados-egito-2027',2,'Dubai','Dubai','Chegada, traslado, jantar e hotel 4 ou 5 estrelas ou similar.'),
('emirados-egito-2027',3,'Dubai','Dubai Clássica e Moderna','Al Fahidi, abra, mercados, Dubai Frame conforme ingresso, Burj Khalifa, Dubai Mall e atração noturna conforme calendário.'),('emirados-egito-2027',4,'Abu Dhabi','Abu Dhabi','Mesquita Sheikh Zayed, Corniche, Emirates Palace panorâmico e Qasr Al Watan ou Louvre conforme pacote.'),
('emirados-egito-2027',5,'Dubai · Deserto','Dubai — Deserto','Marina, Palm Jumeirah e experiência no deserto com transporte autorizado.'),('emirados-egito-2027',6,'Dubai · Cairo','Dubai — Cairo','Voo ao Cairo, recepção, jantar e hospedagem.'),
('emirados-egito-2027',7,'Gizé · Cairo','Pirâmides — Esfinge — Museu','Gizé, Esfinge, Templo do Vale, museu previsto e papiros.'),('emirados-egito-2027',8,'Cairo · Luxor','Cairo Histórico — Luxor','Bairro copta, Igreja Suspensa, São Sérgio e Khan El Khalili conforme tempo; deslocamento a Luxor.'),
('emirados-egito-2027',9,'Luxor','Luxor — Margem Ocidental','Vale dos Reis, templo previsto, Colossos de Memnon e cruzeiro quando contratado.'),('emirados-egito-2027',10,'Luxor · Edfu','Luxor — Edfu','Karnak, Luxor e navegação conforme cruzeiro.'),
('emirados-egito-2027',11,'Edfu · Kom Ombo · Assuã','Edfu — Kom Ombo — Assuã','Templos de Edfu e Kom Ombo e navegação a Assuã.'),('emirados-egito-2027',12,'Assuã · Cairo · Brasil','Assuã — Cairo — Brasil','Visitas previstas; Abu Simbel somente se incluído e compatível; conexão ao Brasil.'),('emirados-egito-2027',13,'Brasil','Brasil','Chegada a GRU.'),

('israel-egito-2027',1,'Brasil · Cairo','Brasil — Cairo','Encontro em GRU e embarque. Pernoite a bordo.'),('israel-egito-2027',2,'Cairo','Cairo','Chegada, recepção, traslado, jantar e hospedagem.'),
('israel-egito-2027',3,'Gizé · Cairo','Pirâmides — Esfinge — Museu','Gizé, Esfinge, Templo do Vale, museu previsto, papiros e Khan El Khalili conforme tempo.'),('israel-egito-2027',4,'Cairo · Sinai','Cairo Bíblico — Sinai','Bairro copta, Igreja Suspensa, São Sérgio e região da Sagrada Família; Sinai.'),
('israel-egito-2027',5,'Monte Sinai · Mar Vermelho','Monte Sinai — Mar Vermelho','Subida opcional para aptos, Santa Catarina conforme regras e Mar Vermelho.'),('israel-egito-2027',6,'Egito · Israel · Galileia','Egito — Israel — Galileia','Fronteira, entrada em Israel e viagem à Galileia.'),
('israel-egito-2027',7,'Galileia','Galileia Bíblica','Barco, Cafarnaum, Tabgha, Bem-Aventuranças, Magdala e Jordão.'),('israel-egito-2027',8,'Nazaré · Monte Tabor · Jerusalém','Nazaré — Monte Tabor — Jerusalém','Nazaré, Anunciação, Precipício e Tabor conforme acesso; Jerusalém.'),
('israel-egito-2027',9,'Jericó · Massada · Mar Morto','Jericó — Massada — Mar Morto','Jericó, Tentação panorâmico, Massada e Mar Morto.'),('israel-egito-2027',10,'Jerusalém','Jerusalém Antiga','Oliveiras, Getsêmani, Sião, Cenáculo, Muro, Betesda, Via Dolorosa e Santo Sepulcro.'),
('israel-egito-2027',11,'Jerusalém · Belém · Brasil','Cidade de Davi — Museu de Israel — Belém — Retorno','Cidade de Davi, Museu de Israel, Santuário do Livro, Belém e Campo dos Pastores conforme acesso; embarque.'),('israel-egito-2027',12,'Brasil','Brasil','Chegada a GRU.')
)
insert into public.caravan_itinerary_days(caravan_id,day_number,city,title,description,position,notes)
select c.id,r.day_number,r.city,r.title,r.description,r.day_number,
  'Roteiro oficial; ordem operacional, horários e acessos podem mudar conforme fornecedores e autoridades.'
from route r join public.caravans c on c.slug=r.slug;

-- Clonagem controlada dos roteiros oficiais de 2027 para seus registros de 2028.
insert into public.caravan_itinerary_days(caravan_id,day_number,city,title,description,visits,meals,hotel,transportation,notes,position)
select target.id,d.day_number,d.city,d.title,d.description,d.visits,d.meals,d.hotel,d.transportation,d.notes,d.position
from public.caravan_itinerary_days d
join public.caravans source on source.id=d.caravan_id and source.year=2027
join public.caravans target on target.organization_id=source.organization_id and target.slug=replace(source.slug,'2027','2028')
on conflict(caravan_id,day_number) do update set city=excluded.city,title=excluded.title,
  description=excluded.description,visits=excluded.visits,meals=excluded.meals,hotel=excluded.hotel,
  transportation=excluded.transportation,notes=excluded.notes,position=excluded.position,updated_at=now();

update public.caravans set departure_city='Aeroporto Internacional de Guarulhos (GRU), São Paulo',
  hotel_category='Hotéis de categoria 4 e 5 estrelas ou similares',published=true,status_internal='confirmada',
  commercial_notes=concat_ws(' ',nullif(commercial_notes,''),'Roteiro diário oficial aprovado em 03/09/2026. Horários, hotéis, ordem operacional e acessos permanecem sujeitos à confirmação.'),updated_at=now()
where slug in('egito-jordania-israel-novembro-2026','paris-egito-israel-marco-2027','paris-egito-israel-marco-2028',
  'turquia-grecia-2027','turquia-grecia-2028','jordania-israel-2027','jordania-israel-2028','italia-2027','italia-2028',
  'israel-2027','israel-2028','emirados-egito-2027','emirados-egito-2028','israel-egito-2027','israel-egito-2028');

do $$
declare org_id uuid; approver_id uuid; item record; article_content text; next_version int;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  select id into approver_id from public.profiles where organization_id=org_id and active=true and role in('administrador','gestor')
    order by case when role='administrador' then 0 else 1 end limit 1;
  if org_id is null or approver_id is null then raise exception 'organizacao e aprovador sao obrigatorios'; end if;
  for item in select c.* from public.caravans c where c.organization_id=org_id and c.id in(
    select distinct caravan_id from public.caravan_itinerary_days group by caravan_id having count(*)=max(day_number))
  loop
    select concat_ws(E'\n','Caravana: '||item.name,'Duração: '||item.duration_days||' dias.',
      'Embarque: Aeroporto Internacional de Guarulhos (GRU), São Paulo.',
      'Roteiro oficial: '||jsonb_agg(jsonb_build_object('dia',d.day_number,'cidade',d.city,'titulo',d.title,'descricao',d.description) order by d.day_number)::text,
      'Hotéis 4 ou 5 estrelas ou similares. Horários, hotéis, ordem operacional e acessos podem sofrer ajustes equivalentes.',
      'Preço e condições devem ser consultados na base comercial privada. Entrada mínima: 10% do total em reais no câmbio inicial congelado.')
      into article_content from public.caravan_itinerary_days d where d.caravan_id=item.id;
    update public.knowledge_base_articles set content=article_content,source='Roteiro oficial aprovado pela empresa em 03/09/2026',
      source_url='https://www.viagemperfeitaturismo.com.br/caravanas/'||item.slug,published=true,audience='ambos',
      lifecycle_status='aprovado',usable_by_ai=true,responsible_id=approver_id,approved_by=approver_id,
      approved_at=now(),updated_at=now(),version=version+1 where organization_id=org_id and title='Base oficial — '||item.name;
    if not found then insert into public.knowledge_base_articles(organization_id,title,category,content,source,source_url,version,
      approved_by,approved_at,published,audience,created_by,lifecycle_status,usable_by_ai,responsible_id)
      values(org_id,'Base oficial — '||item.name,'caravana_oficial',article_content,'Roteiro oficial aprovado pela empresa em 03/09/2026',
      'https://www.viagemperfeitaturismo.com.br/caravanas/'||item.slug,1,approver_id,now(),true,'ambos',approver_id,'aprovado',true,approver_id); end if;

    select coalesce(max(version),0)+1 into next_version from public.caravan_ai_knowledge_snapshots
      where organization_id=org_id and caravan_id=item.id;
    insert into public.caravan_ai_knowledge_snapshots(organization_id,caravan_id,version,catalog_data,commercial_data,
      itinerary_status,source_url,status,approved_by,approved_at)
    select org_id,item.id,next_version,to_jsonb(item)||jsonb_build_object('itinerary',jsonb_agg(to_jsonb(d) order by d.day_number)),
      coalesce((select to_jsonb(t) from public.caravan_commercial_terms t where t.caravan_id=item.id and t.status='aprovado' limit 1),'{}'::jsonb),
      'detalhado','https://www.viagemperfeitaturismo.com.br/caravanas/'||item.slug,'aprovado',approver_id,now()
    from public.caravan_itinerary_days d where d.caravan_id=item.id;
    update public.ai_test_scenarios set expected_behavior=expected_behavior||jsonb_build_object(
      'required_itinerary_status','detalhado','expected_days',item.duration_days,'must_not_mix_caravans',true),updated_at=now()
      where organization_id=org_id and scenario_code='caravana-roteiro-'||item.slug;
  end loop;
end $$;

commit;
