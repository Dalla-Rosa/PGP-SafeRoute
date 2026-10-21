import {
  NIVEIS,
  ORDEM_NIVEIS,
  ehAtencao,
  fraseComparativa,
  horaDoEta,
  movimentado,
  nomeDoTrecho,
} from '../services/risco'

function duracao(min) {
  const h = Math.floor(min / 60)
  return h ? `${h} h ${String(min % 60).padStart(2, '0')}` : `${min} min`
}

const TAMANHO_TRECHO_KM = 5

// Junta trechos de atenção vizinhos na mesma BR num item só:
// "km 225–245" é mais fácil de ler que quatro linhas de 5 km.
function agruparAtencao(trechos) {
  const grupos = []
  for (const t of trechos.filter(ehAtencao)) {
    const ultimo = grupos.at(-1)
    if (ultimo && ultimo.br === t.br && t.km_na_rota - ultimo.fimNaRota <= TAMANHO_TRECHO_KM) {
      ultimo.trechos.push(t)
      ultimo.fimNaRota = t.km_na_rota + TAMANHO_TRECHO_KM
    } else {
      grupos.push({
        br: t.br,
        inicioNaRota: t.km_na_rota,
        fimNaRota: t.km_na_rota + TAMANHO_TRECHO_KM,
        trechos: [t],
      })
    }
  }
  return grupos.map((g) => {
    const kms = g.trechos.flatMap((t) => [t.km_inicio, t.km_fim])
    return {
      ...g,
      pior: g.trechos.reduce((a, b) => (b.score_risco > a.score_risco ? b : a)),
      kmInicio: Math.min(...kms),
      kmFim: Math.max(...kms),
    }
  })
}

// Onde a viagem muda de fase do dia — é o que torna o horário de saída visível.
function marcosDeFase(trechos) {
  const marcos = []
  trechos.forEach((t, i) => {
    if (i === 0 || t.fase_dia !== trechos[i - 1].fase_dia) marcos.push(t)
  })
  return marcos
}

