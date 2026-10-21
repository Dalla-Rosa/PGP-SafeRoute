# SafeRoute — Frontend (MVP)

Mapa interativo que mostra o nível de risco dos trechos de rodovias federais em uma
rota origem → destino, com estatísticas por trecho.

**Stack:** React 18 + Vite, Leaflet (react-leaflet), mapa base CARTO/OpenStreetMap,
busca de endereços via Nominatim e rotas via OSRM (serviços públicos, sem chave).

## Rodando

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173.

## Como funciona

1. Origem e destino são geocodificados no **Nominatim** e a rota é traçada no **OSRM**.
2. Os segmentos de risco (`BR` + faixa de 5 km) que estão a até 300 m da rota são
   selecionados e ordenados pela posição na viagem (`src/services/api.js`).
3. O mapa pinta cada segmento pela cor do `nivel_risco`. Partes da rota sem dados
   (vias não federais) ficam em cinza.
4. Ao clicar num trecho, o painel mostra o risco **relativo à própria BR**
   (`risco_relativo_na_br`), estatísticas e dicas em linguagem simples.

Sem rota traçada, o mapa mostra todos os segmentos disponíveis (modo explorar).

## Dados

Enquanto a API da Sprint 3 não existe, os dados vêm de
`src/data/segmentos.mock.json`, no formato do contrato:

```json
{
  "segmento_id": "116_KM225",
  "br": "116",
  "km_inicio": 225,
  "km_fim": 230,
  "uf": "SP",
  "municipio": "Registro",
  "coordenadas": [[-23.48, -46.54], [-23.50, -46.56]],
  "nivel_risco": "Alto",
  "score_risco": 0.78,
  "risco_relativo_na_br": 1.76,
  "total_acidentes": 20,
  "taxa_fatalidade": 0.10,
  "estatisticas": {
    "causa_mais_comum": "Velocidade incompatível",
    "fase_dia_critica": "Plena Noite",
    "tipo_pista": "Simples",
    "tracado_via": "Curva; Declive",
    "condicao_meteorologica": "Chuva"
  }
}
```

`municipio`, `estatisticas.tracado_via` e `estatisticas.condicao_meteorologica` são
campos **opcionais** adicionados ao contrato; a interface funciona sem eles.

> ⚠️ **O mock é fictício.** A geometria é real (rotas de exemplo traçadas no OSRM e
> fatiadas em 5 km) e município/UF vêm do Nominatim, mas os **KMs e todos os números de
> risco são simulados**. Só cobre as rotas de exemplo (SP→Curitiba, SP→Rio,
> Curitiba→Florianópolis, Florianópolis→Porto Alegre, Chapecó→Porto Alegre,
> BH→Rio). Para regenerar: `npm run gerar-mock`.

### Ligando na API real

Crie `frontend/.env` com:

```
VITE_API_URL=http://localhost:8000
```

O frontend passa a chamar `GET {VITE_API_URL}/segmentos`, que deve devolver a lista de
segmentos no formato acima. As faixas de nível e os textos para o motorista ficam em
`src/services/risco.js`.

## Estrutura

```
src/
  App.jsx                 estado da tela (rota, trecho selecionado)
  components/
    FormRota.jsx          origem/destino + rotas de exemplo
    Mapa.jsx              Leaflet: rota, segmentos coloridos, marcadores A/B
    ResumoRota.jsx        manchete, barra de risco da viagem, pontos de atenção
    DetalheTrecho.jsx     estatísticas e dicas do trecho selecionado
    Legenda.jsx
  services/
    api.js                dados (mock/API), Nominatim, OSRM, cruzamento rota × segmentos
    risco.js              cores, faixas e textos de cada nível de risco
    geo.js                distâncias e projeção ponto → linha
  data/segmentos.mock.json
scripts/gerar-mock.mjs    gera o mock a partir de rotas reais
```
