import { COR_SEM_DADOS, NIVEIS, ORDEM_NIVEIS } from '../services/risco'

export default function Legenda({ comRota }) {
  return (
    <div className="legenda" aria-label="Legenda de risco">
      <div className="legenda-titulo">Gravidade dos acidentes</div>
      <div className="legenda-sub">
        {comRota ? 'no horário em que você passa' : 'no pior horário do dia'}
      </div>
      {ORDEM_NIVEIS.map((n) => (
        <div key={n} className="legenda-item">
          <span className="legenda-linha" style={{ background: NIVEIS[n].cor, height: NIVEIS[n].peso - 2 }} />
          {n}
        </div>
      ))}
      {comRota && (
        <div className="legenda-item">
          <span className="legenda-linha" style={{ background: COR_SEM_DADOS, height: 4 }} />
          Sem dados
        </div>
      )}
    </div>
  )
}
