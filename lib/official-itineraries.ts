import type {ItineraryDay} from "./trips";

const day=(day:number,city:string,title:string,description:string,activities?:string[]):ItineraryDay=>({day,city,title,description,...(activities?.length?{activities}:{})});

export const officialItineraries:Record<string,ItineraryDay[]>={
  "egito-jordania-israel-novembro-2026":[
    day(1,"Brasil · Cairo","Brasil — Cairo","Encontro do grupo em GRU para orientações, entrega do Kit Viagem Perfeita e embarque com destino ao Cairo, conforme conexões previstas. Pernoite a bordo."),
    day(2,"Cairo · Egito","Cairo — Egito","Chegada ao Cairo, recepção pela equipe local, traslado climatizado, acomodação em hotel 4 ou 5 estrelas ou similar, descanso, jantar e hospedagem."),
    day(3,"Gizé · Cairo","Pirâmides — Esfinge — Museu","Visita aos grandes símbolos do Egito Antigo. Jantar e hospedagem no Cairo.",["Complexo das Pirâmides de Gizé","Grande Esfinge","Templo do Vale","Museu egípcio previsto na operação","Fábrica de papiros"]),
    day(4,"Cairo · Monte Sinai","Cairo Bíblico — Monte Sinai","Visitas ao Cairo histórico e religioso e viagem em direção à Península do Sinai. Jantar e hospedagem na região.",["Igreja Suspensa","Igreja de São Sérgio e São Baco","Bairro copta","Região relacionada à passagem da Sagrada Família","Khan El Khalili, conforme tempo disponível"]),
    day(5,"Monte Sinai · Mar Vermelho","Monte Sinai — Mar Vermelho","Subida opcional ao Monte Sinai para participantes aptos, contemplação do nascer do sol e visita à região do Mosteiro de Santa Catarina conforme regras locais. Continuação ao Mar Vermelho, jantar e hospedagem."),
    day(6,"Aqaba · Wadi Rum","Mar Vermelho — Aqaba — Wadi Rum","Procedimentos de fronteira e entrada na Jordânia, seguindo por Aqaba até Wadi Rum. Experiência em veículo 4x4 conforme programação, jantar e hospedagem em Wadi Rum ou Petra."),
    day(7,"Petra · Jordânia","Petra — Jordânia","Dia dedicado a Petra, com jantar e hospedagem na Jordânia.",["Desfiladeiro Siq","Tesouro","Tumbas e fachadas monumentais","Teatro e áreas arqueológicas previstas no ingresso"]),
    day(8,"Madaba · Monte Nebo · Amã","Madaba — Monte Nebo — Amã","Visita a Madaba, Monte Nebo e principais pontos de Amã conforme programação. Jantar e hospedagem em Amã."),
    day(9,"Jordânia · Israel · Galileia","Jordânia — Israel — Galileia","Procedimentos de fronteira, recepção em Israel e viagem para a Galileia. A visita inicial depende do tempo de fronteira. Jantar e hospedagem."),
    day(10,"Galileia · Rio Jordão","Mar da Galileia — Cafarnaum — Rio Jordão","Dia dedicado aos lugares relacionados ao ministério de Jesus. Jantar e hospedagem na Galileia.",["Passeio de barco pelo Mar da Galileia","Cafarnaum","Antiga sinagoga e Casa de Pedro","Tabgha","Monte das Bem-Aventuranças","Magdala","Rio Jordão, com renovação opcional dos votos batismais"]),
    day(11,"Nazaré · Monte Tabor · Jerusalém","Nazaré — Monte Tabor — Jerusalém","Visitas a Nazaré, Basílica da Anunciação, Monte do Precipício e Monte Tabor conforme acesso. Continuação para Jerusalém, jantar e hospedagem."),
    day(12,"Jericó · Massada · Mar Morto","Jericó — Massada — Mar Morto","Visita ao Vale do Jordão, Jericó, vista do Monte da Tentação, Massada e experiência no Mar Morto conforme condições locais. Retorno, jantar e hospedagem."),
    day(13,"Jerusalém","Jerusalém Bíblica","Dia dedicado aos principais locais bíblicos de Jerusalém, com celebração e oração. Jantar e hospedagem.",["Monte das Oliveiras","Jardim do Getsêmani","Igreja de Todas as Nações","Monte Sião","Cenáculo","Casa de Caifás","Muro das Lamentações","Igreja de Sant’Ana e Tanque de Betesda","Via Dolorosa","Santo Sepulcro ou Jardim do Túmulo, conforme programação"]),
    day(14,"Jerusalém · Tel Aviv · Brasil","Jerusalém — Tel Aviv — Brasil","Passagem panorâmica por Tel Aviv ou Jaffa conforme horário, traslado ao Aeroporto Ben Gurion e retorno ao Brasil. Chegada a GRU conforme operação aérea e fim dos serviços.")
  ],
  "paris-egito-israel-marco-2027":[
    day(1,"Brasil · Paris","Brasil — Paris","Encontro em GRU, orientações, entrega do Kit VP e embarque para Paris. Pernoite a bordo."),
    day(2,"Paris","Paris","Chegada, recepção e passeio panorâmico pela Cidade Luz. Traslado ao hotel e descanso.",["Torre Eiffel","Arco do Triunfo","Champs-Élysées","Praça da Concórdia","Louvre, área externa","Ópera Garnier","Notre-Dame, área externa","Margens do Sena"]),
    day(3,"Paris · Cairo","Paris — Cairo","Continuação das experiências em Paris e tempo livre. Traslado ao aeroporto e embarque para o Cairo. Recepção, traslado e hospedagem."),
    day(4,"Cairo","Cairo — Pirâmides e Tesouros do Egito","Dia dedicado ao Egito Antigo. Jantar e hospedagem.",["Pirâmides de Gizé","Grande Esfinge","Museu egípcio previsto na operação","Fábrica ou instituto de papiros","Khan El Khalili"]),
    day(5,"Cairo · Sinai","Cairo — Península do Sinai — Experiência do Tabernáculo","Viagem ao Sinai com paradas e explicações sobre a jornada do povo hebreu. Experiência temática do Tabernáculo somente conforme operação confirmada. Preparação para a subida opcional ao Monte Sinai."),
    day(6,"Monte Sinai · Mar Vermelho","Monte Sinai — Mar Vermelho","Subida opcional condicionada à capacidade física, clima e segurança. Continuação para resort no Mar Vermelho, tempo de descanso, jantar e hospedagem."),
    day(7,"Egito · Israel · Galileia","Egito — Israel — Galileia","Procedimentos de fronteira e visitas na Galileia. Jantar e hospedagem.",["Passeio de barco","Cafarnaum","Tabgha","Monte das Bem-Aventuranças","Magdala","Rio Jordão"]),
    day(8,"Nazaré · Monte Tabor · Jerusalém","Nazaré — Monte Tabor — Jerusalém","Nazaré, Basílica da Anunciação, Monte do Precipício e Monte Tabor conforme acesso. Continuação para Jerusalém, jantar e hospedagem."),
    day(9,"Jericó · Massada · Mar Morto","Jericó — Massada — Mar Morto","Jericó, vista do Monte da Tentação, Massada e Mar Morto conforme condições locais. Retorno, jantar e hospedagem."),
    day(10,"Jerusalém","Jerusalém Antiga","Dia dedicado a Jerusalém Antiga. Acesso ao Terraço do Monte do Templo somente mediante autorização local.",["Monte das Oliveiras","Getsêmani","Igreja de Todas as Nações","Muro das Lamentações","Monte Sião","Cenáculo","Casa de Caifás","Igreja de Sant’Ana","Tanque de Betesda","Via Dolorosa","Santo Sepulcro"]),
    day(11,"Jerusalém","Cidade de Davi — Jardim do Túmulo — Museu de Israel","Visitas arqueológicas e espirituais conforme acessos contratados. Jantar e hospedagem.",["Cidade de Davi","Tanque de Siloé, conforme acesso","Jardim do Túmulo","Museu de Israel","Santuário do Livro"]),
    day(12,"Jerusalém","Jerusalém — Experiências complementares","Visitas complementares confirmadas pela operação, momentos de oração e compras. Nenhuma atração adicional é garantida antes da confirmação do fornecedor."),
    day(13,"Jerusalém","Jerusalém — Dia livre","Dia livre para descanso, compras e experiências pessoais, respeitando orientações de segurança e horários do guia."),
    day(14,"Israel · Brasil","Israel — Brasil","Traslado ao Aeroporto Ben Gurion e retorno ao Brasil. Chegada a GRU conforme a malha aérea e fim dos serviços.")
  ],
  "turquia-grecia-2027":[
    day(1,"Brasil · Istambul","Brasil — Istambul","Encontro em GRU, orientações, entrega do Kit VP e embarque para Istambul. Pernoite a bordo."),
    day(2,"Istambul","Istambul","Chegada, recepção, traslado ao hotel, jantar e hospedagem."),
    day(3,"Istambul","Istambul Histórica","Visitas conforme ingressos contratados, jantar e hospedagem.",["Hipódromo Romano","Mesquita Azul","Basílica de Santa Sofia","Palácio de Topkapi ou atração equivalente","Grande Bazar"]),
    day(4,"Istambul · Capadócia","Istambul — Capadócia","Passeio pelo Bósforo e Bazar Egípcio conforme horários. Voo doméstico para a Capadócia, jantar e hospedagem."),
    day(5,"Capadócia","Capadócia","Göreme, Chaminés de Fada, vales, cidade subterrânea prevista e artesanato local. Balão opcional e sujeito ao clima. Jantar e hospedagem."),
    day(6,"Capadócia · Konya · Pamukkale","Capadócia — Konya — Pamukkale","Saída para Konya, visita ao complexo relacionado a Mevlana e continuação para Pamukkale. Jantar e hospedagem."),
    day(7,"Pamukkale · Laodiceia · Éfeso · Kusadasi","Pamukkale — Laodiceia — Éfeso — Kusadasi","Pamukkale, Hierápolis, Laodiceia conforme programação, Éfeso, Biblioteca de Celso, grande teatro e Casa de Maria conforme ingresso. Jantar e hospedagem."),
    day(8,"Kusadasi · Patmos","Kusadasi — Patmos — Cruzeiro","Embarque no cruzeiro e navegação para Patmos. Gruta do Apocalipse e Mosteiro de São João quando incluídos e disponíveis. Pensão e hospedagem a bordo."),
    day(9,"Rodes","Rodes","Visita à cidade medieval e pontos previstos pela excursão contratada. Retorno ao navio, refeições e hospedagem."),
    day(10,"Creta · Santorini","Creta — Santorini","Paradas conforme itinerário do cruzeiro, passeios incluídos, refeições e hospedagem a bordo."),
    day(11,"Atenas","Atenas","Desembarque e visitas a Acrópole, Partenon, Areópago e pontos panorâmicos. Jantar e hospedagem."),
    day(12,"Corinto · Atenas","Corinto — Atenas","Canal de Corinto, sítio arqueológico, Bema de Gálio e referências ao ministério de Paulo. Retorno, jantar e hospedagem."),
    day(13,"Atenas · Brasil","Atenas — Brasil","Café da manhã, tempo livre conforme o voo, traslado ao aeroporto e embarque para o Brasil."),
    day(14,"Brasil","Brasil","Chegada ao Aeroporto Internacional de Guarulhos e fim dos serviços.")
  ],
  "jordania-israel-2027":[
    day(1,"Brasil · Amã","Brasil — Amã","Encontro em GRU e embarque para a Jordânia. Pernoite a bordo."),
    day(2,"Amã","Amã","Chegada, recepção, traslado, jantar e hospedagem em hotel 4 ou 5 estrelas ou similar."),
    day(3,"Amã · Jerash","Amã — Jerash","City tour panorâmico em Amã e visita à antiga Jerash. Jantar e hospedagem."),
    day(4,"Madaba · Monte Nebo · Mar Morto","Madaba — Monte Nebo — Mar Morto","Visita a Madaba, Monte Nebo e região do Mar Morto. Jantar e hospedagem."),
    day(5,"Petra","Petra","Dia dedicado a Petra: Siq, Tesouro, fachadas, tumbas e áreas incluídas. Jantar e hospedagem."),
    day(6,"Wadi Rum · Aqaba","Wadi Rum — Aqaba","Experiência no deserto em veículo apropriado e continuação para Aqaba. Jantar e hospedagem."),
    day(7,"Jordânia · Israel · Galileia","Jordânia — Israel — Galileia","Procedimentos de fronteira, recepção em Israel e viagem para a Galileia. Jantar e hospedagem."),
    day(8,"Galileia","Galileia Bíblica","Passeio de barco, Cafarnaum, Casa de Pedro, Tabgha, Monte das Bem-Aventuranças, Magdala e Rio Jordão. Jantar e hospedagem."),
    day(9,"Nazaré · Monte Tabor · Jerusalém","Nazaré — Monte Tabor — Jerusalém","Nazaré, Basílica da Anunciação, Monte do Precipício e Monte Tabor conforme acesso. Continuação para Jerusalém."),
    day(10,"Jericó · Massada · Mar Morto","Jericó — Massada — Mar Morto","Jericó, vista do Monte da Tentação, Massada e Mar Morto. Jantar e hospedagem em Jerusalém."),
    day(11,"Jerusalém","Jerusalém Antiga","Monte das Oliveiras, Getsêmani, Monte Sião, Cenáculo, Muro das Lamentações, Tanque de Betesda, Via Dolorosa e Santo Sepulcro. Jantar e hospedagem."),
    day(12,"Cidade de Davi · Belém · Jerusalém","Cidade de Davi — Belém — Jardim do Túmulo","Cidade de Davi, áreas arqueológicas previstas, Belém e Campo dos Pastores conforme acesso, Jardim do Túmulo e celebração. Jantar e hospedagem."),
    day(13,"Israel · Brasil","Israel — Brasil","Traslado ao Aeroporto Ben Gurion e retorno. Chegada a GRU conforme a malha aérea e fim dos serviços.")
  ],
  "italia-2027":[
    day(1,"Brasil · Roma","Brasil — Roma","Encontro em GRU e embarque para Roma. Pernoite a bordo."),day(2,"Roma","Roma","Chegada, recepção, traslado, jantar e hospedagem."),
    day(3,"Roma · Vaticano","Roma Cristã — Vaticano","Praça e Basílica de São Pedro, Museus Vaticanos e Capela Sistina quando incluídos, São Paulo Fora dos Muros e pontos panorâmicos. Jantar e hospedagem."),
    day(4,"Roma · Cássia · Assis","Roma — Cássia — Assis","Visita ao Santuário de Santa Rita e continuação para Assis. Jantar e hospedagem."),
    day(5,"Assis","Assis — São Francisco e Santa Clara","Basílicas de São Francisco e Santa Clara, túmulo de São Francisco, Santa Maria Maior e referência a São Carlo Acutis conforme acesso, e centro histórico. Jantar e hospedagem."),
    day(6,"Porciúncula · La Verna · Florença","Porciúncula — La Verna — Florença","Santa Maria dos Anjos e Porciúncula, Santuário de La Verna e viagem para Florença. Jantar e hospedagem."),
    day(7,"Florença","Florença","City tour por Santa Maria del Fiore, Batistério, Piazza della Signoria, Ponte Vecchio e Santa Croce conforme ingresso. Jantar e hospedagem."),
    day(8,"Pádua · Veneza","Pádua — Veneza","Basílica de Santo Antônio e passeio orientado por Veneza. Jantar e hospedagem na região."),
    day(9,"Veneza · Brasil","Veneza — Retorno","Praça e Basílica de São Marcos conforme acesso, tempo livre e traslado ao aeroporto definido na operação. Embarque para o Brasil."),day(10,"Brasil","Brasil","Chegada a GRU e fim dos serviços.")
  ],
  "israel-2027":[
    day(1,"Brasil · Israel","Brasil — Israel","Encontro em GRU e embarque. Pernoite a bordo."),day(2,"Tel Aviv · Galileia","Tel Aviv — Galileia","Chegada, recepção e viagem para a Galileia. Jantar e hospedagem."),
    day(3,"Galileia","Galileia Bíblica","Passeio de barco, Cafarnaum, Tabgha, Monte das Bem-Aventuranças, Magdala e Rio Jordão. Jantar e hospedagem."),
    day(4,"Nazaré · Jericó · Jerusalém","Nazaré — Jericó — Jerusalém","Nazaré, Basílica da Anunciação, Monte do Precipício, passagem por Jericó e chegada a Jerusalém. Jantar e hospedagem."),
    day(5,"Jerusalém","Jerusalém Antiga","Monte das Oliveiras, Getsêmani, Monte Sião, Cenáculo, Muro das Lamentações, Tanque de Betesda, Via Dolorosa e Santo Sepulcro. Jantar e hospedagem."),
    day(6,"Cidade de Davi · Belém · Jerusalém","Cidade de Davi — Belém — Jardim do Túmulo","Cidade de Davi, áreas arqueológicas, Belém e Campo dos Pastores conforme acesso, Jardim do Túmulo e celebração. Jantar e hospedagem."),
    day(7,"Israel · Roma","Israel — Roma","Traslado ao aeroporto e voo para Roma. Recepção, traslado, jantar e hospedagem."),
    day(8,"Roma · Vaticano","Roma — Vaticano","Praça e Basílica de São Pedro, Museus Vaticanos e Capela Sistina quando incluídos, Basílicas Maiores e pontos históricos. Jantar e hospedagem."),
    day(9,"Cássia · Assis","Cássia — Assis","Santuário de Santa Rita, Basílicas de São Francisco e Santa Clara e centro histórico. Jantar e hospedagem."),
    day(10,"Assis · Roma · Brasil","Assis — Roma — Brasil","Visita à Porciúncula, retorno a Roma e embarque para o Brasil."),day(11,"Brasil","Brasil","Chegada a GRU e fim dos serviços.")
  ],
  "emirados-egito-2027":[
    day(1,"Brasil · Dubai","Brasil — Dubai","Encontro em GRU e embarque para Dubai. Pernoite a bordo."),day(2,"Dubai","Dubai","Chegada, recepção, traslado, jantar e hospedagem em hotel 4 ou 5 estrelas ou similar."),
    day(3,"Dubai","Dubai Clássica e Moderna","Al Fahidi, travessia de abra, mercados, Dubai Frame conforme ingresso, Burj Khalifa, Dubai Mall e atração noturna conforme calendário. Jantar e hospedagem."),
    day(4,"Abu Dhabi","Abu Dhabi","Grande Mesquita Sheikh Zayed, Corniche, Emirates Palace panorâmico e Qasr Al Watan ou Louvre Abu Dhabi conforme pacote. Jantar e hospedagem."),
    day(5,"Dubai · Deserto","Dubai — Deserto","Dubai Marina, Palm Jumeirah e áreas modernas. Experiência no deserto com transporte autorizado, atividades e jantar conforme programação."),
    day(6,"Dubai · Cairo","Dubai — Cairo","Traslado, voo para o Cairo, recepção, jantar e hospedagem."),
    day(7,"Gizé · Cairo","Pirâmides — Esfinge — Museu","Complexo de Gizé, Grande Esfinge, Templo do Vale, museu previsto e fábrica de papiros. Jantar e hospedagem."),
    day(8,"Cairo · Luxor","Cairo Histórico — Luxor","Bairro copta, Igreja Suspensa, São Sérgio e Khan El Khalili conforme tempo. Voo ou deslocamento programado para Luxor. Jantar e hospedagem."),
    day(9,"Luxor","Luxor — Margem Ocidental","Vale dos Reis, templo funerário previsto, Colossos de Memnon e ingressos incluídos. Cruzeiro pelo Nilo quando contratado. Refeições e hospedagem."),
    day(10,"Luxor · Edfu","Luxor — Edfu","Templos de Karnak e Luxor e navegação para Edfu conforme programação. Refeições e hospedagem a bordo."),
    day(11,"Edfu · Kom Ombo · Assuã","Edfu — Kom Ombo — Assuã","Templos de Edfu e Kom Ombo e navegação para Assuã. Refeições e hospedagem."),
    day(12,"Assuã · Cairo · Brasil","Assuã — Cairo — Brasil","Visitas previstas em Assuã; Abu Simbel somente se incluído e compatível com o voo. Retorno ao Cairo e conexão para o Brasil."),day(13,"Brasil","Brasil","Chegada a GRU e fim dos serviços.")
  ],
  "israel-egito-2027":[
    day(1,"Brasil · Cairo","Brasil — Cairo","Encontro em GRU e embarque para o Egito. Pernoite a bordo."),day(2,"Cairo","Cairo","Chegada, recepção, traslado, jantar e hospedagem."),
    day(3,"Gizé · Cairo","Pirâmides — Esfinge — Museu","Complexo de Gizé, Grande Esfinge, Templo do Vale, museu previsto, papiros e Khan El Khalili conforme tempo. Jantar e hospedagem."),
    day(4,"Cairo · Sinai","Cairo Bíblico — Sinai","Bairro copta, Igreja Suspensa, São Sérgio e região relacionada à Sagrada Família. Continuação para o Sinai. Jantar e hospedagem."),
    day(5,"Monte Sinai · Mar Vermelho","Monte Sinai — Mar Vermelho","Subida opcional para participantes aptos, Santa Catarina conforme regras locais e continuação para o Mar Vermelho. Jantar e hospedagem."),
    day(6,"Egito · Israel · Galileia","Egito — Israel — Galileia","Procedimentos de fronteira, entrada em Israel e viagem para a Galileia. Jantar e hospedagem."),
    day(7,"Galileia","Galileia Bíblica","Passeio de barco, Cafarnaum, Tabgha, Monte das Bem-Aventuranças, Magdala e Rio Jordão. Jantar e hospedagem."),
    day(8,"Nazaré · Monte Tabor · Jerusalém","Nazaré — Monte Tabor — Jerusalém","Nazaré, Basílica da Anunciação, Monte do Precipício e Monte Tabor conforme acesso. Continuação para Jerusalém."),
    day(9,"Jericó · Massada · Mar Morto","Jericó — Massada — Mar Morto","Jericó, vista do Monte da Tentação, Massada e Mar Morto. Jantar e hospedagem em Jerusalém."),
    day(10,"Jerusalém","Jerusalém Antiga","Monte das Oliveiras, Getsêmani, Monte Sião, Cenáculo, Muro das Lamentações, Tanque de Betesda, Via Dolorosa e Santo Sepulcro. Jantar e hospedagem."),
    day(11,"Jerusalém · Belém · Brasil","Cidade de Davi — Museu de Israel — Belém — Retorno","Cidade de Davi, Museu de Israel e Santuário do Livro, Belém e Campo dos Pastores conforme acesso. Traslado ao Aeroporto Ben Gurion e embarque."),day(12,"Brasil","Brasil","Chegada a GRU e fim dos serviços.")
  ]
};

