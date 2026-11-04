# SafeRoute — Registro de metodologia e desenvolvimento

> Material de apoio para as seções **Metodologia** e **Desenvolvimento** do artigo.
> Todos os números aqui foram medidos sobre a base real e são reproduzíveis
> executando `notebooks/SafeRouteV6.ipynb`. Decisões ainda em aberto estão
> marcadas como tal — não devem ser apresentadas como resultado.

---

## 1. Enquadramento metodológico

O trabalho segue a **Design Science Research Methodology** (DSRM). O artefato
produzido é um sistema que entrega a predição de risco ao motorista comum **antes
da viagem** — o que o distingue dos trabalhos correlatos, que param no modelo
preditivo ou em relatórios dirigidos a autoridades de trânsito.

As etapas cobertas por este registro:

| Etapa DSRM | O que corresponde no projeto |
|---|---|
| Identificação do problema | Motoristas não dispõem de informação sobre o risco dos trechos que vão percorrer |
| Definição dos objetivos | Classificar trechos de rodovias federais por risco, no horário estimado de passagem |
| Projeto e desenvolvimento | Modelo preditivo, serviço de inferência e interface (seções 2 e 3) |
| Demonstração | MVP funcional, com rota real, previsão do tempo real e modelo em produção |
| Avaliação | Sessão de usabilidade com tarefas cronometradas (planejada) |

O desenvolvimento ocorreu em **dois ciclos de projeto**. O primeiro produziu um MVP
de interface com dados simulados, usado para validar a comunicação visual do risco.
O segundo — descrito aqui — substituiu os dados simulados pelo modelo real, o que
exigiu rever a unidade de análise (seção 2.2), construir o serviço de inferência
(seção 3) e reformular a interface para representar dimensões que o mock não tinha
(horário de passagem, clima previsto, ausência de dados).

---

## 2. Metodologia

### 2.1 Fonte de dados

Microdados de acidentes da **Polícia Rodoviária Federal** (PRF), portal de dados
abertos, agrupados por ocorrência, anos de **2021 a 2026** (2026 parcial):
**391.382 registros**.

O pré-processamento trata variações de formato entre os arquivos anuais, que não são
estáveis: nome da coluna de condição meteorológica, formato de data (ISO e
brasileiro), formato de hora e separador decimal. Foram descartados 6 registros
(cabeçalhos repetidos, duplicados por `id` e ocorrências sem classificação) e
anuladas as coordenadas fora dos limites do território brasileiro.

### 2.2 Unidade de análise: o trecho de 5 km

A unidade de risco do sistema é o **trecho**: uma faixa de 5 km de uma rodovia
federal. A escolha equilibra dois requisitos opostos — granularidade suficiente para
ser acionável pelo motorista e massa de dados suficiente para que a taxa de
fatalidade do trecho seja estável.

#### Identificação do trecho e o problema da quilometragem reiniciada

A definição inicial identificava o trecho pelo par `(BR, km)`, por exemplo
`101_KM115`. **Essa chave é ambígua**: a quilometragem das rodovias federais
brasileiras reinicia a cada unidade federativa, de modo que o km 115 da BR-101
existe simultaneamente em nove estados.

A ambiguidade foi quantificada sobre a base completa:

| Métrica | Valor |
|---|---|
| Identificadores `(BR, km)` distintos | 7.580 |
| Identificadores que agregavam mais de uma UF | 2.381 (**31,4%**) |
| Parcela dos acidentes contida nesses identificadores | **63,9%** |
| Caso extremo | um identificador agregando **27 UFs** |

O efeito prático é duplo. Primeiro, as contagens e taxas do trecho passam a
descrever um agregado nacional, não um local: `101_KM115` somava 1.256 acidentes de
SC, RN, PB, ES, PE, SE, RJ, BA e AL. Segundo — e mais grave para o artefato — o
ponto central do trecho, calculado como a mediana das coordenadas dos acidentes que
o compõem, cai entre os estados agregados, fora de qualquer rodovia real. Isso
inviabiliza a associação entre a rota do usuário e os trechos (seção 3.3).

