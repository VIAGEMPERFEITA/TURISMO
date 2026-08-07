begin;

update public.caravans set
  name='Caravana Egito, Jordânia e Israel — Novembro de 2026',
  duration_days=14,
  duration_nights=null,
  departure_city='São Paulo',
  cover_image='/media/israel/jerusalem-experiencia.jpg',
  status_public='disponivel',
  status_internal='confirmada',
  included='["Passagem aérea internacional de ida e volta, com saída de São Paulo","Acompanhamento da equipe Viagem Perfeita durante toda a viagem, oferecendo suporte e assistência do início ao fim","Traslados Aeroporto ⇄ Hotel em todos os destinos","Ônibus executivo de turismo com ar-condicionado e Wi-Fi","Guias locais especializados falando português","Hospedagem em hotéis categoria 3 e 4 estrelas","Hospedagem em regime de meia pensão no Egito","Hospedagem em regime de meia pensão na Jordânia","Hospedagem em regime de meia pensão em Israel","Acomodação em apartamentos duplos ou triplos","Entradas nos principais atrativos turísticos e locais bíblicos conforme o roteiro","Roteiro exclusivo desenvolvido pela Viagem Perfeita","Kit exclusivo Gift Viagem Perfeita","Seguro viagem com cobertura médica internacional"]'::jsonb,
  updated_at=now()
where slug='egito-jordania-israel-novembro-2026';

update public.caravans set
  name='Caravana Paris, Egito e Israel — Março de 2027',
  short_description='Uma jornada pela história, fé e cultura.',
  duration_days=14,
  duration_nights=null,
  departure_city='São Paulo',
  cover_image='/media/israel/monte-das-oliveiras.jpg',
  status_public='disponivel',
  status_internal='confirmada',
  included='["Passagem aérea internacional de ida e volta, com saída de São Paulo","Passeios pelos principais pontos turísticos de Paris","Acompanhamento da equipe Viagem Perfeita durante toda a viagem","Traslados Aeroporto ⇄ Hotel em todos os destinos","Ônibus executivo de turismo com ar-condicionado e Wi-Fi","Guias locais especializados falando português","Hospedagem em hotéis categoria 3 e 4 estrelas","Café da manhã em Paris","Hospedagem em regime de meia pensão no Egito","Hospedagem em regime de meia pensão em Israel","Acomodação em apartamentos duplos ou triplos","Entradas nos principais atrativos turísticos e locais bíblicos conforme o roteiro","Roteiro exclusivo desenvolvido pela Viagem Perfeita","Kit exclusivo Gift Viagem Perfeita","Seguro viagem com cobertura médica internacional"]'::jsonb,
  updated_at=now()
where slug='paris-egito-israel-marco-2027';

delete from public.caravan_itinerary_days
where caravan_id in (select id from public.caravans where slug in ('egito-jordania-israel-novembro-2026','paris-egito-israel-marco-2027'));

with route(slug,day_number,city,title) as (values
  ('egito-jordania-israel-novembro-2026',1,'Berlim — Alemanha','Berlim — Alemanha'),
  ('egito-jordania-israel-novembro-2026',2,'Berlim · Wittenberg · Eisleben · Erfurt','Berlim — Wittenberg — Eisleben — Erfurt'),
  ('egito-jordania-israel-novembro-2026',3,'Erfurt · Eisenach · Wartburg · Frankfurt','Erfurt — Eisenach — Wartburg — Frankfurt'),
  ('egito-jordania-israel-novembro-2026',4,'Frankfurt · Worms · Heidelberg','Frankfurt — Worms — Heidelberg'),
  ('egito-jordania-israel-novembro-2026',5,'Heidelberg · Baden-Baden · Zurique','Heidelberg — Baden-Baden — Zurique'),
  ('egito-jordania-israel-novembro-2026',6,'Zurique — Suíça','Zurique — Suíça'),
  ('egito-jordania-israel-novembro-2026',7,'Zurique · Berna · Lausanne · Genebra','Zurique — Berna — Lausanne — Genebra'),
  ('egito-jordania-israel-novembro-2026',8,'Genebra — Suíça','Genebra — Suíça'),
  ('egito-jordania-israel-novembro-2026',9,'Genebra · Edimburgo','Genebra — Edimburgo'),
  ('egito-jordania-israel-novembro-2026',10,'Edimburgo — Escócia','Edimburgo — Escócia'),
  ('egito-jordania-israel-novembro-2026',11,'Edimburgo · Londres','Edimburgo — Londres'),
  ('egito-jordania-israel-novembro-2026',12,'Londres — Inglaterra','Londres — Inglaterra'),
  ('egito-jordania-israel-novembro-2026',13,'Londres · Oxford','Londres — Oxford'),
  ('egito-jordania-israel-novembro-2026',14,'Londres · Brasil','Londres — Brasil'),
  ('paris-egito-israel-marco-2027',1,'Brasil · Paris','Brasil — Paris'),
  ('paris-egito-israel-marco-2027',2,'Paris — França','Paris — França'),
  ('paris-egito-israel-marco-2027',3,'Paris · Cairo','Paris — Cairo'),
  ('paris-egito-israel-marco-2027',4,'Cairo — Egito','Cairo — Egito'),
  ('paris-egito-israel-marco-2027',5,'Monte Sinai · Deserto do Negev','Monte Sinai — Réplica dos Tabernáculos'),
  ('paris-egito-israel-marco-2027',6,'Monte Sinai · Mar Vermelho','Monte Sinai — Mar Vermelho'),
  ('paris-egito-israel-marco-2027',7,'Egito · Israel · Galileia','Egito — Israel — Galileia'),
  ('paris-egito-israel-marco-2027',8,'Nazaré · Monte Tabor · Jerusalém','Nazaré — Monte Tabor — Jerusalém'),
  ('paris-egito-israel-marco-2027',9,'Jericó · Mar Morto · Massada','Jericó — Mar Morto — Massada'),
  ('paris-egito-israel-marco-2027',10,'Jerusalém Antiga','Jerusalém Antiga'),
  ('paris-egito-israel-marco-2027',11,'Cidade de Davi · Jerusalém','Cidade de Davi — Túmulo Vazio — Museu de Israel'),
  ('paris-egito-israel-marco-2027',12,'Jerusalém','Jerusalém'),
  ('paris-egito-israel-marco-2027',13,'Jerusalém','Jerusalém — Dia livre'),
  ('paris-egito-israel-marco-2027',14,'Israel · Brasil','Israel — Brasil')
)
insert into public.caravan_itinerary_days(caravan_id,day_number,city,title,position)
select c.id,r.day_number,r.city,r.title,r.day_number
from route r join public.caravans c on c.slug=r.slug;

commit;
