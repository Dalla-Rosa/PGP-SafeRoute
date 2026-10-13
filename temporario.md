1. Cinco anos de dados (2021–2025)

É a melhoria de maior impacto. Hoje cada trecho tem em média cerca de 12 acidentes, então uma única morte muda muito a taxa do trecho. Com cinco anos, a média sobe para algo perto de 60 acidentes por trecho e as taxas ficam muito mais estáveis. Além disso, cinco anos permitem a validação temporal: treinar com 2021–2024 e testar em 2025. Isso simula o uso real (o passado prevendo o futuro) e é mais convincente para o artigo do que o split aleatório atual.

Dois cuidados:

Os arquivos da PRF mudam de formato entre anos. Algumas coisas que podem variar são o nome da coluna de clima, o formato da data e o encoding. A carga e a célula de checagem que montamos já tratam isso. Rodem a checagem para cada arquivo separadamente antes de juntar, assim um ano problemático aparece logo.
Usem a coluna ano para organizar os dados, não como variável preditiva. Ela serve para o split temporal e para os pesos (próximo ponto). Se ela entrar como feature, o modelo pode aprender “anos” em vez de padrões de risco. E modelos de árvore não extrapolam: em 2026, ele trataria tudo como se fosse 2025.
2. Peso maior para o mês atual

Entendi que aqui há duas ideias misturadas, e vale separá-las.

A primeira é sazonalidade (“outubro se parece com outros outubros”). O modelo já recebe mes como variável. Na hora da consulta, o sistema envia o mês atual e o modelo já aplica o padrão daquele mês. Por isso essa parte não precisa de peso extra.

A segunda é recência (“dados recentes valem mais que os antigos”). Essa faz muito sentido, e o lugar onde ela mais importa é a taxa de fatalidade do trecho. Imaginem um trecho que foi duplicado em 2023: o histórico de 2021 descreve uma estrada que não existe mais. A forma padrão de fazer isso é dar um peso que decai com a idade do registro, por exemplo um acidente de dois anos atrás valendo metade de um atual.

Minha sugestão é tratar isso como um experimento do artigo: comparar a versão sem peso com versões de decaimento mais rápido e mais lento, medindo o resultado no teste de 2025. Se o peso melhorar o AUC, vocês têm um resultado. Se não melhorar, também têm.

Um detalhe técnico: o RandomOverSampler não repassa pesos por registro ao classificador. Para usar pesos, ele precisa sair do pipeline e o balanceamento fica só com o class_weight. Isso também resolve a redundância que comentei antes (os dois faziam o mesmo trabalho em dobro).

3. API meteorológica

Primeiro, uma expectativa a calibrar. Nos seus próprios dados, o clima é um preditor fraco de gravidade. Chuva tem letalidade menor que céu claro (6,2% contra 7,4%), provavelmente porque na chuva as pessoas reduzem a velocidade. A chuva aumenta a quantidade de acidentes, mas o modelo atual mede a gravidade dado que o acidente aconteceu. Só neblina se destaca (10,9%). Então a API vale a pena, principalmente para alertas ao usuário, mas não esperem que ela mude muito o score de risco.

Sobre as três dúvidas de vocês:

Quando consultar: a cada rota criada, com cache. Usar a primeira rota do dia como referência não funciona, porque o tempo muda em poucas horas e alguém pode consultar de manhã e viajar à noite. Para não estourar o limite de requisições, guardem a resposta por região e hora durante cerca de uma hora e reutilizem.

Abrangência: nem o estado inteiro, nem o Brasil todo, e sim pontos ao longo do trajeto. O exemplo de vocês mostra bem o porquê. Chapecó–Florianópolis pela BR-282 tem uns 550 km e passa pelo oeste, pela serra de Lages (famosa por neblina) e pelo litoral. Um único valor para Santa Catarina inteira esconderia exatamente a neblina da serra. O caminho é amostrar um ponto a cada 30–50 km da rota, o que dá algo entre 12 e 18 pontos, e consultar todos.

