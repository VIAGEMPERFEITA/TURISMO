begin;

with confirmed_caravans(name,slug,destination,subtitle,short_description,full_description,cover_image,month,year,duration_days,duration_nights,departure_city,countries,cities,category,priority,status_public) as (
  values
    ('Caravana Egito, Jordânia e Israel — Novembro 2026','egito-jordania-israel-novembro-2026','Egito, Jordânia e Israel','Egito, Jordânia e Israel','Três países unidos por história, cultura e experiências de profundo significado.','Uma jornada internacional em grupo pela riqueza histórica do Egito, pelas paisagens da Jordânia e pelos lugares de fé de Israel. Os detalhes operacionais são apresentados somente na proposta oficial.','https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=900&q=72',11,2026,null,null,null,array['Egito','Jordânia','Israel']::text[],array[]::text[],'religioso',1,'disponivel'),
    ('Caravana Paris, Egito e Israel — Março 2027','paris-egito-israel-marco-2027','Paris, Egito e Israel','Paris, Egito e Israel','Uma experiência entre patrimônio europeu, história milenar e lugares de fé.','Uma caravana internacional que conecta Paris, a herança histórica do Egito e a experiência espiritual de Israel. Os detalhes operacionais são apresentados exclusivamente nas condições oficiais.','https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=72',3,2027,null,null,null,array['França','Egito','Israel']::text[],array['Paris']::text[],'religioso',2,'disponivel'),
    ('Turquia e Grécia — Passos de Paulo','turquia-grecia-2027','Turquia e Grécia','Passos de Paulo','Uma jornada pelos caminhos das primeiras comunidades cristãs.','Cidades históricas e lugares ligados ao cristianismo primitivo compõem uma experiência de cultura, conhecimento e fé em grupo.','https://images.unsplash.com/photo-1504512485720-7d83a16ee930?auto=format&fit=crop&w=900&q=72',3,2027,14,13,'São Paulo',array['Turquia','Grécia']::text[],array['Istambul','Éfeso','Atenas','Corinto']::text[],'religioso',100,'disponivel'),
    ('Jordânia e Israel — Jornada da Promessa','jordania-israel-2027','Jordânia e Israel','Jornada da Promessa','Paisagens, patrimônio e contextos bíblicos entre Jordânia e Israel.','Uma experiência em grupo que aproxima história, arqueologia e espiritualidade entre dois destinos marcantes.','https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=900&q=72',5,2027,13,12,'São Paulo',array['Jordânia','Israel']::text[],array['Amã','Petra','Jerusalém']::text[],'religioso',100,'disponivel'),
    ('Itália — Caminhos de São Francisco','italia-2027','Itália','Caminhos de São Francisco','Arte, cultura e espiritualidade em cidades históricas da Itália.','Uma caravana que propõe vivências culturais e espirituais em um roteiro de patrimônio, contemplação e convivência.','https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=900&q=72',6,2027,10,9,'São Paulo',array['Itália']::text[],array['Roma','Assis','Florença']::text[],'religioso',100,'disponivel'),
    ('Israel — Caminhos da Fé','israel-2027','Israel','Caminhos da Fé','Fé, história e cultura nos lugares que dão contexto às Escrituras.','Uma experiência de grupo por Israel com proposta histórica, cultural e espiritual, organizada para favorecer conhecimento e contemplação.','https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=900&q=72',9,2027,11,10,'São Paulo',array['Israel','Itália']::text[],array['Jerusalém','Galileia','Roma']::text[],'religioso',100,'disponivel'),
    ('Emirados e Egito — Entre História e Futuro','emirados-egito-2027','Emirados e Egito','Entre História e Futuro','Arquitetura contemporânea e patrimônio milenar em uma mesma jornada.','Uma viagem cultural em grupo que combina os contrastes dos Emirados Árabes Unidos com a herança histórica do Egito.','https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=72',10,2027,13,12,'São Paulo',array['Emirados Árabes Unidos','Egito']::text[],array['Dubai','Abu Dhabi','Cairo']::text[],'cultural',100,'disponivel'),
    ('Israel e Egito — Raízes do Êxodo','israel-egito-2027','Egito e Israel','Raízes do Êxodo','História milenar e caminhos bíblicos entre Egito e Israel.','Uma caravana de conhecimento e fé que conecta a civilização egípcia aos contextos históricos e espirituais de Israel.','https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=900&q=72',11,2027,12,11,'São Paulo',array['Egito','Israel']::text[],array['Cairo','Jerusalém','Galileia']::text[],'religioso',100,'disponivel')
)
insert into public.caravans(organization_id,name,slug,destination,subtitle,short_description,full_description,cover_image,month,year,duration_days,duration_nights,departure_city,countries,cities,category,priority,status_public,status_internal,published)
select public.default_organization_id(),c.name,c.slug,c.destination,c.subtitle,c.short_description,c.full_description,c.cover_image,c.month,c.year,c.duration_days,c.duration_nights,c.departure_city,c.countries,c.cities,c.category,c.priority,c.status_public,'confirmada',true
from confirmed_caravans c
on conflict(organization_id,slug) do update set
  name=excluded.name,
  destination=excluded.destination,
  subtitle=excluded.subtitle,
  short_description=excluded.short_description,
  full_description=excluded.full_description,
  cover_image=excluded.cover_image,
  month=excluded.month,
  year=excluded.year,
  duration_days=excluded.duration_days,
  duration_nights=excluded.duration_nights,
  departure_city=excluded.departure_city,
  countries=excluded.countries,
  cities=excluded.cities,
  category=excluded.category,
  priority=excluded.priority,
  status_public=excluded.status_public,
  status_internal='confirmada',
  published=true,
  updated_at=now();

commit;
