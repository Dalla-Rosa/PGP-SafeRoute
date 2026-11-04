import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { COR_SEM_DADOS, NIVEIS, ORDEM_NIVEIS, horaDoEta, nomeDoTrecho } from '../services/risco'
import { aparenciaDoClima, climaRelevante } from '../services/clima'

const CENTRO_INICIAL = [-15.8, -52.0]

// Ordem de desenho: rota < seleção < trechos < clima.
const CAMADAS = { rota: 410, selecao: 420, trechos: 430, clima: 440 }

// Os panes são criados aqui, e não com <Pane>, porque o StrictMode monta os
// efeitos duas vezes e o componente do react-leaflet lança ao recriar um pane
// que já existe.
function useCamadas() {
  const map = useMap()
  const [prontas, setProntas] = useState(false)
  useEffect(() => {
    for (const [nome, zIndex] of Object.entries(CAMADAS)) {
      const pane = map.getPane(nome) ?? map.createPane(nome)
      pane.style.zIndex = String(zIndex)
    }
    setProntas(true)
  }, [map])
  return prontas
}

function pino(letra, classe) {
  return L.divIcon({
    className: '',
    html: `<div class="pino ${classe}">${letra}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}
const PINO_A = pino('A', 'marcador-a')
const PINO_B = pino('B', 'marcador-b')

function iconeClima(aparencia) {
  return L.divIcon({
    className: '',
    html: `<div class="selo-clima ${aparencia.classe}" title="${aparencia.rotulo}">${aparencia.icone}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

// No celular a gaveta cobre a parte de baixo do mapa; sem compensar, o
// enquadramento centraliza a rota atrás dela.
function folgaDoPainel() {
  const estreita = window.matchMedia('(max-width: 760px)').matches
  return estreita
    ? { paddingTopLeft: [20, 70], paddingBottomRight: [20, Math.round(window.innerHeight * 0.58) + 20] }
    : { paddingTopLeft: [Math.min(440, window.innerWidth * 0.4), 40], paddingBottomRight: [60, 40] }
}

// Depois de um voo longo o Leaflet às vezes deixa tiles de um zoom menor para
// trás, esticados — o efeito visível é o nome de uma capital em corpo gigante
// sobre o mapa. Um redraw ao fim do movimento resolve; `once` evita que o
// próprio redraw dispare outro moveend em laço.
function limparTilesAntigos(map) {
  map.once('moveend', () => {
    map.eachLayer((camada) => camada.redraw?.())
  })
}

function Enquadrar({ linhaRota, selecionado }) {
  const map = useMap()
  useEffect(() => {
    limparTilesAntigos(map)
    if (selecionado?.coordenadas) {
      map.flyToBounds(L.latLngBounds(selecionado.coordenadas).pad(2), {
        duration: 0.6,
        maxZoom: 12,
        ...folgaDoPainel(),
      })
    } else if (selecionado) {
      map.flyTo([selecionado.latitude, selecionado.longitude], 11, { duration: 0.6 })
    } else if (linhaRota) {
      map.flyToBounds(L.latLngBounds(linhaRota), { duration: 0.7, ...folgaDoPainel() })
    }
  }, [map, linhaRota, selecionado])
  return null
}

// Trechos mais graves por último, para ficarem por cima nos cruzamentos.
const porGravidade = (trechos) =>
  [...trechos].sort((a, b) => ORDEM_NIVEIS.indexOf(b.nivel_risco) - ORDEM_NIVEIS.indexOf(a.nivel_risco))

function Camadas({ resultado, trechosGerais, selecionado, onSelecionar, mostrarClima }) {
  const prontas = useCamadas()
  const modoExplorar = !resultado
  const trechos = resultado?.trechos ?? []

  // Sol e nuvem em todo ponto viram ruído: destacamos o que muda a direção.
  const pontosClima = useMemo(
    () => (resultado?.pontos_clima ?? []).filter((p) => climaRelevante(p.clima)),
    [resultado],
  )

  if (!prontas) return null

  return (
    <>
      {resultado && (
        <>
          <Polyline
            pane="rota"
            positions={resultado.rota.coordenadas}
            pathOptions={{ color: '#fff', weight: 11 }}
          />
          {/* Partes sem dados em cinza — nunca pintadas como "seguro". */}
          {resultado.trechos_sem_dados.map((v, i) => (
            <Polyline
              key={i}
              pane="rota"
              positions={v.coordenadas}
              pathOptions={{ color: COR_SEM_DADOS, weight: 6, dashArray: '1 9', lineCap: 'round' }}
            >
              <Tooltip sticky>Sem dados: {v.motivo}</Tooltip>
            </Polyline>
          ))}
        </>
      )}

      {selecionado?.coordenadas && (
        <Polyline
          key={selecionado.segmento_id}
          pane="selecao"
          positions={selecionado.coordenadas}
          pathOptions={{ color: '#0f172a', weight: NIVEIS[selecionado.nivel_risco].peso + 10, opacity: 0.85 }}
        />
      )}

      {modoExplorar
        ? trechosGerais.map((t) => (
            <CircleMarker
              key={t.segmento_id}
              pane="trechos"
              center={[t.latitude, t.longitude]}
              radius={selecionado?.segmento_id === t.segmento_id ? 8 : 4}
              pathOptions={{
                color: NIVEIS[t.nivel_risco].cor,
                fillColor: NIVEIS[t.nivel_risco].cor,
                fillOpacity: 0.85,
                weight: 1,
              }}
              eventHandlers={{ click: () => onSelecionar(t) }}
            >
              <Tooltip>
                {nomeDoTrecho(t)} · pior horário {String(t.hora_pior).padStart(2, '0')}h: {t.nivel_risco}
              </Tooltip>
            </CircleMarker>
          ))
        : porGravidade(trechos).map((t) => (
            <Polyline
              key={t.segmento_id}
              pane="trechos"
              positions={t.coordenadas}
              pathOptions={{
                color: NIVEIS[t.nivel_risco].cor,
                weight: NIVEIS[t.nivel_risco].peso,
                lineCap: 'butt',
              }}
              eventHandlers={{ click: () => onSelecionar(t) }}
            >
              <Tooltip sticky>
                {nomeDoTrecho(t)} · {horaDoEta(t.eta)} · Risco {t.nivel_risco}
              </Tooltip>
            </Polyline>
          ))}

      {mostrarClima &&
        pontosClima.map((p, i) => {
          const aparencia = aparenciaDoClima(p.codigo_wmo, p.clima)
          return (
            <Marker
              key={`${p.lat}-${p.lon}-${i}`}
              pane="clima"
              position={[p.lat, p.lon]}
              icon={iconeClima(aparencia)}
            >
              <Tooltip direction="top" offset={[0, -14]}>
                {aparencia.rotulo} por volta das {horaDoEta(p.eta)}
              </Tooltip>
            </Marker>
          )
        })}

      {resultado && (
        <>
          <Marker position={[resultado.origem.lat, resultado.origem.lon]} icon={PINO_A}>
            <Tooltip>{resultado.origem.nome}</Tooltip>
          </Marker>
          <Marker position={[resultado.destino.lat, resultado.destino.lon]} icon={PINO_B}>
            <Tooltip>{resultado.destino.nome}</Tooltip>
          </Marker>
        </>
      )}

      <Enquadrar linhaRota={resultado?.rota.coordenadas} selecionado={selecionado} />
    </>
  )
}

export default function Mapa(props) {
  return (
    <MapContainer center={CENTRO_INICIAL} zoom={5} className="mapa" zoomControl={false} preferCanvas>
      {/* Base cinza neutra: as cores do mapa não competem com as cores de risco. */}
      <TileLayer
        attribution="&copy; Esri, HERE, Garmin, &copy; colaboradores do OpenStreetMap"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />
      <Camadas {...props} />
    </MapContainer>
  )
}