**Correção adotada:** incluir a UF na chave (`SC_101_KM115`). Registros sem UF, sem
BR, sem km, ou com `BR = 0` — valor inválido presente em 986 registros — passam a
não ter trecho associado.

Efeito da correção, medido como a distância de cada acidente ao centro do trecho a
que pertence:

| Acidentes distantes do centro do próprio trecho | Chave `(BR, km)` | Chave `(UF, BR, km)` |
|---|---|---|
| mais de 5 km | 31,8% | **5,7%** |
| mais de 25 km | 26,9% | **1,3%** |

O resíduo de 5,7% corresponde a erros de preenchimento de km ou UF em registros
isolados da própria base da PRF; por ser o centro uma mediana, esses valores não o
deslocam.

A correção elevou o número de trechos de 7.580 para **12.294** e, por tornar as
variáveis históricas descritivas de um local real, **melhorou também o desempenho
preditivo** (seção 2.6).

> **Para o artigo:** este achado é um resultado metodológico com valor próprio.
> Trabalhos que segmentam rodovias federais brasileiras por `(BR, km)` sem
> desambiguar por UF incorrem no mesmo viés, e ele afeta a maioria dos acidentes da
> base.

### 2.3 Variável-resposta e o recorte "pré-viagem"

A variável-resposta é binária: o acidente foi classificado pela PRF como **"Com
Vítimas Fatais"**. O modelo estima, portanto, a **gravidade** condicional — dado que
um acidente ocorra naquele trecho e naquelas condições, qual a chance de ser fatal —
e **não** a probabilidade de ocorrência de um acidente.

Essa distinção é determinante para a interface e está tratada na seção 3.6.

O conjunto de variáveis preditoras é restrito às informações **disponíveis antes da
partida**. Variáveis como causa do acidente, tipo de acidente e número de veículos
envolvidos só existem após a ocorrência e não podem ser enviadas pela interface.
Um segundo modelo, com essas variáveis, foi treinado apenas como referência
comparativa e não integra o sistema.

**Variáveis do modelo pré-viagem** (6 categóricas, 8 numéricas):

| Grupo | Variáveis |
|---|---|
| Horário | `hora_sin`, `hora_cos` (codificação cíclica), `dia_semana_num`, `fase_dia` |
| Histórico do trecho | `acidentes_ano_segmento`, `taxa_fatalidade_segmento`, `risco_relativo_na_br` |
| Características da via | `tipo_pista`, `tracado_via`, `uso_solo` |
| Localização | `uf`, `latitude`, `longitude` |
| Clima | `clima_grupo` |

A hora recebe **codificação cíclica** (seno e cosseno) para que 23h e 0h sejam
próximas no espaço de atributos. A coluna de ano é usada para particionar os dados,
**não** como preditora: modelos baseados em árvores não extrapolam, e incluí-la faria
o modelo tratar qualquer ano futuro como se fosse o último ano de treino.

A **sazonalidade** (mês) foi testada e descartada: altera o volume de acidentes, mas
praticamente não altera a letalidade, que é o que o modelo estima.

### 2.4 Validação temporal

A avaliação usa **partição temporal**, não aleatória, para simular o uso real — o
passado prevendo o futuro:

| Partição | Registros | Taxa de fatalidade |
|---|---|---|
| Treino (2021–2024) | 270.137 | 7,19% |
| Teste (2025) | 72.528 | 7,18% |
| Teste (2026, parcial) | 48.711 | 7,16% |

### 2.5 Variáveis históricas com suavização e cálculo *out-of-fold*

As três variáveis históricas do trecho são a principal fonte de vazamento potencial:
calculadas sobre o mesmo conjunto em que o modelo treina, fariam cada acidente
"ver a si mesmo".

Dois tratamentos foram aplicados:

1. **Cálculo *out-of-fold*** no conjunto de treino: particionamento em 5 dobras, com
   as tabelas históricas de cada dobra ajustadas sobre as demais. Os conjuntos de
   teste recebem as tabelas ajustadas sobre o treino completo.
2. **Suavização bayesiana** da taxa de fatalidade do trecho em direção à taxa da
   própria rodovia, com parâmetro `m = 20`. Isso impede que um trecho com poucos
   acidentes e uma morte apresente taxa de 100%.

