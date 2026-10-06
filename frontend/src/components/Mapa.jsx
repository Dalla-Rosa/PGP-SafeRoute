import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, Pane, useMap } from 'react-leaflet'
import L from 'leaflet'
import { COR_SEM_DADOS, NIVEIS, ORDEM_NIVEIS } from '../services/risco'

const CENTRO_INICIAL = [-25.5, -49.5]

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
function Enquadrar({ rota, selecionado }) {
  const map = useMap()
  useEffect(() => {
    if (selecionado) {
      map.flyToBounds(L.latLngBounds(selecionado.coordenadas).pad(1.5), { duration: 0.6, maxZoom: 12 })
    } else if (rota) {
      map.flyToBounds(L.latLngBounds(rota.linha), { padding: [40, 40], duration: 0.6 })
    }
  }, [map, rota, selecionado])
  return null
}

// Trechos mais graves por último, para ficarem por cima nos cruzamentos.
function porGravidade(segmentos) {
  return [...segmentos].sort((a, b) => ORDEM_NIVEIS.indexOf(b.nivel_risco) - ORDEM_NIVEIS.indexOf(a.nivel_risco))
}

function rotuloTrecho(s) {
  return `BR-${s.br} · km ${s.km_inicio}–${s.km_fim} · Risco ${s.nivel_risco}`
}

export default function Mapa({ rota, segmentos, selecionado, onSelecionar, modoExplorar }) {
  return (
    <MapContainer center={CENTRO_INICIAL} zoom={6} className="mapa" zoomControl={false} preferCanvas>
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

      {/* Panes fixam a ordem de desenho: rota < destaque da seleção < segmentos. */}
      <Pane name="rota" style={{ zIndex: 410 }}>
        {rota && (
          <>
            <Polyline positions={rota.linha} pathOptions={{ color: '#ffffff', weight: 9, opacity: 1 }} />
            <Polyline positions={rota.linha} pathOptions={{ color: COR_SEM_DADOS, weight: 5, opacity: 1 }} />
          </>
        )}
      </Pane>

      <Pane name="selecao" style={{ zIndex: 420 }}>
        {selecionado && (
          <Polyline
            key={selecionado.segmento_id}
            positions={selecionado.coordenadas}
            pathOptions={{ color: '#0f172a', weight: NIVEIS[selecionado.nivel_risco].peso + 8, opacity: 0.9 }}
          />
        )}
      </Pane>

      <Pane name="segmentos" style={{ zIndex: 430 }}>
        {porGravidade(segmentos).map((s) => {
          const nivel = NIVEIS[s.nivel_risco]
          return (
            <Polyline
              key={s.segmento_id}
              positions={s.coordenadas}
              pathOptions={{
                color: nivel.cor,
                weight: modoExplorar ? nivel.peso - 1 : nivel.peso,
                opacity: modoExplorar && selecionado?.segmento_id !== s.segmento_id ? 0.75 : 1,
                lineCap: 'butt',
              }}
              eventHandlers={{ click: () => onSelecionar(s) }}
            >
              <Tooltip sticky>{rotuloTrecho(s)}</Tooltip>
            </Polyline>
          )
        })}
      </Pane>

      {rota && (
        <>
          <Marker position={rota.origem.ponto} icon={ICONE_A}>
            <Tooltip>{rota.origem.nome}</Tooltip>
          </Marker>
          <Marker position={rota.destino.ponto} icon={ICONE_B}>
            <Tooltip>{rota.destino.nome}</Tooltip>
          </Marker>
        </>
      )}

      <Enquadrar rota={rota} selecionado={selecionado} />
    </MapContainer>
  )
}
