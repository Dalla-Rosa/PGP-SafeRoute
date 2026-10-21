// O backend (FastAPI) faz o roteamento, associa a rota aos trechos, consulta a
// previsão do tempo e roda o modelo. Aqui só traduzimos endereço → coordenada.
// 127.0.0.1 em vez de localhost de propósito: no Windows "localhost" resolve para
// ::1 primeiro, e o uvicorn escuta só em IPv4 — a combinação falha de forma
// intermitente. Para apontar para outro host, defina VITE_API_URL.
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

async function pedir(caminho, opcoes) {
  let resposta
  try {
    resposta = await fetch(`${API_URL}${caminho}`, opcoes)
  } catch {
    throw new Error(
      `Não conseguimos falar com o servidor do SafeRoute em ${API_URL}. ` +
        'Inicie o backend: na pasta backend, rode "uvicorn app.main:app --reload --port 8000".',
    )
  }
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null)
    throw new Error(corpo?.detail ?? 'O servidor do SafeRoute não conseguiu responder.')
  }
  return resposta.json()
}

export function analisarRota(origem, destino, partida) {
  return pedir('/api/risco-rota', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origem: { lat: origem[0], lon: origem[1] },
      destino: { lat: destino[0], lon: destino[1] },
      partida,
    }),
  })
}

let cacheTrechos = null

export async function carregarTrechos() {
  cacheTrechos ??= (await pedir('/api/trechos')).trechos
  return cacheTrechos
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
