import { useState } from 'react'

export const ROTAS_DEMO = [
  { origem: 'São Paulo, SP', destino: 'Curitiba, PR' },
  { origem: 'São Paulo, SP', destino: 'Rio de Janeiro, RJ' },
  { origem: 'Florianópolis, SC', destino: 'Porto Alegre, RS' },
  { origem: 'Chapecó, SC', destino: 'Porto Alegre, RS' },
  { origem: 'Belo Horizonte, MG', destino: 'Rio de Janeiro, RJ' },
]

const curto = (s) => s.split(',')[0]

export default function FormRota({ onTracar, carregando }) {
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')

  function enviar(e) {
    e.preventDefault()
    if (origem.trim() && destino.trim()) onTracar(origem.trim(), destino.trim())
  }

  function usarDemo(r) {
    setOrigem(r.origem)
    setDestino(r.destino)
    onTracar(r.origem, r.destino)
  }

  function inverter() {
    setOrigem(destino)
    setDestino(origem)
  }

  return (
    <form className="form-rota" onSubmit={enviar}>
      <div className="campos">
        <label className="campo">
          <span className="marcador marcador-a" aria-hidden="true">A</span>
          <input
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            placeholder="Origem (ex.: Chapecó, SC)"
            aria-label="Origem"
          />
        </label>
        <label className="campo">
          <span className="marcador marcador-b" aria-hidden="true">B</span>
          <input
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Destino (ex.: Porto Alegre, RS)"
            aria-label="Destino"
          />
        </label>
        <button type="button" className="botao-inverter" onClick={inverter} title="Inverter origem e destino">
          ⇅
        </button>
      </div>
      <button className="botao-principal" disabled={carregando || !origem.trim() || !destino.trim()}>
        {carregando ? 'Analisando rota…' : 'Ver riscos da rota'}
      </button>
      <div className="demos">
        <span>Experimente:</span>
        {ROTAS_DEMO.map((r) => (
          <button
            type="button"
            key={r.origem + r.destino}
            className="chip"
            onClick={() => usarDemo(r)}
            disabled={carregando}
          >
            {curto(r.origem)} → {curto(r.destino)}
          </button>
        ))}
      </div>
    </form>
  )
}
