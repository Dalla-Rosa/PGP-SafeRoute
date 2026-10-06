// Geometria simples em [lat, lon]. Projeção equiretangular local: precisa o
// bastante para distâncias de centenas de metros e muito mais barata que haversine.

const R = 6371000
const RAD = Math.PI / 180

function projetar([lat, lon], latRef) {
  return [lon * RAD * R * Math.cos(latRef * RAD), lat * RAD * R]
}

export function distanciaM(a, b) {
  const latRef = (a[0] + b[0]) / 2
  const [x1, y1] = projetar(a, latRef)
  const [x2, y2] = projetar(b, latRef)
  return Math.hypot(x2 - x1, y2 - y1)
}

// Distâncias acumuladas ao longo de uma polilinha (metros).
export function acumulado(linha) {
  const acc = [0]
  for (let i = 1; i < linha.length; i++) acc.push(acc[i - 1] + distanciaM(linha[i - 1], linha[i]))
  return acc
}

// Ponto mais próximo de `p` sobre a polilinha: distância até ela e posição ao longo dela.
export function projetarNaLinha(p, linha, acc) {
  let melhor = { distancia: Infinity, posicao: 0 }
  const latRef = p[0]
  const [px, py] = projetar(p, latRef)
  for (let i = 1; i < linha.length; i++) {
    const [ax, ay] = projetar(linha[i - 1], latRef)
    const [bx, by] = projetar(linha[i], latRef)
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
    if (d < melhor.distancia) {
      melhor = { distancia: d, posicao: acc[i - 1] + t * (acc[i] - acc[i - 1]) }
    }
  }
  return melhor
}

export function caixa(linha, margemGraus = 0) {
  let [minLat, minLon, maxLat, maxLon] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [lat, lon] of linha) {
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
    minLon = Math.min(minLon, lon)
    maxLon = Math.max(maxLon, lon)
  }
  return [minLat - margemGraus, minLon - margemGraus, maxLat + margemGraus, maxLon + margemGraus]
}

export function dentroDaCaixa([lat, lon], [minLat, minLon, maxLat, maxLon]) {
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon
}