A variável `risco_relativo_na_br` é a razão entre a taxa suavizada do trecho e a taxa
da sua rodovia — é ela que sustenta a comunicação **relativa** do risco na interface
("este trecho comparado ao resto desta BR").

### 2.6 Algoritmo, desbalanceamento e desempenho

O classificador é um **`HistGradientBoostingClassifier`** (scikit-learn 1.6.1),
precedido de `OrdinalEncoder` com tratamento explícito de categorias não vistas e
ausentes. Hiperparâmetros: taxa de aprendizado 0,05, máximo de 600 iterações,
31 folhas, regularização L2 1,0, parada antecipada com 30 iterações de paciência.

O desbalanceamento (≈7% de casos positivos) é tratado por `class_weight="balanced"`.
**Consequência metodológica importante:** os escores produzidos ficam inflados e
**não são probabilidades calibradas**. Um escore de 0,70 não significa 70% de chance
de fatalidade. Por isso a interface jamais exibe o escore como porcentagem, apenas o
nível discreto derivado dele.

Desempenho em validação temporal, antes e depois da correção da chave do trecho
(seção 2.2), com todo o restante do procedimento mantido:

| Métrica | Chave `(BR, km)` | Chave `(UF, BR, km)` |
|---|---|---|
| AUC-ROC 2025 | 0,726 | **0,735** |
| PR-AUC 2025 | 0,183 | **0,192** |
| AUC-ROC 2026 (parcial) | 0,721 | **0,724** |

A taxa base de positivos em 2025 é 0,072 — valor de PR-AUC que um modelo sem
informação alcançaria.

Comparação com o modelo de referência "completo", que acrescenta causa do acidente,
tipo de acidente, sentido da via e número de veículos:

| Modelo | AUC-ROC 2025 | PR-AUC 2025 | AUC-ROC 2026 (parcial) |
|---|---|---|---|
| **Pré-viagem** (em produção) | 0,735 | 0,192 | 0,724 |
| Completo (referência) | 0,850 | 0,374 | 0,843 |

A diferença quantifica **o custo informacional de predizer antes da viagem**: as
variáveis que mais discriminam a gravidade só existem depois que o acidente ocorre,
e portanto são inutilizáveis pelo artefato. O modelo completo serve como teto de
referência, não como alternativa.

O modelo final, que vai para o sistema, é retreinado sobre **todos os anos
(2021–2026)**, convergindo em 155 iterações.

### 2.7 Sensibilidade do trecho a chuva e neblina

Um achado da análise exploratória orientou o tratamento do clima: **na base da PRF, a
chuva apresenta letalidade menor que o céu claro**, provavelmente porque os
condutores reduzem a velocidade. A chuva aumenta a *quantidade* de acidentes, mas o
modelo estima a *gravidade* condicional. A neblina é a única condição que se destaca
em letalidade.

Usar o escore cru produziria a mensagem "está chovendo, seu risco diminuiu" —
incorreta do ponto de vista do objetivo do artefato e potencialmente perigosa.

A solução foi medir, por trecho, se uma condição climática pesa
**desproporcionalmente** em seu histórico. O índice de sensibilidade é a razão entre
a proporção de acidentes do trecho sob aquela condição (suavizada, `m = 30`) e a
mesma proporção na sua rodovia. Um trecho é sinalizado quando o índice é ≥ 1,5 e há
um mínimo de casos (5 para chuva, 3 para neblina).

**Validação da sinalização:** os trechos foram sinalizados usando apenas 2021–2024 e
verificados em 2025:

| Condição | Trechos sinalizados | % de acidentes sob a condição, nos trechos sinalizados | nos demais trechos |
|---|---|---|---|
| Chuva | 451 | **30,1%** | 11,0% |
| Neblina | 122 | **1,8%** | 0,7% |

A sinalização generaliza para o período seguinte, o que justifica usá-la como regra
de alerta. No modelo final (todos os anos) há 616 trechos sensíveis à chuva e 220 à
neblina, de 12.294.

### 2.8 Calibração dos níveis de risco — **decisão em aberto**

