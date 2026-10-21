import { useEffect, useRef, useState } from 'react'
import FormRota from './components/FormRota'
import Mapa from './components/Mapa'
import ResumoRota from './components/ResumoRota'
import DetalheTrecho from './components/DetalheTrecho'
import Legenda from './components/Legenda'
import { analisarRota, carregarTrechos, geocodificar } from './services/api'

export default function App() {
  const [trechosGerais, setTrechosGerais] = useState([])
  const [resultado, setResultado] = useState(null)
  const [selecionado, setSelecionado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const conteudoRef = useRef(null)

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

  // Leva o painel até o resultado ou detalhe recém-aberto (o formulário fica acima).
  useEffect(() => {
    if (resultado || selecionado) conteudoRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [resultado, selecionado])

  async function onTracar(textoOrigem, textoDestino, partida) {
    setCarregando(true)
    setErro(null)
    setSelecionado(null)
    try {
      // Nominatim pede no máximo 1 requisição por segundo: busca em sequência.
      const origem = await geocodificar(textoOrigem)
      const destino = await geocodificar(textoDestino)
      const resposta = await analisarRota(origem.ponto, destino.ponto, new Date(partida).toISOString())
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
              t={selecionado}
              onVoltar={() => setSelecionado(null)}
              textoVoltar={resultado ? 'Voltar para a rota' : 'Voltar'}
            />
          ) : resultado ? (
            <>
              <ResumoRota
                resultado={resultado}
                origem={resultado.origem}
                destino={resultado.destino}
                onSelecionar={setSelecionado}
              />
              <button className="link" onClick={limparRota}>
                Limpar rota e explorar o mapa
              </button>
            </>
          ) : (
            <section className="boas-vindas">
              <h3 className="titulo-secao">Como funciona</h3>
              <ol>
                <li>Informe de onde sai, para onde vai e a que horas pretende sair.</li>
                <li>
                  Os trechos de rodovias federais da sua rota aparecem coloridos pelo risco{' '}
                  <em>no horário em que você vai passar por cada um</em>.
                </li>
                <li>Toque em um trecho para ver o histórico de acidentes, o clima previsto e dicas de direção.</li>
              </ol>
              <p className="sutil">
                A cor indica a <strong>gravidade</strong> esperada dos acidentes, comparada ao restante da{' '}
                <em>mesma</em> rodovia, com base em registros da Polícia Rodoviária Federal desde 2021. Você também
                pode explorar os trechos direto no mapa.
              </p>
            </section>
          )}
        </div>

        <footer className="rodape">
          Ferramenta informativa de conscientização, baseada em dados históricos da PRF. Não substitui a atenção às
          condições reais da via nem as orientações oficiais de trânsito.
        </footer>
      </aside>

      <main className="area-mapa">
        <Mapa
          resultado={resultado}
          trechosGerais={trechosGerais}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
        />
        <Legenda comRota={!!resultado} />
      </main>
    </div>
  )
}
