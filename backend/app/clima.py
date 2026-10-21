"""Previsão do tempo e fase do dia pela Open-Meteo.

Gratuita para uso não comercial e sem chave. Trabalhamos com o horário **local de
cada ponto** (`timezone=auto`): uma rota pode cruzar fusos, e tanto a hora quanto a
fase do dia são features do modelo.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta

import numpy as np

URL_OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
MAX_DIAS_PREVISAO = 16
VALIDADE_CACHE_S = 3600
PRECISAO_CACHE_GRAUS = 1  # casas decimais: ~11 km

JANELA_CREPUSCULO = timedelta(hours=1)


@dataclass
class PrevisaoPonto:
    latitude: float
    longitude: float
    offset_s: int
    codigos: dict[str, int] = field(default_factory=dict)
    nascer: dict[str, datetime] = field(default_factory=dict)
    por: dict[str, datetime] = field(default_factory=dict)
    ultima_hora: datetime | None = None


def _fase_por_hora(hora: int) -> str:
    """Aproximação do notebook, usada quando não há nascer/pôr do sol."""
    if 5 <= hora <= 6:
        return "Amanhecer"
    if 7 <= hora <= 17:
        return "Pleno dia"
    if hora == 18:
        return "Anoitecer"
    return "Plena Noite"


def fase_do_dia(momento_local: datetime, previsao: PrevisaoPonto | None) -> str:
    dia = momento_local.strftime("%Y-%m-%d")
    nascer = previsao.nascer.get(dia) if previsao else None
    por = previsao.por.get(dia) if previsao else None
    if nascer is None or por is None:
        return _fase_por_hora(momento_local.hour)
    if abs(momento_local - nascer) <= JANELA_CREPUSCULO:
        return "Amanhecer"
    if abs(momento_local - por) <= JANELA_CREPUSCULO:
        return "Anoitecer"
    return "Pleno dia" if nascer < momento_local < por else "Plena Noite"


class ServicoClima:
    def __init__(self, mapa_wmo_para_clima: dict[int, str]) -> None:
        self._mapa_wmo = mapa_wmo_para_clima
        self._cache: dict[tuple[float, float], tuple[float, PrevisaoPonto]] = {}

    def grupo_de_clima(self, momento_local: datetime, previsao: PrevisaoPonto | None) -> str | None:
        """Grupo do modelo (claro/nublado/chuva/neblina) ou None se não houver previsão."""
        if previsao is None:
            return None
        codigo = previsao.codigos.get(momento_local.strftime("%Y-%m-%dT%H:00"))
        return self._mapa_wmo.get(codigo) if codigo is not None else None

    async def consultar(self, cliente, pontos, ate: datetime) -> list[PrevisaoPonto | None]:
        """Previsão de cada ponto (lat, lon), na ordem recebida. None quando falha."""
        chaves = [(round(lat, PRECISAO_CACHE_GRAUS), round(lon, PRECISAO_CACHE_GRAUS)) for lat, lon in pontos]
        agora = time.time()
        faltando = [c for c in dict.fromkeys(chaves) if self._cache.get(c, (0, None))[0] <= agora]

        if faltando:
            dias = min(max((ate.date() - datetime.now().date()).days + 1, 1), MAX_DIAS_PREVISAO)
            try:
                for chave, previsao in zip(faltando, await self._buscar(cliente, faltando, dias)):
                    self._cache[chave] = (agora + VALIDADE_CACHE_S, previsao)
            except Exception:
                # Regra 4: sem previsão o fluxo continua, usando "claro" como referência.
                pass

        return [self._cache.get(chave, (0, None))[1] for chave in chaves]

    async def _buscar(self, cliente, chaves, dias: int) -> list[PrevisaoPonto]:
        resposta = await cliente.get(
            URL_OPEN_METEO,
            params={
                "latitude": ",".join(str(lat) for lat, _ in chaves),
                "longitude": ",".join(str(lon) for _, lon in chaves),
                "hourly": "weather_code",
                "daily": "sunrise,sunset",
                "timezone": "auto",
                "forecast_days": dias,
            },
        )
        resposta.raise_for_status()
        corpo = resposta.json()
        locais = corpo if isinstance(corpo, list) else [corpo]
        return [self._ler_local(local, chave) for local, chave in zip(locais, chaves)]

    @staticmethod
    def _ler_local(local: dict, chave: tuple[float, float]) -> PrevisaoPonto:
        horas = local.get("hourly", {}).get("time", [])
        codigos = local.get("hourly", {}).get("weather_code", [])
        dias = local.get("daily", {}).get("time", [])
        como_data = lambda t: datetime.strptime(t, "%Y-%m-%dT%H:%M") if t else None
        return PrevisaoPonto(
            latitude=chave[0],
            longitude=chave[1],
            offset_s=int(local.get("utc_offset_seconds", 0)),
            codigos={h: c for h, c in zip(horas, codigos) if c is not None},
            nascer={d: como_data(t) for d, t in zip(dias, local.get("daily", {}).get("sunrise", [])) if t},
            por={d: como_data(t) for d, t in zip(dias, local.get("daily", {}).get("sunset", [])) if t},
            ultima_hora=como_data(horas[-1]) if horas else None,
        )


def previsao_mais_proxima(
    lat: float, lon: float, pontos, previsoes: list[PrevisaoPonto | None]
) -> PrevisaoPonto | None:
    """Previsão do ponto de clima mais próximo do trecho."""
    disponiveis = [(p, c) for p, c in zip(pontos, previsoes) if c is not None]
    if not disponiveis:
        return None
    coords = np.array([[p[0], p[1]] for p, _ in disponiveis])
    distancias = (coords[:, 0] - lat) ** 2 + (coords[:, 1] - lon) ** 2
    return disponiveis[int(np.argmin(distancias))][1]
