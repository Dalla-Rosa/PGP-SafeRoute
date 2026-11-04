// Códigos WMO (Open-Meteo) → o que mostrar no mapa. O backend já devolve o grupo
// que o modelo usa; aqui refinamos só a aparência, para distinguir garoa de
// tempestade sem mudar o cálculo de risco.

const TEMPESTADE = { icone: '⛈️', rotulo: 'Tempestade', classe: 'tempestade' }
const CHUVA_FORTE = { icone: '🌧️', rotulo: 'Chuva forte', classe: 'chuva' }
const CHUVA = { icone: '🌧️', rotulo: 'Chuva', classe: 'chuva' }
const GAROA = { icone: '🌦️', rotulo: 'Garoa', classe: 'garoa' }
const NEVE = { icone: '🌨️', rotulo: 'Neve', classe: 'chuva' }
const NEBLINA = { icone: '🌫️', rotulo: 'Neblina', classe: 'neblina' }
const NUBLADO = { icone: '☁️', rotulo: 'Nublado', classe: 'nublado' }
const PARCIAL = { icone: '⛅', rotulo: 'Parcialmente nublado', classe: 'nublado' }
const CLARO = { icone: '☀️', rotulo: 'Céu claro', classe: 'claro' }

const POR_CODIGO = {
  0: CLARO,
  1: CLARO,
  2: PARCIAL,
  3: NUBLADO,
  45: NEBLINA,
  48: NEBLINA,
  51: GAROA,
  53: GAROA,
  55: GAROA,
  56: GAROA,
  57: GAROA,
  61: CHUVA,
  63: CHUVA,
  65: CHUVA_FORTE,
  66: CHUVA,
  67: CHUVA_FORTE,
  71: NEVE,
  73: NEVE,
  75: NEVE,
  77: NEVE,
  80: CHUVA,
  81: CHUVA,
  82: CHUVA_FORTE,
  85: NEVE,
  86: NEVE,
  95: TEMPESTADE,
  96: TEMPESTADE,
  99: TEMPESTADE,
}

const POR_GRUPO = { claro: CLARO, nublado: NUBLADO, chuva: CHUVA, neblina: NEBLINA }

export function aparenciaDoClima(codigoWmo, grupo) {
  return POR_CODIGO[codigoWmo] ?? POR_GRUPO[grupo] ?? { icone: '❔', rotulo: 'Sem previsão', classe: 'claro' }
}

// Só vale destacar no mapa o que muda a direção: sol e nuvem viram ruído visual.
export const climaRelevante = (clima) => clima === 'chuva' || clima === 'neblina'

export const rotuloClima = (clima) => POR_GRUPO[clima]?.rotulo ?? 'Previsão indisponível'
