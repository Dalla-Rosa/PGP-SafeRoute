import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip, Pane, useMap } from 'react-leaflet'
import L from 'leaflet'
import { COR_SEM_DADOS, NIVEIS, ORDEM_NIVEIS, horaDoEta, nomeDoTrecho } from '../services/risco'

const CENTRO_INICIAL = [-15.8, -52.0]

function iconeLetra(letra, classe) {
  return L.divIcon({
    className: '',
    html: `<div class="pino ${classe}">${letra}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}
const ICONE_A = iconeLetra('A', 'marcador-a')
const ICONE_B = iconeLetra('B', 'marcador-b')

// Ajusta o enquadramento quando a rota ou o trecho selecionado mudam.
function Enquadrar({ linhaRota, selecionado }) {
  const map = useMap()
  useEffect(() => {
    if (selecionado?.coordenadas) {
      map.flyToBounds(L.latLngBounds(selecionado.coordenadas).pad(1.5), { duration: 0.6, maxZoom: 12 })
    } else if (selecionado) {
      map.flyTo([selecionado.latitude, selecionado.longitude], 11, { duration: 0.6 })
    } else if (linhaRota) {
      map.flyToBounds(L.latLngBounds(linhaRota), { padding: [40, 40], duration: 0.6 })
    }
  }, [map, linhaRota, selecionado])
  return null
}

// Trechos mais graves por último, para ficarem por cima nos cruzamentos.
const porGravidade = (trechos) =>
  [...trechos].sort((a, b) => ORDEM_NIVEIS.indexOf(b.nivel_risco) - ORDEM_NIVEIS.indexOf(a.nivel_risco))

export default function Mapa({ resultado, trechosGerais, selecionado, onSelecionar }) {
  const modoExplorar = !resultado
  const trechos = resultado?.trechos ?? []

  return (
    <MapContainer center={CENTRO_INICIAL} zoom={5} className="mapa" zoomControl={false} preferCanvas>
      {/* Base cinza neutra: as cores do mapa não competem com as cores de risco. */}
      <TileLayer
        attribution="Mapa &copy; Esri, HERE, Garmin, &copy; colaboradores do OpenStreetMap"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />

      {/* Panes fixam a ordem de desenho: rota < destaque da seleção < trechos. */}
      <Pane name="rota" style={{ zIndex: 410 }}>
        {resultado && (
          <>
            <Polyline positions={resultado.rota.coordenadas} pathOptions={{ color: '#fff', weight: 9 }} />
            {/* Partes sem dados em cinza — nunca pintadas como "seguro". */}
            {resultado.trechos_sem_dados.map((v, i) => (
              <Polyline key={i} positions={v.coordenadas} pathOptions={{ color: COR_SEM_DADOS, weight: 5 }}>
                <Tooltip sticky>Sem dados: {v.motivo}</Tooltip>
              </Polyline>
            ))}
          </>
        )}
      </Pane>

      <Pane name="selecao" style={{ zIndex: 420 }}>
        {selecionado?.coordenadas && (
          <Polyline
            key={selecionado.segmento_id}
            positions={selecionado.coordenadas}
            pathOptions={{ color: '#0f172a', weight: NIVEIS[selecionado.nivel_risco].peso + 8, opacity: 0.9 }}
          />
        )}
      </Pane>

      <Pane name="trechos" style={{ zIndex: 430 }}>
        {modoExplorar
          ? trechosGerais.map((t) => (
              <CircleMarker
                key={t.segmento_id}
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
                positions={t.coordenadas}
                pathOptions={{ color: NIVEIS[t.nivel_risco].cor, weight: NIVEIS[t.nivel_risco].peso, lineCap: 'butt' }}
                eventHandlers={{ click: () => onSelecionar(t) }}
              >
                <Tooltip sticky>
                  {nomeDoTrecho(t)} · {horaDoEta(t.eta)} · Risco {t.nivel_risco}
                </Tooltip>
              </Polyline>
            ))}
      </Pane>

      {resultado && (
        <>
          <Marker position={resultado.origem.ponto} icon={ICONE_A}>
            <Tooltip>{resultado.origem.nome}</Tooltip>
          </Marker>
          <Marker position={resultado.destino.ponto} icon={ICONE_B}>
            <Tooltip>{resultado.destino.nome}</Tooltip>
          </Marker>
        </>
      )}

      <Enquadrar linhaRota={resultado?.rota.coordenadas} selecionado={selecionado} />
    </MapContainer>
  )
}
