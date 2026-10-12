import { NIVEIS, ORDEM_NIVEIS, fraseComparativa } from '../services/risco'

const km = (m) => Math.round(m / 1000).toLocaleString('pt-BR')

function duracao(s) {
  const h = Math.floor(s / 3600)
  const min = Math.round((s % 3600) / 60)
  return h ? `${h} h ${String(min).padStart(2, '0')}` : `${min} min`
}

function local(s) {
  return [s.municipio, s.uf].filter(Boolean).join('/')
}

const ehAtencao = (s) => s.nivel_risco === 'Crítico' || s.nivel_risco === 'Alto'

// Junta trechos de atenção vizinhos na mesma BR num único item da lista:
// "km 225–245" é mais fácil de ler que quatro linhas de 5 km.
function agruparAtencao(segmentos) {
  const grupos = []
  for (const s of segmentos.filter(ehAtencao)) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.br === s.br && s.inicioNaRotaM - ultimo.fimNaRotaM < 1000) {
      ultimo.trechos.push(s)
      ultimo.fimNaRotaM = s.fimNaRotaM
    } else {
      grupos.push({ br: s.br, inicioNaRotaM: s.inicioNaRotaM, fimNaRotaM: s.fimNaRotaM, trechos: [s] })
    }
  }
  return grupos.map((g) => {
    const pior = g.trechos.reduce((a, b) => (b.score_risco > a.score_risco ? b : a))
    const kms = g.trechos.flatMap((t) => [t.km_inicio, t.km_fim])
    const locais = [...new Set(g.trechos.map(local).filter(Boolean))]
    return {
      ...g,
      pior,
      kmInicio: Math.min(...kms),
      kmFim: Math.max(...kms),
      local: locais.length > 1 ? `${locais[0]} → ${locais[locais.length - 1]}` : locais[0],
    }
  })
}

// Faixa horizontal da viagem (A → B) com cada trecho pintado na sua posição.
function BarraRota({ rota, segmentos, onSelecionar }) {
  return (
    <div className="barra-rota" role="img" aria-label="Risco ao longo da rota, do início ao fim">
      <span className="marcador marcador-a pequeno">A</span>
      <div className="barra-trilho">
        {segmentos.map((s) => (
          <button
            key={s.segmento_id}
            className="barra-trecho"
            title={`km ${km(s.inicioNaRotaM)} da viagem · Risco ${s.nivel_risco}`}
            style={{
              left: `${(s.inicioNaRotaM / rota.distanciaM) * 100}%`,
              width: `max(3px, ${((s.fimNaRotaM - s.inicioNaRotaM) / rota.distanciaM) * 100}%)`,
              background: NIVEIS[s.nivel_risco].cor,
              zIndex: ORDEM_NIVEIS.length - ORDEM_NIVEIS.indexOf(s.nivel_risco),
            }}
            onClick={() => onSelecionar(s)}
          />
        ))}
      </div>
      <span className="marcador marcador-b pequeno">B</span>
    </div>
  )
}

export default function ResumoRota({ rota, segmentos, onSelecionar }) {
  const contagem = Object.fromEntries(ORDEM_NIVEIS.map((n) => [n, 0]))
  segmentos.forEach((s) => contagem[s.nivel_risco]++)
  const atencao = agruparAtencao(segmentos)
  const kmComDados = segmentos.reduce((t, s) => t + (s.km_fim - s.km_inicio), 0)

  let manchete
  if (!segmentos.length) {
    manchete = { classe: 'neutro', texto: 'Ainda não temos dados de risco para as rodovias desta rota.' }
  } else if (contagem.Crítico) {
    manchete = {
      classe: 'critico',
      texto: `${contagem.Crítico} ${contagem.Crítico === 1 ? 'trecho crítico' : 'trechos críticos'} na sua rota`,
    }
  } else if (contagem.Alto) {
    manchete = {
      classe: 'alto',
      texto: `${contagem.Alto} ${contagem.Alto === 1 ? 'trecho' : 'trechos'} de risco alto na sua rota`,
    }
  } else {
    manchete = { classe: 'ok', texto: 'Nenhum trecho de risco alto ou crítico na sua rota' }
  }

  return (
    <section className="resumo">
      <div className="resumo-cabecalho">
        <div className="rota-nomes">
          <strong>{rota.origem.nome.split(',')[0]}</strong> → <strong>{rota.destino.nome.split(',')[0]}</strong>
        </div>
        <div className="rota-meta">
          {km(rota.distanciaM)} km · {duracao(rota.duracaoS)}
        </div>
      </div>

      <div className={`manchete manchete-${manchete.classe}`}>{manchete.texto}</div>

      {segmentos.length > 0 && (
        <>
          <BarraRota rota={rota} segmentos={segmentos} onSelecionar={onSelecionar} />

          <div className="contagem">
            {ORDEM_NIVEIS.map((n) => (
              <div key={n} className="contagem-item">
                <span className="ponto" style={{ background: NIVEIS[n].cor }} />
                <strong>{contagem[n]}</strong> {n}
              </div>
            ))}
          </div>

          <h3 className="titulo-secao">
            Pontos de atenção <span className="sutil">em ordem de passagem</span>
          </h3>
          {atencao.length ? (
            <ol className="lista-atencao">
              {atencao.map((g) => (
                <li key={g.pior.segmento_id}>
                  <button onClick={() => onSelecionar(g.pior)}>
                    <span className="selo" style={{ background: NIVEIS[g.pior.nivel_risco].cor }}>
                      {g.pior.nivel_risco}
                    </span>
                    <span className="atencao-texto">
                      <span className="atencao-titulo">
                        BR-{g.br}, km {g.kmInicio}–{g.kmFim}
                        {g.trechos.length > 1 && <span className="sutil"> ({g.kmFim - g.kmInicio} km)</span>}
                      </span>
                      {g.local && <span className="atencao-sub">{g.local}</span>}
                      <span className="atencao-sub">
                        A {km(g.inicioNaRotaM)} km da partida
                        {g.trechos.length > 1 ? ' · pior ponto: ' : ' · '}
                        {fraseComparativa(g.pior)}
                      </span>
                    </span>
                    <span className="seta" aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="sutil">Nenhum trecho de risco alto ou crítico. Mesmo assim, dirija com atenção.</p>
          )}
        </>
      )}

      <p className="cobertura">
        {segmentos.length
          ? `Analisamos ${kmComDados.toLocaleString('pt-BR')} km de rodovias federais nesta rota. Trechos em cinza não têm dados (vias estaduais, municipais ou fora da base).`
          : 'Os dados cobrem apenas rodovias federais (BRs). Tente uma das rotas de exemplo.'}
      </p>
    </section>
  )
}