Os quatro níveis apresentados ao usuário (Baixo, Médio, Alto, Crítico) derivam de
cortes aplicados ao escore. Os cortes vigentes são **quantis nacionais** (50, 80 e 95)
calculados sobre uma grade de todos os trechos × 24 horas × 7 dias da semana, com céu
claro: `0,649 / 0,777 / 0,850`.

**Esta calibração apresenta um problema identificado e ainda não resolvido.** Como
`uf`, latitude e longitude são preditoras, o modelo aprende corretamente que um
acidente no Norte e Nordeste tem probabilidade bem maior de ser fatal que no Sul e
Sudeste. Combinada a cortes nacionais, essa diferença regional domina a
classificação, e o nível passa a funcionar como um indicador de estado:

| Percentual de trechos que alcançam Alto ou Crítico em seu pior horário |
|---|
| **0%** — ES, MS, SC, RJ, SP, RS |
| 1% — PR, MG · 9% — DF · 12% — MT · 18% — GO · 26% — SE |
| 31% a 60% — RO, AC, AP, RN, AL, PB |
| 70% a 87% — RR, AM, BA, PE, TO, CE, PI |
| **95%** — PA, MA |

O resultado contraria o princípio de comunicação adotado no projeto — informar que
"este trecho é mais perigoso que o restante desta rodovia" — e compromete a etapa de
Avaliação: na rota de demonstração Chapecó–Florianópolis nenhum trecho alcança
"Alto" em qualquer horário de partida, de modo que a tarefa "encontre o trecho mais
perigoso da rota" fica sem resposta.

Há variação suficiente dentro de cada estado; o problema está em onde os cortes
são aplicados. Simulação com os mesmos quantis calculados **dentro de cada UF**,
para os 136 trechos da BR-282 em Santa Catarina:

| Cortes | Baixo | Médio | Alto | Crítico |
|---|---|---|---|---|
| Nacionais (vigentes) | 133 | 3 | 0 | 0 |
| Por UF | 45 | 63 | 19 | 9 |

As alternativas em avaliação são: (a) cortes por UF; (b) cortes por rodovia, mais
fiéis ao enunciado "comparado a esta rodovia", porém instáveis em BRs curtas;
(c) manter os cortes nacionais e explicitar na interface que a comparação é nacional.

> **Para o artigo:** enquanto não houver decisão, descrever a calibração atual e o
> achado como uma limitação identificada, não como resultado consolidado.

---

## 3. Desenvolvimento

### 3.1 Arquitetura

O sistema tem duas partes:

- **Serviço de inferência** — Python com FastAPI. Escolhido porque o modelo é um
  artefato scikit-learn; reimplementá-lo em outra linguagem introduziria divergência
  entre o que foi validado no notebook e o que é executado em produção.
- **Interface** — aplicação React (Vite) com Leaflet para o mapa.

O notebook exporta dois arquivos, consumidos pelo serviço sem transformação:
`saferoute_modelo.joblib` (pipeline treinado, cortes de nível, mapeamento de códigos
meteorológicos e parâmetros das regras de clima) e `saferoute_trechos.csv`
(12.294 trechos, com as variáveis históricas pré-calculadas).

Três restrições de projeto foram adotadas para manter a correspondência entre o
notebook e o sistema:

1. **O serviço não recalcula nenhuma variável do modelo.** Alterações são feitas no
   notebook, que reexporta os artefatos.
2. **Cortes de nível, mapeamento meteorológico e parâmetros das regras de clima são
   lidos do artefato**, nunca codificados no serviço — mudam a cada retreino.
3. **A versão do scikit-learn é fixada** na mesma usada no treino (1.6.1). Artefatos
   `joblib` de modelos scikit-learn não têm garantia de compatibilidade entre versões.

O identificador do trecho é tratado como **chave opaca** pelo serviço, que lê BR, km
e UF de colunas próprias. Foi essa decisão que permitiu alterar o formato da chave
(seção 2.2) sem modificar o código do serviço.

### 3.2 Fluxo de uma consulta

```
origem, destino, horário de saída
   │
   ├─ 1. Roteamento ──────────── geometria e duração acumulada
   ├─ 2. Rota → trechos ──────── associação espacial e ETA de cada trecho
   ├─ 3. Clima ───────────────── previsão por ponto, na hora estimada de passagem
   ├─ 4. Fase do dia ─────────── nascer e pôr do sol locais
   ├─ 5. Inferência ──────────── uma chamada com todos os trechos da rota
   └─ 6. Regras de clima ─────── ajuste de nível e geração de alertas
```

