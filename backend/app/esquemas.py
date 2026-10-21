from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

CLIMAS = Literal["claro", "nublado", "chuva", "neblina"]


class Ponto(BaseModel):
    # A base cobre só o Brasil; fora disso não há trecho a avaliar.
    lat: float = Field(ge=-34, le=6)
    lon: float = Field(ge=-74, le=-34)


class PedidoRota(BaseModel):
    origem: Ponto
    destino: Ponto
    partida: datetime | None = None


class PedidoTrechos(BaseModel):
    """Avaliação direta de trechos conhecidos, sem roteamento nem previsão."""

    segmentos: list[str] = Field(min_length=1, max_length=500)
    partida: datetime
    clima: CLIMAS | None = None
