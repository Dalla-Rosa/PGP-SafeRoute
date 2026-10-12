import { useEffect, useRef, useState } from 'react'
import FormRota from './components/FormRota'
import Mapa from './components/Mapa'
import ResumoRota from './components/ResumoRota'
import DetalheTrecho from './components/DetalheTrecho'
import Legenda from './components/Legenda'
import { carregarSegmentos, geocodificar, segmentosNaRota, tracarRota, usandoMock } from './services/api'

export default function App() {
  const [todos, setTodos] = useState([])
  const [rota, setRota] = useState(null)
  const [segmentosRota, setSegmentosRota] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const conteudoRef = useRef(null)

  useEffect(() => {
    carregarSegmentos()
      .then(setTodos)
      .catch((e) => setErro(e.message))
  }, [])

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && setSelecionado(null)
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  // Leva o painel até o resultado ou detalhe recém-aberto (o formulário fica acima).
  useEffect(() => {
    if (rota || selecionado) conteudoRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [rota, selecionado])

  async function onTracar(textoOrigem, textoDestino) {
    setCarregando(true)
    setErro(null)
    setSelecionado(null)
    try {
      // Nominatim pede no máximo 1 requisição por segundo: busca em sequência.
      const origem = await geocodificar(textoOrigem)
      const destino = await geocodificar(textoDestino)
      const [tracado, segmentos] = await Promise.all([
        tracarRota(origem.ponto, destino.ponto),
        carregarSegmentos(),
      ])
      setRota({ ...tracado, origem, destino })
      setSegmentosRota(segmentosNaRota(segmentos, tracado.linha))
    } catch (e) {
      setErro(e.message ?? 'Algo deu errado ao traçar a rota.')
    } finally {
      setCarregando(false)
    }
  }

  function limparRota() {
    setRota(null)
    setSegmentosRota([])
    setSelecionado(null)
  }

  const modoExplorar = !rota

  return (
    <div className="app">
      <aside className="painel">
        <header className="marca">
          <div className="logo" aria-hidden="true">
            <img src="/favicon.svg" alt="" />
          </div>
          <div>
            <h1>SafeRoute</h1>
            <p>Conheça os trechos perigosos da sua rota antes de viajar</p>
          </div>
        </header>

        <FormRota onTracar={onTracar} carregando={carregando} />

        {erro && (
          <div className="erro" role="alert">
            {erro}
          </div>
        )}

        <div className="conteudo" ref={conteudoRef}>
          {selecionado ? (
            <DetalheTrecho
              seg={selecionado}
              onVoltar={() => setSelecionado(null)}
              textoVoltar={rota ? 'Voltar para a rota' : 'Voltar'}
            />
          ) : rota ? (
            <>
              <ResumoRota rota={rota} segmentos={segmentosRota} onSelecionar={setSelecionado} />
              <button className="link" onClick={limparRota}>
                Limpar rota e explorar o mapa
              </button>
            </>
          ) : (
            <section className="boas-vindas">
              <h3 className="titulo-secao">Como funciona</h3>
              <ol>
                <li>Informe de onde sai e para onde vai.</li>
                <li>Os trechos de rodovias federais na sua rota aparecem coloridos pelo nível de risco.</li>
                <li>Toque em um trecho para ver o histórico de acidentes e dicas de direção.</li>
              </ol>
              <p className="sutil">
                O risco compara cada trecho com o restante da <em>mesma</em> rodovia, com base em acidentes
                registrados pela Polícia Rodoviária Federal. Você também pode explorar os trechos direto no
                mapa.
              </p>
            </section>
          )}
        </div>

        <footer className="rodape">
          {usandoMock && <span className="selo-demo">Dados de demonstração</span>}
          Ferramenta informativa, baseada em dados históricos da PRF. Não substitui a sinalização nem as
          orientações oficiais de trânsito.
        </footer>
      </aside>

      <main className="area-mapa">
        <Mapa
          rota={rota}
          segmentos={rota ? segmentosRota : todos}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
          modoExplorar={modoExplorar}
        />
        <Legenda comRota={!!rota} />
      </main>
    </div>
  )
}