### 3.3 Associação entre a rota e os trechos

Esta é a etapa de maior risco técnico: o serviço de roteamento devolve coordenadas,
enquanto o modelo opera sobre trechos identificados por rodovia e quilometragem.

O procedimento adotado:

1. A geometria da rota é **densificada a aproximadamente 1 km**. Amostragem mais
   esparsa saltaria trechos inteiros, já que cada trecho tem 5 km.
2. Cada ponto busca o **centro de trecho mais próximo**, por distância de haversine,
   usando uma `BallTree` com métrica esférica sobre as coordenadas em radianos.
3. Associações a mais de **3 km** são descartadas: o ponto está fora de rodovia
   federal ou em trecho sem histórico.
4. Associações isoladas cuja BR difere da dos dois pontos vizinhos são descartadas,
   evitando que a rota "salte" para uma rodovia paralela próxima.
5. Pontos consecutivos associados ao mesmo trecho formam um segmento contínuo, cuja
   geometria é recortada da própria rota — o traçado exibido no mapa é o da via real,
   não uma reta entre centros de trecho.

O **horário estimado de passagem (ETA)** de cada trecho é obtido por interpolação da
duração acumulada da rota até o ponto de entrada no trecho. É esse horário, e não o
horário da consulta, que alimenta as variáveis temporais do modelo.

Trechos não associados são devolvidos como **"sem dados"**, com a geometria
correspondente, para que a interface os represente explicitamente (seção 3.6).

### 3.4 Previsão do tempo e fase do dia

A previsão vem da **Open-Meteo** (gratuita para uso não comercial, sem chave de
acesso), consultada a cada **40 km** ao longo da rota. Um valor único por estado
ocultaria exatamente os fenômenos de interesse: na rota Chapecó–Florianópolis, a
serra de Lages tem regime de neblina distinto do oeste e do litoral.

Cada trecho utiliza a previsão do ponto mais próximo, **na hora do seu ETA**. Os
códigos WMO retornados são convertidos para as quatro categorias do modelo (claro,
nublado, chuva, neblina) pelo mapeamento exportado no artefato, garantindo que o
sistema use exatamente o mesmo agrupamento do treino.

Todos os horários são tratados no **fuso local de cada ponto**: uma rota pode cruzar
fusos, e tanto a hora quanto a fase do dia são variáveis do modelo.

A **fase do dia** é derivada do nascer e do pôr do sol locais, também fornecidos pela
Open-Meteo: amanhecer e anoitecer são janelas de uma hora em torno de cada evento.
Isso é mais preciso que a aproximação por faixa de horário usada no notebook, que
permanece como alternativa quando a API não responde.

Para respeitar os limites de uso, as respostas são mantidas em cache por coordenada
arredondada a 0,1° (≈ 11 km) durante uma hora, e as consultas de todos os pontos de
uma rota são agrupadas em uma única requisição.

### 3.5 Regras de clima

Decorrem do achado da seção 2.7 e são aplicadas após a inferência:

1. **O clima nunca reduz o risco.** O escore exibido é o máximo entre o escore
   calculado com o clima previsto e o calculado com céu claro.
2. **Trecho sensível à condição prevista sobe um nível** e gera alerta destacado,
   informando quantas vezes a condição pesa mais naquele trecho que na média da
   rodovia.
3. **Trecho não sensível** gera apenas alerta informativo, sem alterar o nível.
4. **Previsão indisponível** — por falha da API ou por ETA além do horizonte de
   previsão — usa céu claro como referência, sem alerta, e a interface informa a
   indisponibilidade.

### 3.6 Interface

A interface precisou representar três distinções que o MVP com dados simulados não
expressava:

**Gravidade separada de frequência.** O modelo estima gravidade. Trechos urbanos
movimentados concentram muitos acidentes de baixa letalidade e aparecem em verde —
correto para a pergunta do modelo, enganoso como única informação. A cor do trecho
indica o nível do modelo; a frequência (`acidentes_por_ano`) aparece como
**indicador numérico separado** no painel do trecho, com destaque visual acima de 20
acidentes por ano, acompanhada da explicação de que a cor representa gravidade e não
quantidade.

