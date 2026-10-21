import { useState } from 'react'

export const ROTAS_DEMO = [
  { origem: 'Chapecó, SC', destino: 'Florianópolis, SC' },
  { origem: 'São Paulo, SP', destino: 'Curitiba, PR' },
  { origem: 'São Paulo, SP', destino: 'Rio de Janeiro, RJ' },
  { origem: 'Florianópolis, SC', destino: 'Porto Alegre, RS' },
  { origem: 'Belo Horizonte, MG', destino: 'Rio de Janeiro, RJ' },
]

const curto = (s) => s.split(',')[0]

// Formato aceito por <input type="datetime-local">, no fuso do navegador.
function agoraLocal() {
  const agora = new Date()
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset())
  return agora.toISOString().slice(0, 16)
}

export default function FormRota({ onTracar, carregando }) {
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [partida, setPartida] = useState(agoraLocal)

  const preenchido = origem.trim() && destino.trim()

  function enviar(e) {
    e.preventDefault()
    if (preenchido) onTracar(origem.trim(), destino.trim(), partida)
  }

  function usarDemo(r) {
    setOrigem(r.origem)
    setDestino(r.destino)
    onTracar(r.origem, r.destino, partida)
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
            placeholder="Destino (ex.: Florianópolis, SC)"
            aria-label="Destino"
          />
        </label>
        <button type="button" className="botao-inverter" onClick={inverter} title="Inverter origem e destino">
          ⇅
        </button>
      </div>

      <label className="campo campo-horario">
        <span className="rotulo-horario">Saída</span>
        <input
          type="datetime-local"
          value={partida}
          onChange={(e) => setPartida(e.target.value)}
          aria-label="Horário de saída"
        />
      </label>

      <button className="botao-principal" disabled={carregando || !preenchido}>
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
