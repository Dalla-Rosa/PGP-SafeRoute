// O backend (FastAPI) faz o roteamento, associa a rota aos trechos, consulta a
// previsão do tempo e roda o modelo.
//
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
      origem: { lat: origem.lat, lon: origem.lon },
      destino: { lat: destino.lat, lon: destino.lon },
      partida,
    }),
  })
}

// Sugestões de cidade. O resultado já traz a coordenada, então não há
// geocodificação no envio do formulário.
export async function buscarLugares(texto, sinal) {
  if (texto.trim().length < 2) return []
  const { lugares } = await pedir(`/api/lugares?q=${encodeURIComponent(texto.trim())}`, { signal: sinal })
  return lugares
}

let cacheTrechos = null

export async function carregarTrechos() {
  cacheTrechos ??= (await pedir('/api/trechos')).trechos
  return cacheTrechos
}
