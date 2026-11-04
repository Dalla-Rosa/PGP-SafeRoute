import { useState } from 'react'
import CampoLugar from './CampoLugar'

// Coordenadas fixas: as rotas de exemplo não precisam passar pelo autocomplete.
export const ROTAS_DEMO = [
  {
    origem: { nome: 'Chapecó', descricao: 'SC', lat: -27.1004, lon: -52.6152 },
    destino: { nome: 'Florianópolis', descricao: 'SC', lat: -27.5945, lon: -48.5477 },
  },
  {
    origem: { nome: 'São Paulo', descricao: 'SP', lat: -23.5505, lon: -46.6333 },
    destino: { nome: 'Curitiba', descricao: 'PR', lat: -25.4284, lon: -49.2733 },
  },
  {
    origem: { nome: 'São Paulo', descricao: 'SP', lat: -23.5505, lon: -46.6333 },
    destino: { nome: 'Rio de Janeiro', descricao: 'RJ', lat: -22.9068, lon: -43.1729 },
  },
  {
    origem: { nome: 'Belo Horizonte', descricao: 'MG', lat: -19.9167, lon: -43.9345 },
    destino: { nome: 'Rio de Janeiro', descricao: 'RJ', lat: -22.9068, lon: -43.1729 },
  },
]

function agoraLocal() {
  const agora = new Date()
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset())
  return agora.toISOString().slice(0, 16)
}

export default function FormRota({ onTracar, carregando }) {
  const [origem, setOrigem] = useState(null)
  const [destino, setDestino] = useState(null)
  const [partida, setPartida] = useState(agoraLocal)

  const pronto = origem && destino

  function enviar(e) {
    e.preventDefault()
    if (pronto) onTracar(origem, destino, partida)
  }

  function inverter() {
    setOrigem(destino)
    setDestino(origem)
  }

  function usarDemo(r) {
    setOrigem(r.origem)
    setDestino(r.destino)
    onTracar(r.origem, r.destino, partida)
  }

  return (
    <form className="form-rota" onSubmit={enviar}>
      <div className="campos">
        <div className="trilho-campos" aria-hidden="true" />
        <CampoLugar
          marcador="marcador-a"
          rotulo="Origem"
          placeholder="De onde você sai?"
          valor={origem}
          onEscolher={setOrigem}
        />
        <CampoLugar
          marcador="marcador-b"
          rotulo="Destino"
          placeholder="Para onde você vai?"
          valor={destino}
          onEscolher={setDestino}
        />
        <button
          type="button"
          className="botao-inverter"
          onClick={inverter}
          title="Inverter origem e destino"
          aria-label="Inverter origem e destino"
          disabled={!origem && !destino}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 4v13M7 4 4 7m3-3 3 3M17 20V7m0 13 3-3m-3 3-3-3" />
          </svg>
        </button>
      </div>

      <div className="linha-saida">
        <label className="campo-horario">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="icone-relogio">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>Saída</span>
          <input
            type="datetime-local"
            value={partida}
            onChange={(e) => setPartida(e.target.value)}
            aria-label="Horário de saída"
          />
        </label>
        <button className="botao-principal" disabled={carregando || !pronto}>
          {carregando ? 'Analisando…' : 'Ver riscos'}
        </button>
      </div>

      <div className="demos">
        {ROTAS_DEMO.map((r) => (
          <button
            type="button"
            key={r.origem.nome + r.destino.nome}
            className="chip"
            onClick={() => usarDemo(r)}
            disabled={carregando}
          >
            {r.origem.nome} → {r.destino.nome}
          </button>
        ))}
      </div>
    </form>
  )
}
