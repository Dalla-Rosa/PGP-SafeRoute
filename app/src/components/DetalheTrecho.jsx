import { NIVEIS, dicas, formatarNumero, fraseComparativa } from '../services/risco'

// Régua do risco relativo: 0× a 3×, com a média da BR (1×) marcada.
function ReguaRelativa({ seg }) {
  const max = 3
  const pos = Math.min(seg.risco_relativo_na_br, max) / max
  return (
    <div className="regua">
      <div className="regua-trilho">
        <div className="regua-media" style={{ left: `${100 / max}%` }}>
          <span>média da BR-{seg.br}</span>
        </div>
        <div
          className="regua-valor"
          style={{ left: `${pos * 100}%`, background: NIVEIS[seg.nivel_risco].cor }}
          title={`${formatarNumero(seg.risco_relativo_na_br)}×`}
        />
      </div>
      <div className="regua-legenda">
        <span>mais seguro</span>
        <span>mais perigoso</span>
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

export default function DetalheTrecho({ seg, onVoltar, textoVoltar }) {
  const nivel = NIVEIS[seg.nivel_risco]
  const e = seg.estatisticas
  const taxa = seg.taxa_fatalidade
  const umEmCada = taxa > 0 ? Math.round(1 / taxa) : null
  const local = [seg.municipio, seg.uf].filter(Boolean).join(' / ')

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
          BR-{seg.br} · km {seg.km_inicio} a {seg.km_fim}
        </h2>
        {local && <p className="sutil">{local}</p>}
      </div>

      <p className="comparacao">
        <strong>{fraseComparativa(seg)}.</strong> {nivel.resumo}
      </p>
      <ReguaRelativa seg={seg} />

      <div className="dados">
        <Dado rotulo="Acidentes registrados" valor={seg.total_acidentes} detalhe="neste trecho de 5 km" />
        <Dado
          rotulo="Acidentes com morte"
          valor={`${formatarNumero(taxa * 100)}%`}
          detalhe={umEmCada ? `cerca de 1 em cada ${umEmCada}` : 'nenhum registrado'}
        />
        <Dado rotulo="Horário mais perigoso" valor={e.fase_dia_critica} />
        <Dado rotulo="Tipo de pista" valor={e.tipo_pista} />
        {e.tracado_via && <Dado rotulo="Traçado" valor={e.tracado_via.replace(';', ' +')} />}
        {e.condicao_meteorologica && <Dado rotulo="Clima mais comum nos acidentes" valor={e.condicao_meteorologica} />}
        <Dado rotulo="Causa mais comum" valor={e.causa_mais_comum} largo />
      </div>

      {dicas(seg).length > 0 && (
        <div className="dicas">
          <h3 className="titulo-secao">Ao passar por aqui</h3>
          <ul>
            {dicas(seg).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