Duração do trajeto: sim, e esse é o ponto mais valioso de todo o brainstorming. Para cada ponto, calcula-se o horário estimado de chegada (saída + tempo de viagem até ali) e usa-se a previsão daquela hora. Esse mesmo cálculo também dá a hora e a fase do dia em cada trecho, que no seu modelo pesam muito mais que o clima. Alguém que sai de Chapecó às 14h chega à serra perto do anoitecer e ao litoral já de noite. O mapa pode mostrar o risco subindo ao longo da viagem. É um diferencial forte para o artigo.

Sugestão de API: a Open-Meteo. Até onde sei, é gratuita para uso não comercial, não exige chave, tem previsão por hora (inclusive visibilidade, útil para neblina) e aceita várias coordenadas numa mesma requisição. Confirmem esses detalhes na documentação atual. Também precisa ser decidido antes de retreinar: as categorias da PRF (Céu Claro, Nublado, Garoa/Chuvisco, Nevoeiro/Neblina…) têm que ser agrupadas em poucas categorias que a API consiga fornecer, como claro, nublado, chuva e neblina. O modelo precisa ser treinado com as mesmas categorias que vai receber na hora do uso.

4. Trocar o mock pelo modelo real

Aqui o ponto do “antes da viagem” se torna obrigatório. A tela não tem como enviar causa_acidente, tipo_acidente ou veiculos, porque essas informações só existem depois do acidente. Então o modelo que vai para produção precisa ser a versão pré-viagem, que eu sugeri na mensagem anterior. Ela usaria só:

o trecho: histórico, tipo de pista e traçado mais comuns ali, tirados dos próprios dados;
o horário e a data: hora e fase do dia no horário de chegada ao trecho, dia da semana e mês;
o clima: a previsão para aquele ponto e hora.

Como isso se encaixa no sistema:

Planning a layout for a flowchart diagram.

Três observações práticas sobre esse fluxo:

Façam o backend responder no mesmo formato JSON do mock. O Contexto.md já define esse formato. Assim, a troca do mock pelo modelo real no frontend se resume a mudar de onde os dados vêm, sem reescrever a tela. O modelo treinado é exportado do Colab com joblib, junto com a tabela de trechos, e carregado num backend simples em Python, como FastAPI. Cada rota gera uma única chamada com todos os trechos, e não uma chamada por trecho.

A peça mais difícil é a associação ponto → trecho, então planejem cedo. O serviço de rotas devolve coordenadas, mas o modelo pensa em “BR-282, km 215”. Os seus próprios dados resolvem isso: cada trecho tem as coordenadas dos acidentes que aconteceram nele. Dá para calcular um ponto central por trecho e, para cada ponto da rota, buscar o trecho mais próximo dentro de um raio de poucos km. Pontos fora de qualquer rodovia federal (área urbana, estrada estadual) ficam simplesmente sem classificação.

Existe uma alternativa mais simples, se o prazo apertar. Em vez de rodar o modelo a cada consulta, dá para pré-calcular uma tabela com o risco de cada trecho para cada combinação de fase do dia e clima, e o sistema só consulta essa tabela. Fica mais rápido e mais robusto. A contrapartida é menos flexibilidade, e o argumento de “modelo respondendo em tempo real” no artigo fica mais fraco.

Ordem sugerida

Tudo que vem depois depende de quais variáveis o modelo usa. Por isso o modelo vem primeiro:

Notebook: juntar os cinco anos e validar cada arquivo; calcular a taxa do trecho de forma out-of-fold, com suavização e peso por recência; agrupar as categorias de clima; treinar o modelo pré-viagem e compará-lo com o completo; fazer a validação temporal (treino 2021–2024, teste 2025); exportar o modelo.
Backend: endpoint que recebe a rota e devolve o risco por trecho, incluindo a associação ponto → trecho. Nesta etapa, o clima ainda pode ser fixo.
API de clima: integração com horário de chegada e cache.
Frontend: trocar o mock pela chamada ao backend.
