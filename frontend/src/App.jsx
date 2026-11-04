import { useEffect, useRef, useState } from 'react'
import FormRota from './components/FormRota'
import Mapa from './components/Mapa'
import ResumoRota from './components/ResumoRota'
import DetalheTrecho from './components/DetalheTrecho'
import Legenda from './components/Legenda'
import { analisarRota, carregarTrechos } from './services/api'

export default function App() {
  const [trechosGerais, setTrechosGerais] = useState([])
  const [resultado, setResultado] = useState(null)
  const [selecionado, setSelecionado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [mostrarClima, setMostrarClima] = useState(true)
  const [painelAberto, setPainelAberto] = useState(true)
  const painelRef = useRef(null)

  useEffect(() => {
    carregarTrechos()
      .then(setTrechosGerais)
      .catch((e) => setErro(e.message))
  }, [])

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && setSelecionado(null)
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  // No celular o painel é uma gaveta: abre sozinha quando há o que mostrar.
  useEffect(() => {
    if (resultado || selecionado) {
      setPainelAberto(true)
      painelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [resultado, selecionado])

  async function onTracar(origem, destino, partida) {
    setCarregando(true)
    setErro(null)
    setSelecionado(null)
    try {
      const resposta = await analisarRota(origem, destino, new Date(partida).toISOString())
      setResultado({ ...resposta, origem, destino })
    } catch (e) {
      setErro(e.message ?? 'Algo deu errado ao traçar a rota.')
    } finally {
      setCarregando(false)
    }
  }

  function limparRota() {
    setResultado(null)
    setSelecionado(null)
  }

  const temConteudo = resultado || selecionado

  return (
    <div className="app">
      <main className="area-mapa">
        <Mapa
          resultado={resultado}
          trechosGerais={trechosGerais}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
          mostrarClima={mostrarClima}
        />

        {resultado && (
          <div className="controles-mapa">
            <button
              className={mostrarClima ? 'controle ativo' : 'controle'}
              onClick={() => setMostrarClima((v) => !v)}
              aria-pressed={mostrarClima}
              title="Mostrar chuva e neblina previstas na rota"
            >
              <span aria-hidden="true">🌧️</span>
              <span className="controle-texto">Clima</span>
            </button>
          </div>
        )}

        <Legenda comRota={!!resultado} />
      </main>

      <aside className={painelAberto ? 'painel' : 'painel recolhido'} ref={painelRef}>
        <button
          className="puxador"
          onClick={() => setPainelAberto((v) => !v)}
          aria-label={painelAberto ? 'Recolher painel' : 'Abrir painel'}
        />

        <div className="cartao-busca">
          <header className="marca">
            <img src="/favicon.svg" alt="" width="36" height="36" />
            <div>
              <h1>SafeRoute</h1>
              <p>Os trechos perigosos da sua rota, antes de viajar</p>
            </div>
          </header>

          <FormRota onTracar={onTracar} carregando={carregando} />
        </div>

        {erro && (
          <div className="erro" role="alert">
            {erro}
          </div>
        )}

        <div className="conteudo">
          {selecionado ? (
            <DetalheTrecho
              t={selecionado}
              onVoltar={() => setSelecionado(null)}
              textoVoltar={resultado ? 'Voltar para a rota' : 'Voltar'}
            />
          ) : resultado ? (
            <ResumoRota resultado={resultado} onSelecionar={setSelecionado} onLimpar={limparRota} />
          ) : (
            <section className="boas-vindas">
              <h3 className="titulo-secao">Como funciona</h3>
              <ol>
                <li>Informe de onde sai, para onde vai e a que horas pretende sair.</li>
                <li>
                  Os trechos de rodovias federais aparecem coloridos pelo risco{' '}
                  <em>no horário em que você vai passar por cada um</em>.
                </li>
                <li>Toque em um trecho para ver histórico de acidentes, clima previsto e dicas.</li>
              </ol>
              <p className="sutil">
                A cor indica a <strong>gravidade</strong> esperada dos acidentes, comparada ao restante da{' '}
                <em>mesma</em> rodovia, com base em registros da Polícia Rodoviária Federal desde 2021.
              </p>
            </section>
          )}
        </div>

        {!temConteudo && (
          <footer className="rodape">
            Ferramenta informativa de conscientização, baseada em dados históricos da PRF. Não substitui a atenção
            às condições reais da via.
          </footer>
        )}
      </aside>
    </div>
  )
}
