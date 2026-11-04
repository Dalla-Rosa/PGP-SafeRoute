from __future__ import annotations

import math
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .clima import ServicoClima, fase_do_dia, previsao_mais_proxima
from .esquemas import PedidoRota, PedidoTrechos
from .lugares import BuscaDeLugares
from .modelo import ModeloRisco
from .rota import LocalizadorTrechos, RotaIndisponivel, afinar, tracar_rota

FUSO_PADRAO = ZoneInfo("America/Sao_Paulo")
USER_AGENT = "SafeRoute-UFFS/0.3 (projeto academico)"
ORIGENS_PERMITIDAS = os.getenv("SAFEROUTE_ORIGENS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

# Previsão para daqui a muitas horas muda antes de o motorista chegar lá. Alertas
# de clima só são acionáveis perto da partida; adiante viram ruído.
HORIZONTE_ALERTAS_H = 3.0

MAX_ROTAS_EM_CACHE = 64

modelo = ModeloRisco()
localizador = LocalizadorTrechos(modelo.trechos)
servico_clima = ServicoClima(modelo.mapa_wmo_para_clima)
busca_lugares = BuscaDeLugares()

# Traçar a rota é a etapa mais cara da consulta e só depende de origem e destino.
# Durante a avaliação de usabilidade os mesmos trajetos se repetem muito.
_cache_rotas: dict[tuple, object] = {}


async def _rota_com_cache(cliente, origem: tuple[float, float], destino: tuple[float, float]):
    chave = (round(origem[0], 4), round(origem[1], 4), round(destino[0], 4), round(destino[1], 4))
    if chave in _cache_rotas:
        return _cache_rotas[chave]
    rota = await tracar_rota(cliente, origem, destino)
    if len(_cache_rotas) >= MAX_ROTAS_EM_CACHE:
        _cache_rotas.pop(next(iter(_cache_rotas)))
    _cache_rotas[chave] = rota
    return rota


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    async with httpx.AsyncClient(timeout=20.0, headers={"User-Agent": USER_AGENT}) as cliente:
        app.state.http = cliente
        yield


app = FastAPI(title="SafeRoute", version="0.2.0", lifespan=ciclo_de_vida)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ORIGENS_PERMITIDAS if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _numero(valor):
    """NaN do pandas vira null: NaN não é JSON válido."""
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return None
    return valor.item() if hasattr(valor, "item") else valor


def _estatisticas(linha: pd.Series) -> dict:
    return {
        "total_acidentes": _numero(linha["total_acidentes"]),
        "total_fatais": _numero(linha["total_fatais"]),
        "acidentes_por_ano": round(float(linha["acidentes_ano_segmento"]), 1),
        "risco_relativo_na_br": round(float(linha["risco_relativo_na_br"]), 2),
        "tipo_pista": _numero(linha["tipo_pista"]),
        "tracado_via": _numero(linha["tracado_via"]),
        "hora_mais_critica": _numero(linha["hora_pior"]),
    }


def _com_fuso(momento: datetime | None) -> datetime:
    if momento is None:
        return datetime.now(FUSO_PADRAO)
    return momento if momento.tzinfo else momento.replace(tzinfo=FUSO_PADRAO)


@app.get("/api/saude")
def saude() -> dict:
    return {
        "trechos": len(modelo.trechos),
        "niveis": modelo.niveis,
        "cortes_nivel_risco": modelo.cortes,
        "anos_treino": modelo.anos_treino,
        "metricas_teste_2025": modelo.metricas,
        "tamanho_segmento_km": modelo.tamanho_segmento_km,
    }


@app.get("/api/lugares")
async def buscar_lugares(q: str, request: Request) -> dict:
    """Sugestões de cidade para o autocomplete. O resultado já traz a coordenada,
    então o formulário não precisa geocodificar no envio."""
    return {"lugares": await busca_lugares.buscar(request.app.state.http, q)}


@app.get("/api/trechos")
def listar_trechos(limite: int = 20000) -> dict:
    """Visão padrão do mapa: risco de cada trecho no seu pior horário."""
    t = modelo.trechos.dropna(subset=["latitude", "longitude"]).head(limite)
    return {
        "trechos": [
            {
                "segmento_id": segmento_id,
                "br": _numero(linha["br"]),
                "km_inicio": _numero(linha["km_inicio"]),
                "km_fim": _numero(linha["km_fim"]),
                "uf": _numero(linha["uf"]),
                "latitude": _numero(linha["latitude"]),
                "longitude": _numero(linha["longitude"]),
                "nivel_risco": linha["nivel_pior_horario"],
                "hora_pior": _numero(linha["hora_pior"]),
                "estatisticas": _estatisticas(linha),
            }
            for segmento_id, linha in t.iterrows()
        ]
    }


@app.post("/api/trechos/risco")
def risco_de_trechos(pedido: PedidoTrechos) -> dict:
    """Avalia trechos conhecidos num horário e clima fixos (sem APIs externas)."""
    desconhecidos = [s for s in pedido.segmentos if s not in modelo.trechos.index]
    if desconhecidos:
        raise HTTPException(404, f"Trechos não encontrados: {desconhecidos[:5]}")

    momento = _com_fuso(pedido.partida)
    linhas = modelo.trechos.loc[pedido.segmentos]
    n = len(linhas)
    avaliacoes = modelo.avaliar(
        linhas,
        horas=[momento.hour] * n,
        dias_semana=[momento.weekday()] * n,
        fases=[fase_do_dia(momento.replace(tzinfo=None), None)] * n,
        climas=[pedido.clima] * n,
    )
    for avaliacao, (_, linha) in zip(avaliacoes, linhas.iterrows()):
        avaliacao["estatisticas"] = _estatisticas(linha)
    return {"trechos": avaliacoes}


@app.post("/api/risco-rota")
async def risco_rota(pedido: PedidoRota, request: Request) -> dict:
    partida = _com_fuso(pedido.partida)
    try:
        rota = await _rota_com_cache(
            request.app.state.http,
            (pedido.origem.lat, pedido.origem.lon),
            (pedido.destino.lat, pedido.destino.lon),
        )
    except RotaIndisponivel as erro:
        raise HTTPException(502, str(erro)) from erro

    associacao = localizador.associar(rota)
    avisos: list[str] = []

    pontos_clima = localizador.amostrar_pontos(rota)
    coordenadas_clima = [(lat, lon) for lat, lon, _ in pontos_clima]
    chegada = partida + timedelta(seconds=rota.dur_acc_s[-1])
    previsoes = await servico_clima.consultar(request.app.state.http, coordenadas_clima, chegada)
    if not any(previsoes):
        avisos.append("Previsão do tempo indisponível: o risco mostrado considera céu claro.")

    partida_utc = partida.astimezone(timezone.utc)
    offset_padrao = int(partida.utcoffset().total_seconds())
    linhas = modelo.trechos.loc[[t.segmento_id for t in associacao.trechos]]

    horas, dias_semana, fases, climas, etas, horas_ate = [], [], [], [], [], []
    fora_do_horizonte: list[datetime] = []
    for trecho, (_, linha) in zip(associacao.trechos, linhas.iterrows()):
        previsao = previsao_mais_proxima(linha["latitude"], linha["longitude"], coordenadas_clima, previsoes)
        offset = previsao.offset_s if previsao else offset_padrao
        eta = partida_utc + timedelta(seconds=trecho.segundos_ate_aqui)
        local = (eta + timedelta(seconds=offset)).replace(tzinfo=None)
        clima = servico_clima.grupo_de_clima(local, previsao)
        if clima is None and previsao is not None and previsao.ultima_hora and local > previsao.ultima_hora:
            fora_do_horizonte.append(previsao.ultima_hora)
        horas.append(local.hour)
        dias_semana.append(local.weekday())
        fases.append(fase_do_dia(local, previsao))
        climas.append(clima)
        horas_ate.append(trecho.segundos_ate_aqui / 3600)
        etas.append(local.replace(tzinfo=timezone(timedelta(seconds=offset))).isoformat())

    avaliacoes = modelo.avaliar(linhas, horas, dias_semana, fases, climas)
    if fora_do_horizonte:
        avisos.append(f"Previsão indisponível após {min(fora_do_horizonte):%d/%m/%Y %H:%M}.")

    trechos = []
    for avaliacao, trecho, (_, linha), eta, fase, clima, h in zip(
        avaliacoes, associacao.trechos, linhas.iterrows(), etas, fases, climas, horas_ate
    ):
        # O alerta continua existindo no trecho; o que muda é se ele é acionável.
        for alerta in avaliacao["alertas"]:
            alerta["proximo"] = h <= HORIZONTE_ALERTAS_H
        trechos.append(
            {
                **avaliacao,
                "br": _numero(linha["br"]),
                "km_inicio": _numero(linha["km_inicio"]),
                "km_fim": _numero(linha["km_fim"]),
                "uf": _numero(linha["uf"]),
                "coordenadas": trecho.coordenadas,
                "km_na_rota": round(trecho.km_na_rota, 1),
                "eta": eta,
                "horas_ate_passagem": round(h, 2),
                "fase_dia": fase,
                "clima": clima,
                "estatisticas": _estatisticas(linha),
            }
        )

    contagem = {nivel: 0 for nivel in modelo.niveis}
    for t in trechos:
        contagem[t["nivel_risco"]] += 1
    piores = [n for n in reversed(modelo.niveis) if contagem[n]]

    todos_alertas = [a for t in trechos for a in t["alertas"]]
    proximos = [a for a in todos_alertas if a["proximo"]]

    # Camada de clima do mapa: um marcador por ponto amostrado, na hora de passagem.
    pontos_mapa = []
    for (lat, lon, segundos), previsao in zip(pontos_clima, previsoes):
        offset = previsao.offset_s if previsao else offset_padrao
        local = (partida_utc + timedelta(seconds=segundos + offset)).replace(tzinfo=None)
        grupo = servico_clima.grupo_de_clima(local, previsao)
        if grupo is None:
            continue
        pontos_mapa.append(
            {
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "clima": grupo,
                "codigo_wmo": servico_clima.codigo_wmo(local, previsao),
                "eta": local.replace(tzinfo=timezone(timedelta(seconds=offset))).isoformat(),
                "horas_ate_passagem": round(segundos / 3600, 2),
            }
        )

    return {
        "resumo": {
            "distancia_km": round(rota.distancia_km, 1),
            "duracao_min": round(rota.duracao_min),
            "nivel_maximo": piores[0] if piores else None,
            "trechos_por_nivel": contagem,
            "alertas_clima": len(proximos),
            "alertas_clima_adiante": len(todos_alertas) - len(proximos),
            "horizonte_alertas_h": HORIZONTE_ALERTAS_H,
            "cobertura_dados_pct": round(associacao.cobertura_pct, 1),
        },
        "rota": {"coordenadas": afinar(rota.linha.tolist(), 0.25), "partida": partida.isoformat()},
        "trechos": trechos,
        "pontos_clima": pontos_mapa,
        "trechos_sem_dados": [{"coordenadas": v.coordenadas, "motivo": v.motivo} for v in associacao.vazios],
        "avisos": avisos,
    }
