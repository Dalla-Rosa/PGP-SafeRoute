import { useState } from 'react'
import { COR_SEM_DADOS, NIVEIS, ORDEM_NIVEIS } from '../services/risco'

// No celular a legenda cobriria o mapa, que é a informação principal.
const telaEstreita = () => window.matchMedia('(max-width: 760px)').matches

export default function Legenda({ comRota }) {
  const [aberta, setAberta] = useState(() => !telaEstreita())

  return (
    <div className={aberta ? 'legenda' : 'legenda fechada'}>
      <button className="legenda-cabecalho" onClick={() => setAberta((v) => !v)} aria-expanded={aberta}>
        <span>
          <strong>Gravidade dos acidentes</strong>
          <small>{comRota ? 'no horário em que você passa' : 'no pior horário do dia'}</small>
        </span>
        <span className="legenda-seta" aria-hidden="true">
          {aberta ? '▾' : '▴'}
        </span>
      </button>

      {aberta && (
        <div className="legenda-itens">
          {ORDEM_NIVEIS.map((n) => (
            <div key={n} className="legenda-item">
              <span className="legenda-linha" style={{ background: NIVEIS[n].cor }} />
              {n}
            </div>
          ))}
          {comRota && (
            <div className="legenda-item">
              {/* color, não background: o tracejado usa currentColor. */}
              <span className="legenda-linha tracejada" style={{ color: COR_SEM_DADOS }} />
              Sem dados
            </div>
          )}
        </div>
      )}
    </div>
  )
}
