# Backend do SafeRoute

API em FastAPI que serve o modelo de risco exportado pelo notebook.

## Como rodar

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Documentação interativa em <http://localhost:8000/docs>.

> **A versão do scikit-learn precisa ser a mesma do Colab** (hoje `1.6.1`, fixada no
> `requirements.txt`). Um `joblib` de modelo sklearn só carrega com segurança na
> versão em que foi gerado — confira com `import sklearn; sklearn.__version__`.

## Arquivos do modelo

`modelo/` recebe os dois arquivos exportados pela última célula do notebook:

| Arquivo | Conteúdo |
|---|---|
| `saferoute_modelo.joblib` | pipeline treinado + cortes de nível, mapa WMO e regras de clima |
| `saferoute_trechos.csv` | um registro por trecho, com as features históricas pré-calculadas |

Para atualizar, basta substituir os dois arquivos e reiniciar o servidor. O código
trata `segmento_id` como chave opaca e lê `br`, `km_inicio`, `km_fim` e `uf` das
colunas, então mudanças no formato da chave não exigem ajuste aqui.

Cortes de nível, mapa WMO e regras de clima são **lidos do joblib**, nunca
codificados: eles mudam a cada retreino.

## Endpoints

| Método | Caminho | Para quê |
|---|---|---|
| `GET` | `/api/saude` | metadados do modelo carregado (cortes, métricas, anos de treino) |
| `GET` | `/api/trechos` | visão padrão do mapa: risco de cada trecho no seu pior horário |
| `POST` | `/api/trechos/risco` | avalia trechos conhecidos num horário e clima fixos, sem APIs externas |
| `POST` | `/api/risco-rota` | fluxo completo: rota → trechos → clima → modelo |

```bash
curl -X POST http://localhost:8000/api/risco-rota \
  -H 'Content-Type: application/json' \
  -d '{"origem":{"lat":-27.10,"lon":-52.61},
       "destino":{"lat":-27.59,"lon":-48.55},
       "partida":"2026-10-21T14:00:00-03:00"}'
```

## Como uma consulta de rota é montada

1. **Roteamento** — OSRM devolve a geometria e a duração acumulada ao longo dela.
2. **Rota → trechos** — a geometria é densificada a ~1 km e cada ponto busca o centro
   de trecho mais próximo (`BallTree` haversine, raio de 3 km). Associações isoladas
   cuja BR difere dos vizinhos são descartadas, para não "pular" para uma rodovia
   paralela. Pontos fora do raio viram **trechos sem dados**, exibidos em cinza.
3. **Clima** — Open-Meteo, num ponto a cada 40 km, na **hora estimada de passagem**.
   Cada trecho usa o ponto de clima mais próximo. As respostas ficam em cache por
   coordenada arredondada (~11 km) durante uma hora.
4. **Fase do dia** — nascer e pôr do sol da Open-Meteo; na falta deles, a aproximação
   por hora usada no notebook.
5. **Modelo** — uma única chamada a `predict_proba` com todos os trechos da rota.

Horários são sempre o **horário local de cada ponto** (`timezone=auto`): uma rota pode
cruzar fusos, e tanto a hora quanto a fase do dia são features do modelo.

## Regras de clima

No histórico da PRF, a chuva tem letalidade **menor** que céu claro — provavelmente
porque as pessoas desaceleram. Usar o score cru faria o mapa dizer "está chovendo,
seu risco caiu". Por isso:

1. **O clima nunca reduz o risco:** score exibido = `max(score com o clima previsto, score com "claro")`.
2. **Trecho sensível + condição prevista** → sobe um nível e gera alerta.
3. **Trecho não sensível** → apenas alerta informativo, sem mudar o nível.
4. **Previsão indisponível** → usa "claro" como referência e avisa na interface.

## Variáveis de ambiente

| Variável | Padrão | Para quê |
|---|---|---|
| `SAFEROUTE_OSRM_URL` | `https://router.project-osrm.org` | instância do OSRM |
| `SAFEROUTE_ORIGENS` | `http://localhost:5173,http://127.0.0.1:5173` | origens liberadas no CORS |

> O servidor público de demonstração do OSRM tem limite de uso e **não é para
> produção**. Antes de publicar, suba uma instância própria ou troque o serviço.
