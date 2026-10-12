// Tudo que define como um nível de risco é apresentado ao motorista fica aqui,
// para que a Sprint 3 possa ajustar faixas e textos num só lugar.

export const NIVEIS = {
  Baixo: {
    cor: '#16a34a',
    peso: 5,
    rotulo: 'Baixo',
    resumo: 'Trecho com histórico abaixo da média desta rodovia.',
  },
  Médio: {
    cor: '#ca8a04',
    peso: 6,
    rotulo: 'Médio',
    resumo: 'Trecho dentro da média de acidentes graves desta rodovia.',
  },
  Alto: {
    cor: '#ea580c',
    peso: 7,
    rotulo: 'Alto',
    resumo: 'Trecho com mais acidentes graves que a média desta rodovia.',
  },
  Crítico: {
    cor: '#dc2626',
    peso: 8,
    rotulo: 'Crítico',
    resumo: 'Um dos trechos com mais acidentes fatais desta rodovia.',
  },
}

export const ORDEM_NIVEIS = ['Crítico', 'Alto', 'Médio', 'Baixo']

export const COR_SEM_DADOS = '#8492a6'

export const formatarNumero = (n, casas = 1) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export function fraseComparativa(seg) {
  const rr = seg.risco_relativo_na_br
  const br = `BR-${seg.br}`
  if (rr >= 1.15) return `${formatarNumero(rr)}× mais perigoso que a média da ${br}`
  if (rr <= 0.85) return `Mais seguro que a média da ${br} (${formatarNumero(rr)}×)`
  return `Próximo da média da ${br}`
}

// Dicas em linguagem simples, derivadas das estatísticas do trecho.
export function dicas(seg) {
  const e = seg.estatisticas
  const lista = []
  if (seg.nivel_risco === 'Crítico' || seg.nivel_risco === 'Alto') {
    lista.push('Reduza a velocidade e aumente a distância do veículo da frente.')
  }
  if (e.fase_dia_critica === 'Plena Noite' || e.fase_dia_critica === 'Amanhecer') {
    lista.push('Os acidentes aqui se concentram à noite e de madrugada. Se puder, passe durante o dia.')
  }
  if (e.tipo_pista === 'Simples') {
    lista.push('Pista simples: só ultrapasse com visibilidade total.')
  }
  if (/Curva|Declive/.test(e.tracado_via ?? '')) {
    lista.push('Trecho com curvas ou descida: reduza antes de entrar na curva.')
  }
  if (/Chuva|Neblina|Garoa/.test(e.condicao_meteorologica ?? '')) {
    lista.push('Muitos acidentes com chuva ou neblina: redobre a atenção com tempo ruim.')
  }
  if (/dormindo/i.test(e.causa_mais_comum)) {
    lista.push('Sono ao volante é causa frequente aqui: pare para descansar antes.')
  }
  if (/álcool/i.test(e.causa_mais_comum)) {
    lista.push('Álcool é causa frequente aqui: atenção a outros motoristas.')
  }
  return lista.slice(0, 3)
}
