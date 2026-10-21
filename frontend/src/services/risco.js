// Tudo que define como um nível de risco é apresentado ao motorista fica aqui.
//
// O modelo prevê **gravidade** (se houver um acidente aqui, ele tende a ser fatal?),
// não frequência. Um trecho urbano movimentado pode ser "Baixo" e ainda assim
// concentrar muitos acidentes — por isso a frequência aparece num indicador à parte.

export const NIVEIS = {
  Baixo: {
    cor: '#16a34a',
    peso: 5,
    rotulo: 'Baixo',
    resumo: 'Acidentes aqui tendem a ser menos graves que a média desta rodovia.',
  },
  Médio: {
    cor: '#ca8a04',
    peso: 6,
    rotulo: 'Médio',
    resumo: 'Gravidade parecida com a média desta rodovia.',
  },
  Alto: {
    cor: '#ea580c',
    peso: 7,
    rotulo: 'Alto',
    resumo: 'Acidentes aqui costumam ser mais graves que a média desta rodovia.',
  },
  Crítico: {
    cor: '#dc2626',
    peso: 8,
    rotulo: 'Crítico',
    resumo: 'Um dos trechos onde os acidentes mais terminam em morte nesta rodovia.',
  },
}

export const ORDEM_NIVEIS = ['Crítico', 'Alto', 'Médio', 'Baixo']

export const COR_SEM_DADOS = '#8492a6'

// Acima disso o trecho ganha destaque de "muitos acidentes", mesmo em verde.
export const MUITOS_ACIDENTES_POR_ANO = 20

export const formatarNumero = (n, casas = 1) =>
  Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export const ehAtencao = (t) => t.nivel_risco === 'Crítico' || t.nivel_risco === 'Alto'

export const movimentado = (t) => t.estatisticas.acidentes_por_ano >= MUITOS_ACIDENTES_POR_ANO

export function nomeDoTrecho(t) {
  return `BR-${t.br}, km ${t.km_inicio}–${t.km_fim}${t.uf ? ` (${t.uf})` : ''}`
}

export function horaDoEta(eta) {
  return new Date(eta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function fraseComparativa(t) {
  const rr = t.estatisticas.risco_relativo_na_br
  const br = `BR-${t.br}`
  if (rr >= 1.15) return `Acidentes ${formatarNumero(rr)}× mais letais que a média da ${br}`
  if (rr <= 0.85) return `Acidentes menos letais que a média da ${br} (${formatarNumero(rr)}×)`
  return `Letalidade próxima da média da ${br}`
}

const ROTULO_CLIMA = {
  claro: 'Céu claro',
  nublado: 'Nublado',
  chuva: 'Chuva',
  neblina: 'Neblina',
}

export const rotuloClima = (clima) => ROTULO_CLIMA[clima] ?? 'Previsão indisponível'

// Dicas em linguagem simples, derivadas das estatísticas do trecho.
export function dicas(t) {
  const e = t.estatisticas
  const lista = []
  if (ehAtencao(t)) {
    lista.push('Reduza a velocidade e aumente a distância do veículo da frente.')
  }
  if (t.fase_dia === 'Plena Noite' || t.fase_dia === 'Amanhecer') {
    lista.push('Você passa aqui no escuro, quando os acidentes são cerca de duas vezes mais letais.')
  }
  if (e.tipo_pista === 'Simples') {
    lista.push('Pista simples: só ultrapasse com visibilidade total.')
  }
  if (/Curva|Declive/.test(e.tracado_via ?? '')) {
    lista.push('Trecho com curvas ou descida: reduza antes de entrar na curva.')
  }
  if (movimentado(t)) {
    lista.push('Trecho movimentado, com muitos acidentes por ano: espere trânsito e paradas.')
  }
  return lista.slice(0, 3)
}