// Faixa horizontal da viagem (A → B) com cada trecho pintado na sua posição.
function LinhaDoTempo({ resumo, trechos, onSelecionar }) {
  const total = resumo.distancia_km
  const posicao = (km) => `${Math.min(100, (km / total) * 100)}%`
  const marcos = marcosDeFase(trechos)

  return (
    <div className="linha-tempo">
      <div className="barra-rota" role="img" aria-label="Risco ao longo da rota, do início ao fim">
        <span className="marcador marcador-a pequeno">A</span>
        <div className="barra-trilho">
          {trechos.map((t, i) => {
            const fim = Math.min(trechos[i + 1]?.km_na_rota ?? total, t.km_na_rota + TAMANHO_TRECHO_KM)
            return (
              <button
                key={t.segmento_id}
                className="barra-trecho"
                title={`${nomeDoTrecho(t)} · ${horaDoEta(t.eta)} · Risco ${t.nivel_risco}`}
                style={{
                  left: posicao(t.km_na_rota),
                  width: `max(3px, ${((fim - t.km_na_rota) / total) * 100}%)`,
                  background: NIVEIS[t.nivel_risco].cor,
                  zIndex: ORDEM_NIVEIS.length - ORDEM_NIVEIS.indexOf(t.nivel_risco),
                }}
                onClick={() => onSelecionar(t)}
              />
            )
          })}
        </div>
        <span className="marcador marcador-b pequeno">B</span>
      </div>

      <div className="regua-tempo">
        {marcos.map((t) => (
          <span key={t.segmento_id} className="marco-fase" style={{ left: posicao(t.km_na_rota) }}>
            <span className="marco-hora">{horaDoEta(t.eta)}</span>
            <span className="marco-fase-nome">{t.fase_dia}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function ListaAlertas({ trechos, onSelecionar }) {
  // Clima em trecho sensível primeiro: é o alerta que muda o nível de risco.
  const alertas = trechos
    .flatMap((t) => t.alertas.map((a) => ({ ...a, trecho: t })))
    .sort((a, b) => Number(b.sensivel) - Number(a.sensivel))

  if (!alertas.length) return null

  return (
    <>
      <h3 className="titulo-secao">
        Alertas de clima <span className="sutil">na hora em que você passa</span>
      </h3>
      <ul className="lista-alertas">
        {alertas.slice(0, 6).map((a) => (
          <li key={`${a.trecho.segmento_id}-${a.tipo}`}>
            <button onClick={() => onSelecionar(a.trecho)} className={a.sensivel ? 'alerta-forte' : undefined}>
              <span className="alerta-icone" aria-hidden="true">
                {a.tipo === 'neblina' ? '🌫️' : '🌧️'}
              </span>
              <span className="atencao-texto">
                <span className="atencao-titulo">{nomeDoTrecho(a.trecho)}</span>
                <span className="atencao-sub">
                  {horaDoEta(a.trecho.eta)} · {a.texto}
                </span>
              </span>
              <span className="seta" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
        {alertas.length > 6 && <li className="sutil">e mais {alertas.length - 6} trechos com clima previsto.</li>}
      </ul>
    </>
  )
}

function manchete(resumo) {
  const n = resumo.trechos_por_nivel
  if (!resumo.nivel_maximo) {
    return { classe: 'neutro', texto: 'Ainda não temos dados de risco para as rodovias desta rota.' }
  }
  if (n.Crítico) {
    return {
      classe: 'critico',
      texto: `${n.Crítico} ${n.Crítico === 1 ? 'trecho crítico' : 'trechos críticos'} na sua rota`,
    }
  }
  if (n.Alto) {
    return { classe: 'alto', texto: `${n.Alto} ${n.Alto === 1 ? 'trecho' : 'trechos'} de risco alto na sua rota` }
  }
  return { classe: 'ok', texto: 'Nenhum trecho de risco alto ou crítico na sua rota' }
}

export default function ResumoRota({ resultado, origem, destino, onSelecionar }) {
  const { resumo, trechos, avisos } = resultado
  const atencao = agruparAtencao(trechos)
  const m = manchete(resumo)
  const maisMovimentados = trechos.filter(movimentado).length

  return (
    <section className="resumo">
      <div className="resumo-cabecalho">
        <div className="rota-nomes">
          <strong>{origem.nome.split(',')[0]}</strong> → <strong>{destino.nome.split(',')[0]}</strong>
        </div>
        <div className="rota-meta">
          {Math.round(resumo.distancia_km).toLocaleString('pt-BR')} km · {duracao(resumo.duracao_min)}
        </div>
      </div>

      <div className={`manchete manchete-${m.classe}`}>{m.texto}</div>

      {trechos.length > 0 && (
        <>
          <LinhaDoTempo resumo={resumo} trechos={trechos} onSelecionar={onSelecionar} />

          <div className="contagem">
            {ORDEM_NIVEIS.map((n) => (
              <div key={n} className="contagem-item">
                <span className="ponto" style={{ background: NIVEIS[n].cor }} />
                <strong>{resumo.trechos_por_nivel[n]}</strong> {n}
              </div>
            ))}
          </div>

          <ListaAlertas trechos={trechos} onSelecionar={onSelecionar} />

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
                      <span className="atencao-sub">
                        Por volta das {horaDoEta(g.pior.eta)} · a {Math.round(g.inicioNaRota)} km da partida
                      </span>
                      <span className="atencao-sub">{fraseComparativa(g.pior)}</span>
                    </span>
                    <span className="seta" aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="sutil">Nenhum trecho de risco alto ou crítico. Mesmo assim, dirija com atenção.</p>
          )}

          {maisMovimentados > 0 && (
            <p className="nota-frequencia">
              <strong>{maisMovimentados}</strong>{' '}
              {maisMovimentados === 1 ? 'trecho concentra' : 'trechos concentram'} muitos acidentes por ano, mesmo
              com nível de risco baixo. A cor mostra a <em>gravidade</em> dos acidentes, não a quantidade.
            </p>
          )}
        </>
      )}

      {avisos.map((aviso) => (
        <p key={aviso} className="aviso">
          {aviso}
        </p>
      ))}

      <p className="cobertura">
        {trechos.length
          ? `Analisamos ${resumo.cobertura_dados_pct}% da rota — o restante são vias estaduais, municipais ou trechos sem histórico, mostrados em cinza.`
          : 'Os dados cobrem apenas rodovias federais (BRs). Tente uma das rotas de exemplo.'}
      </p>
    </section>
  )
}
