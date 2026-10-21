import {
  MUITOS_ACIDENTES_POR_ANO,
  NIVEIS,
  dicas,
  formatarNumero,
  fraseComparativa,
  horaDoEta,
  movimentado,
  rotuloClima,
} from '../services/risco'

// Régua do risco relativo: 0× a 3×, com a média da BR (1×) marcada.
function ReguaRelativa({ t }) {
  const max = 3
  const rr = t.estatisticas.risco_relativo_na_br
  return (
    <div className="regua">
      <div className="regua-trilho">
        <div className="regua-media" style={{ left: `${100 / max}%` }}>
          <span>média da BR-{t.br}</span>
        </div>
        <div
          className="regua-valor"
          style={{ left: `${(Math.min(rr, max) / max) * 100}%`, background: NIVEIS[t.nivel_risco].cor }}
          title={`${formatarNumero(rr)}×`}
        />
      </div>
      <div className="regua-legenda">
        <span>acidentes menos letais</span>
        <span>mais letais</span>
      </div>
    </div>
  )
}

function Dado({ rotulo, valor, detalhe, largo }) {
  return (
    <div className={largo ? 'dado dado-largo' : 'dado'}>
      <span className="dado-rotulo">{rotulo}</span>
      <span className="dado-valor">{valor}</span>
      {detalhe && <span className="dado-detalhe">{detalhe}</span>}
    </div>
  )
}

export default function DetalheTrecho({ t, onVoltar, textoVoltar }) {
  const nivel = NIVEIS[t.nivel_risco]
  const e = t.estatisticas

  return (
    <section className="detalhe">
      <button className="voltar" onClick={onVoltar}>
        ‹ {textoVoltar}
      </button>

      <div className="detalhe-topo" style={{ borderColor: nivel.cor }}>
        <span className="selo grande" style={{ background: nivel.cor }}>
          Risco {nivel.rotulo}
        </span>
        <h2>
          BR-{t.br} · km {t.km_inicio} a {t.km_fim}
        </h2>
        {t.uf && <p className="sutil">{t.uf}</p>}
      </div>

      {t.eta && (
        <div className="passagem">
          <span className="passagem-hora">{horaDoEta(t.eta)}</span>
          <span className="passagem-detalhe">
            {t.fase_dia} · {rotuloClima(t.clima)}
          </span>
        </div>
      )}

      {t.alertas?.map((a) => (
        <p key={a.tipo} className={a.sensivel ? 'alerta alerta-forte' : 'alerta'}>
          {a.tipo === 'neblina' ? '🌫️' : '🌧️'} {a.texto}
        </p>
      ))}

      <p className="comparacao">
        <strong>{fraseComparativa(t)}.</strong> {nivel.resumo}
      </p>
      <ReguaRelativa t={t} />

      {/* O modelo mede gravidade; a frequência precisa aparecer à parte para que
          um trecho verde e movimentado não seja lido como "seguro". */}
      <div className={movimentado(t) ? 'frequencia frequencia-alta' : 'frequencia'}>
        <span className="frequencia-valor">{formatarNumero(e.acidentes_por_ano)}</span>
        <span className="frequencia-texto">
          acidentes por ano neste trecho de 5 km
          {movimentado(t) && (
            <strong> — bem acima dos {MUITOS_ACIDENTES_POR_ANO} que consideramos um trecho movimentado.</strong>
          )}
        </span>
      </div>

      <div className="dados">
        <Dado rotulo="Acidentes registrados" valor={e.total_acidentes} detalhe="desde 2021" />
        <Dado rotulo="Com morte" valor={e.total_fatais} detalhe={`de ${e.total_acidentes} acidentes`} />
        <Dado rotulo="Horário mais crítico" valor={`${String(e.hora_mais_critica).padStart(2, '0')}h`} />
        <Dado rotulo="Tipo de pista" valor={e.tipo_pista ?? '—'} />
        {e.tracado_via && <Dado rotulo="Traçado" valor={e.tracado_via.replaceAll(';', ' + ')} largo />}
      </div>

      {dicas(t).length > 0 && (
        <div className="dicas">
          <h3 className="titulo-secao">Ao passar por aqui</h3>
          <ul>
            {dicas(t).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
