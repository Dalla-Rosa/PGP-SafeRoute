// Gera src/data/segmentos.mock.json — dados FICTÍCIOS de risco por segmento,
// no formato do contrato (Contexto.md, seção 5), enquanto a API da Sprint 3
// não existe.
//
// A geometria é real: cada rota de demonstração é traçada no OSRM e os trechos
// em BR são fatiados em segmentos de 5 km. Município/UF vêm do Nominatim
// (reverse geocoding). Já os KMs e todos os números de risco são simulados.
//
// Uso: npm run gerar-mock   (leva alguns minutos por respeitar o limite do Nominatim)

import { readFile, writeFile } from 'node:fs/promises'

const ROTAS_DEMO = [
  { nome: 'São Paulo → Curitiba', pontos: [[-46.633, -23.550], [-49.273, -25.428]] },
  { nome: 'São Paulo → Rio de Janeiro', pontos: [[-46.633, -23.550], [-43.172, -22.906]] },
  { nome: 'Curitiba → Florianópolis', pontos: [[-49.273, -25.428], [-48.548, -27.595]] },
  { nome: 'Florianópolis → Porto Alegre', pontos: [[-48.548, -27.595], [-51.230, -30.033]] },
  { nome: 'Chapecó → Porto Alegre', pontos: [[-52.616, -27.100], [-51.230, -30.033]] },
  { nome: 'Belo Horizonte → Rio de Janeiro', pontos: [[-43.938, -19.920], [-43.172, -22.906]] },
]

const TAMANHO_SEGMENTO_M = 5000
const USER_AGENT = 'SafeRoute-UFFS/0.1 (projeto academico)'

// ---------- utilidades ----------

