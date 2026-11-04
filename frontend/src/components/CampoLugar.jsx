import { useEffect, useId, useRef, useState } from 'react'
import { buscarLugares } from '../services/api'

const ESPERA_MS = 220

// Mantém a UF visível depois da escolha: existe Florianópolis em SC, no AM e no
// AC, e sem o complemento não dá para saber qual foi selecionada.
const rotuloCompleto = (lugar) =>
  lugar ? [lugar.nome, lugar.descricao].filter(Boolean).join(', ') : ''

// Campo de cidade com sugestões. O lugar escolhido carrega a coordenada, então
// o formulário não precisa geocodificar depois.
export default function CampoLugar({ marcador, rotulo, placeholder, valor, onEscolher, autoFocus }) {
  const [texto, setTexto] = useState(rotuloCompleto(valor))
  const [sugestoes, setSugestoes] = useState([])
  const [aberto, setAberto] = useState(false)
  const [destacado, setDestacado] = useState(0)
  const [buscando, setBuscando] = useState(false)
  const caixaRef = useRef(null)
  const ignorarBusca = useRef(false)
  const idLista = useId()

  // O pai pode trocar o valor (inverter origem/destino, rota de exemplo).
  useEffect(() => {
    ignorarBusca.current = true
    setTexto(rotuloCompleto(valor))
    setSugestoes([])
    setAberto(false)
  }, [valor])

  useEffect(() => {
    if (ignorarBusca.current) {
      ignorarBusca.current = false
      return
    }
    if (texto.trim().length < 2) {
      setSugestoes([])
      return
    }
    const controlador = new AbortController()
    setBuscando(true)
    const tempo = setTimeout(() => {
      buscarLugares(texto, controlador.signal)
        .then((lista) => {
          setSugestoes(lista)
          setDestacado(0)
          setAberto(true)
        })
        .catch(() => setSugestoes([]))
        .finally(() => setBuscando(false))
    }, ESPERA_MS)
    return () => {
      clearTimeout(tempo)
      controlador.abort()
      setBuscando(false)
    }
  }, [texto])

  // Fecha ao clicar fora.
  useEffect(() => {
    const aoClicar = (e) => {
      if (!caixaRef.current?.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicar)
    return () => document.removeEventListener('mousedown', aoClicar)
  }, [])

  function escolher(lugar) {
    ignorarBusca.current = true
    setTexto(rotuloCompleto(lugar))
    setAberto(false)
    setSugestoes([])
    onEscolher(lugar)
  }

  function aoTeclar(e) {
    if (!aberto || !sugestoes.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setDestacado((i) => (i + 1) % sugestoes.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setDestacado((i) => (i - 1 + sugestoes.length) % sugestoes.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      escolher(sugestoes[destacado])
    } else if (e.key === 'Escape') {
      setAberto(false)
    }
  }

  return (
    <div className="campo-lugar" ref={caixaRef}>
      <span className={`marcador ${marcador}`} aria-hidden="true">
        {marcador === 'marcador-a' ? 'A' : 'B'}
      </span>
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          onEscolher(null)
        }}
        onFocus={() => sugestoes.length && setAberto(true)}
        onKeyDown={aoTeclar}
        placeholder={placeholder}
        aria-label={rotulo}
        autoComplete="off"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={idLista}
        autoFocus={autoFocus}
      />
      {buscando && <span className="girando" aria-hidden="true" />}
      {valor && !buscando && (
        <span className="confere" aria-hidden="true">
          ✓
        </span>
      )}

      {aberto && sugestoes.length > 0 && (
        <ul className="sugestoes" id={idLista} role="listbox">
          {sugestoes.map((s, i) => (
            <li key={`${s.nome}-${s.lat}-${s.lon}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === destacado}
                className={i === destacado ? 'destacada' : undefined}
                onMouseEnter={() => setDestacado(i)}
                onClick={() => escolher(s)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="icone-pino">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
                </svg>
                <span className="sugestao-texto">
                  <strong>{s.nome}</strong>
                  {s.descricao && <span>{s.descricao}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
