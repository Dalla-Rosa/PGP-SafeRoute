"""Roteamento e associação entre a geometria da rota e os trechos do modelo.

O serviço de rotas devolve coordenadas; o modelo pensa em "BR-282, km 215". A
ponte entre os dois é feita aqui: a rota é densificada a ~1 km e cada ponto busca
o centro de trecho mais próximo.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

RAIO_TERRA_KM = 6371.0088

# O servidor público de demonstração do OSRM tem limite de uso e não é para
# produção: defina SAFEROUTE_OSRM_URL para uma instância própria antes de publicar.
OSRM_URL = os.getenv("SAFEROUTE_OSRM_URL", "https://router.project-osrm.org").rstrip("/")

PASSO_DENSIFICACAO_KM = 1.0
RAIO_ASSOCIACAO_KM = 3.0


class RotaIndisponivel(RuntimeError):
    pass


@dataclass
class Rota:
    linha: np.ndarray  # (N, 2) em [lat, lon]
    dist_acc_km: np.ndarray  # (N,) distância acumulada
    dur_acc_s: np.ndarray  # (N,) duração acumulada

    @property
    def distancia_km(self) -> float:
        return float(self.dist_acc_km[-1])

    @property
    def duracao_min(self) -> float:
        return float(self.dur_acc_s[-1] / 60)


def _haversine_acumulado(linha: np.ndarray) -> np.ndarray:
    p = np.radians(linha)
    dlat = np.diff(p[:, 0])
    dlon = np.diff(p[:, 1])
    a = np.sin(dlat / 2) ** 2 + np.cos(p[:-1, 0]) * np.cos(p[1:, 0]) * np.sin(dlon / 2) ** 2
    passos = 2 * RAIO_TERRA_KM * np.arcsin(np.sqrt(np.clip(a, 0, 1)))
    return np.concatenate([[0.0], np.cumsum(passos)])


async def tracar_rota(cliente, origem: tuple[float, float], destino: tuple[float, float]) -> Rota:
    coords = f"{origem[1]},{origem[0]};{destino[1]},{destino[0]}"
    try:
        resposta = await cliente.get(
            f"{OSRM_URL}/route/v1/driving/{coords}",
            params={"overview": "full", "geometries": "geojson", "annotations": "duration"},
        )
        resposta.raise_for_status()
        corpo = resposta.json()
    except Exception as erro:
        raise RotaIndisponivel("O serviço de rotas não respondeu. Tente novamente em instantes.") from erro

    if corpo.get("code") != "Ok" or not corpo.get("routes"):
        raise RotaIndisponivel("Não foi possível traçar uma rota entre esses pontos.")

    rota = corpo["routes"][0]
    linha = np.array([[lat, lon] for lon, lat in rota["geometry"]["coordinates"]], dtype=float)
    if len(linha) < 2:
        raise RotaIndisponivel("A rota encontrada é curta demais para ser analisada.")

    dist_acc = _haversine_acumulado(linha)
    duracoes = [d for perna in rota["legs"] for d in perna.get("annotation", {}).get("duration", [])]
    if len(duracoes) == len(linha) - 1:
        dur_acc = np.concatenate([[0.0], np.cumsum(duracoes)])
    else:
        # Sem anotações alinhadas à geometria, distribui a duração total proporcionalmente.
        dur_acc = dist_acc / dist_acc[-1] * float(rota["duration"])
    return Rota(linha=linha, dist_acc_km=dist_acc, dur_acc_s=dur_acc)


def _indices_afinados(acc: np.ndarray, minimo_km: float) -> np.ndarray:
    """Índices que avançam pelo menos `minimo_km` ao longo do caminho.

    Percorre distâncias já acumuladas em vez de recalcular haversine ponto a ponto:
    a geometria do OSRM traz milhares de pontos e o custo disso dominava a consulta.
    """
    mantidos = [0]
    referencia = acc[0]
    for i in range(1, len(acc) - 1):
        if acc[i] - referencia >= minimo_km:
            mantidos.append(i)
            referencia = acc[i]
    mantidos.append(len(acc) - 1)
    return np.array(mantidos)


def afinar(coordenadas: list[list[float]], minimo_km: float = 0.1) -> list[list[float]]:
    """Descarta pontos muito próximos: a geometria do OSRM é densa demais para a tela."""
    if len(coordenadas) <= 2:
        return coordenadas
    pontos = np.asarray(coordenadas, dtype=float)
    indices = _indices_afinados(_haversine_acumulado(pontos), minimo_km)
    return pontos[indices].tolist()


def _fatiar_linha(rota: Rota, d0: float, d1: float, minimo_km: float = 0.1) -> list[list[float]]:
    """Pedaço da geometria original entre duas distâncias acumuladas, já afinado."""
    acc = rota.dist_acc_km
    i0, i1 = np.searchsorted(acc, d0, "right"), np.searchsorted(acc, d1, "left")
    inicio = [float(np.interp(d0, acc, rota.linha[:, 0])), float(np.interp(d0, acc, rota.linha[:, 1]))]
    fim = [float(np.interp(d1, acc, rota.linha[:, 0])), float(np.interp(d1, acc, rota.linha[:, 1]))]
    if i1 <= i0:
        return [inicio, fim]
    # As distâncias acumuladas do miolo já existem: afina sem recalcular nada.
    miolo = rota.linha[i0:i1]
    indices = _indices_afinados(np.concatenate([[d0], acc[i0:i1], [d1]]), minimo_km)
    pontos = [inicio, *miolo.tolist(), fim]
    return [pontos[i] for i in indices]


def _descartar_isolados(posicoes: np.ndarray, brs: np.ndarray) -> np.ndarray:
    """Zera associações cuja BR difere das dos dois vizinhos.

    Evita que um ponto "pule" para uma rodovia paralela que passa perto.
    """
    limpas = posicoes.copy()
    for i in range(1, len(posicoes) - 1):
        anterior, atual, seguinte = posicoes[i - 1], posicoes[i], posicoes[i + 1]
        if atual < 0 or anterior < 0 or seguinte < 0:
            continue
        if brs[atual] != brs[anterior] and brs[atual] != brs[seguinte]:
            limpas[i] = -1
    return limpas


@dataclass
class TrechoNaRota:
    segmento_id: str
    coordenadas: list[list[float]]
    km_na_rota: float
    segundos_ate_aqui: float


@dataclass
class VazioNaRota:
    coordenadas: list[list[float]]
    motivo: str


@dataclass
class Associacao:
    trechos: list[TrechoNaRota]
    vazios: list[VazioNaRota]
    cobertura_pct: float


class LocalizadorTrechos:
    def __init__(self, trechos: pd.DataFrame, raio_km: float = RAIO_ASSOCIACAO_KM) -> None:
        validos = trechos.dropna(subset=["latitude", "longitude"])
        self._ids = validos.index.to_numpy()
        self._brs = validos["br"].to_numpy()
        self._arvore = BallTree(np.radians(validos[["latitude", "longitude"]].to_numpy()), metric="haversine")
        self.raio_km = raio_km

    def associar(self, rota: Rota) -> Associacao:
        alvos = np.arange(0.0, rota.distancia_km, PASSO_DENSIFICACAO_KM)
        lats = np.interp(alvos, rota.dist_acc_km, rota.linha[:, 0])
        lons = np.interp(alvos, rota.dist_acc_km, rota.linha[:, 1])

        distancias, indices = self._arvore.query(np.radians(np.column_stack([lats, lons])), k=1)
        dentro_do_raio = distancias[:, 0] * RAIO_TERRA_KM <= self.raio_km
        posicoes = _descartar_isolados(np.where(dentro_do_raio, indices[:, 0], -1), self._brs)

        trechos: list[TrechoNaRota] = []
        vazios: list[VazioNaRota] = []
        vistos: set[str] = set()
        inicio = 0
        for fim in range(1, len(posicoes) + 1):
            if fim < len(posicoes) and posicoes[fim] == posicoes[inicio]:
                continue
            d0 = float(alvos[inicio])
            d1 = float(alvos[fim]) if fim < len(alvos) else rota.distancia_km
            coordenadas = _fatiar_linha(rota, d0, d1)
            if posicoes[inicio] < 0:
                vazios.append(VazioNaRota(afinar(coordenadas, 0.25), "fora de rodovia federal ou trecho sem histórico"))
            else:
                segmento_id = str(self._ids[posicoes[inicio]])
                # Se a rota volta a passar pelo mesmo trecho, vale a primeira passagem.
                if segmento_id not in vistos:
                    vistos.add(segmento_id)
                    trechos.append(
                        TrechoNaRota(
                            segmento_id=segmento_id,
                            coordenadas=coordenadas,
                            km_na_rota=d0,
                            segundos_ate_aqui=float(np.interp(d0, rota.dist_acc_km, rota.dur_acc_s)),
                        )
                    )
            inicio = fim
        cobertura = 100.0 * float(np.mean(posicoes >= 0)) if len(posicoes) else 0.0
        return Associacao(trechos=trechos, vazios=vazios, cobertura_pct=cobertura)

    def amostrar_pontos(self, rota: Rota, a_cada_km: float = 40.0) -> list[tuple[float, float, float]]:
        """Pontos esparsos para consultar o clima: (lat, lon, segundos até ali)."""
        alvos = np.arange(0.0, rota.distancia_km + a_cada_km, a_cada_km)
        alvos = np.clip(alvos, 0, rota.distancia_km)
        lats = np.interp(alvos, rota.dist_acc_km, rota.linha[:, 0])
        lons = np.interp(alvos, rota.dist_acc_km, rota.linha[:, 1])
        segundos = np.interp(alvos, rota.dist_acc_km, rota.dur_acc_s)
        return list(zip(lats.tolist(), lons.tolist(), segundos.tolist()))