let semente = 20251
function aleatorio() {
  // mulberry32: determinístico, para o mock ser reproduzível
  semente |= 0
  semente = (semente + 0x6d2b79f5) | 0
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function escolherPonderado(opcoes) {
  const total = opcoes.reduce((s, [, p]) => s + p, 0)
  let r = aleatorio() * total
  for (const [valor, p] of opcoes) {
    if ((r -= p) <= 0) return valor
  }
  return opcoes[opcoes.length - 1][0]
}

function distanciaM([lon1, lat1], [lon2, lat2]) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const arred = (n, casas) => Number(n.toFixed(casas))

// ---------- 1. traçar rotas e extrair trechos em BR ----------

async function tracarRota(pontos) {
  const coords = pontos.map((p) => p.join(',')).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=true&geometries=geojson`
  const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  const json = await resp.json()
  if (json.code !== 'Ok') throw new Error(`OSRM: ${json.code}`)
  return json.routes[0].legs.flatMap((leg) => leg.steps)
}

// Agrupa passos consecutivos da mesma BR em "corridas" contínuas de coordenadas.
function extrairCorridasBR(passos) {
  const corridas = []
  let atual = null
  for (const passo of passos) {
    const br = passo.ref?.match(/BR-(\d+)/)?.[1]
    if (!br) {
      atual = null
      continue
    }
    if (!atual || atual.br !== br) {
      atual = { br, coords: [] }
      corridas.push(atual)
    }
    atual.coords.push(...passo.geometry.coordinates)
  }
  return corridas.filter((c) => c.coords.length > 1)
}

// Fatia uma corrida em pedaços de ~5 km.
function fatiar(coords) {
  const fatias = []
  let fatia = [coords[0]]
  let acumulado = 0
  for (let i = 1; i < coords.length; i++) {
    const d = distanciaM(coords[i - 1], coords[i])
    acumulado += d
    fatia.push(coords[i])
    if (acumulado >= TAMANHO_SEGMENTO_M) {
      fatias.push(fatia)
      fatia = [coords[i]]
      acumulado = 0
    }
  }
  if (acumulado > TAMANHO_SEGMENTO_M * 0.4) fatias.push(fatia)
  return fatias
}

// Reduz pontos muito próximos para deixar o JSON leve.
function simplificar(coords, minM = 120) {
  const saida = [coords[0]]
  for (let i = 1; i < coords.length - 1; i++) {
    if (distanciaM(saida[saida.length - 1], coords[i]) >= minM) saida.push(coords[i])
  }
  saida.push(coords[coords.length - 1])
  return saida
}

// ---------- 2. simular indicadores de risco ----------

const CAUSAS = [
  ['Velocidade incompatível', 4],
  ['Ausência de reação do condutor', 5],
  ['Reação tardia ou ineficiente do condutor', 4],
  ['Acessar a via sem observar a presença dos outros veículos', 3],
  ['Ultrapassagem indevida', 2],
  ['Condutor dormindo', 2],
  ['Ingestão de álcool pelo condutor', 2],
  ['Pista escorregadia', 1.5],
  ['Manobra de mudança de faixa', 2],
]
const TRACADOS = [
  ['Reta', 6],
  ['Curva', 3],
  ['Declive', 1.5],
  ['Curva; Declive', 1],
  ['Aclive', 1],
]
const CLIMAS = [
  ['Céu Claro', 6],
  ['Nublado', 2],
  ['Chuva', 2],
  ['Nevoeiro/Neblina', 0.6],
  ['Garoa/Chuvisco', 0.8],
]

// Ruído suave ao longo da rodovia: trechos vizinhos têm risco parecido,
// formando "zonas" perigosas, como nos dados reais.
function ruidoSuave(n) {
  const ancoras = Array.from({ length: Math.ceil(n / 6) + 2 }, () => aleatorio())
  return Array.from({ length: n }, (_, i) => {
    const pos = i / 6
    const k = Math.floor(pos)
    const t = pos - k
    const s = t * t * (3 - 2 * t)
    return ancoras[k] * (1 - s) + ancoras[k + 1] * s
  })
}

function nivelPorScore(score) {
  if (score >= 0.8) return 'Crítico'
  if (score >= 0.6) return 'Alto'
  if (score >= 0.35) return 'Médio'
  return 'Baixo'
}

// ---------- 3. município/UF via Nominatim ----------

// Cache em disco para que regerar o mock não refaça centenas de consultas.
const ARQUIVO_CACHE = new URL('./.cache-localizacao.json', import.meta.url)
let cache = {}
try {
  cache = JSON.parse(await readFile(ARQUIVO_CACHE, 'utf8'))
} catch {}

let ultimaChamada = 0
async function localizar(ponto) {
  const chave = ponto.map((n) => n.toFixed(3)).join(',')
  if (!cache[chave]) {
    cache[chave] = await consultarNominatim(ponto)
    await writeFile(ARQUIVO_CACHE, JSON.stringify(cache))
  }
  return cache[chave]
}

async function consultarNominatim([lon, lat]) {
  const espera = 1100 - (Date.now() - ultimaChamada)
  if (espera > 0) await esperar(espera)
  ultimaChamada = Date.now()
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=10&accept-language=pt-BR`
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    const json = await resp.json()
    const a = json.address ?? {}
    const iso = a['ISO3166-2-lvl4'] // ex.: "BR-SP"
    return {
      municipio: a.city ?? a.town ?? a.municipality ?? a.village ?? null,
      uf: iso?.startsWith('BR-') ? iso.slice(3) : null,
    }
  } catch {
    return { municipio: null, uf: null }
  }
}

// ---------- principal ----------