**Ausência de dados.** Vias estaduais, municipais e trechos sem histórico são
desenhados em **cinza**, nunca omitidos nem pintados como seguro. O resumo informa o
percentual da rota efetivamente analisado.

**O risco varia ao longo da viagem.** Uma **linha do tempo** exibe a rota do início
ao fim, com cada trecho em sua posição e cor, e marcações nos pontos em que a viagem
muda de fase do dia. É o elemento que torna visível o papel do horário de partida:
quem sai de Chapecó às 14h chega à serra próximo ao anoitecer e ao litoral à noite.

Os demais elementos: formulário com origem, destino e **horário de saída**; mapa com
a rota colorida por trecho; legenda em linguagem leiga; painel do trecho com nível,
ETA, clima previsto, alertas e estatísticas históricas; lista de alertas de clima
ordenada com os trechos sensíveis primeiro; e resumo com nível máximo e contagem por
nível.

Princípios de comunicação observados: o escore nunca é exibido como porcentagem; o
risco é sempre comunicado de forma relativa; e um aviso permanente informa que a
ferramenta é de conscientização, baseada em dados históricos, e não substitui a
atenção às condições reais da via.

### 3.7 Verificação

| O que foi verificado | Como | Resultado |
|---|---|---|
| Fidelidade do serviço ao modelo | Reprodução da grade trecho × hora × dia e comparação com os valores exportados pelo notebook | Diferença máxima de 1,1 × 10⁻¹⁶ no escore de pior horário |
| Regras de clima | Mesmos trechos e cenários da simulação do notebook, via API | Saídas idênticas nas quatro regras |
| Efeito do horário de partida | Mesma rota às 05h, 14h e 22h | Trechos de nível Médio: 0, 15 e 23 — compatível com a maior letalidade noturna |
| Associação rota → trecho | Cobertura da rota Chapecó–Florianópolis | 69,6% com a chave antiga; **96,7%** com a chave corrigida |
| Interface | Execução ponta a ponta no navegador | Rota, linha do tempo, alertas e painel do trecho operando sobre dados reais |

---

## 4. Limitações

- **Calibração dos níveis** (seção 2.8): decisão em aberto, atualmente fazendo o
  nível funcionar como proxy de região.
- **Ausência de dados de volume de tráfego.** Sem exposição, "muitos acidentes" não
  distingue trecho perigoso de trecho movimentado. O DNIT publica contagens de
  tráfego em rodovias federais — avaliar disponibilidade para normalização.
- **Precisão do centro do trecho.** O centro é a mediana das coordenadas dos
  acidentes registrados; em trechos com poucos registros pode ser impreciso.
- **Escores não calibrados** como probabilidade, por construção (seção 2.6).
- **Serviço de roteamento.** O servidor público de demonstração do OSRM tem limite de
  uso e não é destinado a produção; uma instância própria é necessária para
  publicação do artefato.
- **O modelo estima gravidade, não ocorrência.** Um trecho de nível Baixo não é um
  trecho seguro.

---

## 5. Reprodutibilidade

| Item | Referência |
|---|---|
| Notebook | `notebooks/SafeRouteV6.ipynb` — execução completa em ≈190 s |
| Base | `data/datatran2021-2026.csv` (PRF, dados abertos) |
| Artefatos exportados | `backend/modelo/saferoute_modelo.joblib`, `backend/modelo/saferoute_trechos.csv` |
| Serviço | `backend/` — FastAPI; instruções em `backend/README.md` |
| Interface | `frontend/` — React e Vite |
| Semente aleatória | fixada no notebook; partição temporal, não aleatória |
| Versão do scikit-learn | 1.6.1, fixada em `backend/requirements.txt` |

**Síntese quantitativa do artefato:** 12.294 trechos de 5 km, em 125 rodovias
federais e 27 unidades federativas, cobrindo 390.390 acidentes e 28.097 ocorrências
com vítimas fatais entre 2021 e 2026.
