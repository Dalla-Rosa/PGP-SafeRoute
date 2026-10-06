import { acumulado, caixa, dentroDaCaixa, projetarNaLinha } from './geo'

// Quando a API da Sprint 3 existir, defina VITE_API_URL (ex.: no arquivo .env)
// e ela deve responder GET /segmentos com a lista no formato do contrato.
const API_URL = import.meta.env.VITE_API_URL

export const usandoMock = !API_URL

let cacheSegmentos = null

export async function carregarSegmentos() {
  if (cacheSegmentos) return cacheSegmentos
  if (API_URL) {
    const resp = await fetch(`${API_URL}/segmentos`)
    if (!resp.ok) throw new Error('Não foi possível carregar os dados de risco.')
    cacheSegmentos = await resp.json()
  } else {
    cacheSegmentos = (await import('../data/segmentos.mock.json')).default
  }
  return cacheSegmentos
}

// ---------- busca de endereço (Nominatim / OpenStreetMap) ----------

export async function geocodificar(texto) {
  const params = new URLSearchParams({
    q: texto,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'br',
    'accept-language': 'pt-BR',
  })
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!resp.ok) throw new Error('Serviço de busca de endereços indisponível.')
  const [r] = await resp.json()
  if (!r) throw new Error(`Não encontramos "${texto}". Tente incluir a cidade e o estado.`)
  return { nome: r.display_name.split(',').slice(0, 2).join(','), ponto: [Number(r.lat), Number(r.lon)] }
}

// ---------- rota (OSRM) ----------

export async function tracarRota(origem, destino) {
  const coords = [origem, destino].map(([lat, lon]) => `${lon},${lat}`).join(';')
  const resp = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
  )
  const json = await resp.json()
  if (json.code !== 'Ok') throw new Error('Não foi possível traçar uma rota entre esses pontos.')
  const r = json.routes[0]
  return {
    linha: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    distanciaM: r.distance,
    duracaoS: r.duration,
  }
}

// ---------- cruzamento rota × segmentos ----------

const TOLERANCIA_M = 300

// Retorna os segmentos que a rota percorre, ordenados do início ao fim,
// com a posição (km da sua viagem) de cada um.
export function segmentosNaRota(segmentos, linha) {
  const acc = acumulado(linha)
  const area = caixa(linha, 0.01)
  const encontrados = []

  for (const seg of segmentos) {
    const c = seg.coordenadas
    const amostra = [c[0], c[Math.floor(c.length / 2)], c[c.length - 1]]
    if (!amostra.every((p) => dentroDaCaixa(p, area))) continue

    const projecoes = amostra.map((p) => projetarNaLinha(p, linha, acc))
    if (projecoes.every((p) => p.distancia <= TOLERANCIA_M)) {
      const posicoes = projecoes.map((p) => p.posicao)
      encontrados.push({
        ...seg,
        inicioNaRotaM: Math.min(...posicoes),
        fimNaRotaM: Math.max(...posicoes),
      })
    }
  }
  return encontrados.sort((a, b) => a.inicioNaRotaM - b.inicioNaRotaM)
}