async function main() {
  const brutos = []
  const proximoKm = {} // KM fictício: numeração contínua por BR entre as rotas

  for (const rota of ROTAS_DEMO) {
    console.log(`Traçando ${rota.nome}...`)
    const passos = await tracarRota(rota.pontos)
    const corridas = extrairCorridasBR(passos)

    for (const corrida of corridas) {
      const fatias = fatiar(corrida.coords)
      const ruido = ruidoSuave(fatias.length)
      proximoKm[corrida.br] ??= 5 * Math.floor(aleatorio() * 30)

      fatias.forEach((fatia, i) => {
        // rotas diferentes podem passar pelo mesmo pedaço de estrada
        const meio = fatia[Math.floor(fatia.length / 2)]
        const repetido = brutos.some(
          (s) => s.br === corrida.br && s.coordsLonLat.some((p) => distanciaM(p, meio) < 150),
        )
        if (repetido) return

        const km_inicio = proximoKm[corrida.br]
        proximoKm[corrida.br] += 5
        const segmento_id = `${corrida.br}_KM${km_inicio}`

        // pontos críticos isolados (~6%) além das zonas suaves
        const pico = aleatorio() < 0.06 ? 0.12 + aleatorio() * 0.1 : 0
        const taxa = Math.min(0.32, 0.015 + ruido[i] ** 2 * 0.11 + pico)
        const total = Math.max(1, Math.round(4 + ruido[i] * 30 + aleatorio() * 18))

        brutos.push({
          segmento_id,
          br: corrida.br,
          km_inicio,
          km_fim: km_inicio + 5,
          coordsLonLat: simplificar(fatia),
          taxa,
          total,
        })
      })
    }
  }

  // risco relativo calculado dentro de cada BR (média ponderada por acidentes)
  const mediaPorBR = {}
  for (const s of brutos) {
    const m = (mediaPorBR[s.br] ??= { fatais: 0, total: 0 })
    m.fatais += s.taxa * s.total
    m.total += s.total
  }

  console.log(`${brutos.length} segmentos. Buscando município/UF (≈${Math.ceil(brutos.length * 1.1 / 60)} min)...`)

  const segmentos = []
  for (const [i, s] of brutos.entries()) {
    const media = mediaPorBR[s.br].fatais / mediaPorBR[s.br].total
    const rr = s.taxa / media
    const score = Math.min(0.99, Math.max(0.01, 0.5 + 0.35 * Math.log2(rr)))
    const perigoso = score >= 0.6

    const meio = s.coordsLonLat[Math.floor(s.coordsLonLat.length / 2)]
    const { municipio, uf } = await localizar(meio)
    if (i % 25 === 0) console.log(`  ${i}/${brutos.length}`)

    segmentos.push({
      segmento_id: s.segmento_id,
      br: s.br,
      km_inicio: s.km_inicio,
      km_fim: s.km_fim,
      uf,
      municipio,
      coordenadas: s.coordsLonLat.map(([lon, lat]) => [arred(lat, 5), arred(lon, 5)]),
      nivel_risco: nivelPorScore(score),
      score_risco: arred(score, 2),
      risco_relativo_na_br: arred(rr, 2),
      total_acidentes: s.total,
      taxa_fatalidade: arred(s.taxa, 3),
      estatisticas: {
        causa_mais_comum: escolherPonderado(CAUSAS),
        fase_dia_critica: escolherPonderado(
          perigoso
            ? [['Plena Noite', 5], ['Amanhecer', 2], ['Anoitecer', 1.5], ['Pleno dia', 1.5]]
            : [['Pleno dia', 5], ['Plena Noite', 3], ['Anoitecer', 1], ['Amanhecer', 1]],
        ),
        tipo_pista: escolherPonderado(perigoso ? [['Simples', 7], ['Dupla', 3]] : [['Simples', 4], ['Dupla', 6], ['Múltipla', 1]]),
        tracado_via: escolherPonderado(perigoso ? [...TRACADOS, ['Curva; Declive', 3]] : TRACADOS),
        condicao_meteorologica: escolherPonderado(CLIMAS),
      },
    })
  }

  const destino = new URL('../src/data/segmentos.mock.json', import.meta.url)
  await writeFile(destino, JSON.stringify(segmentos))
  const contagem = segmentos.reduce((c, s) => ((c[s.nivel_risco] = (c[s.nivel_risco] ?? 0) + 1), c), {})
  console.log('Gravado:', destino.pathname, contagem)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
